/**
 * 修复历史退款订单的 paymentStatus
 *
 * 旧代码 refund() 没有更新 order.paymentStatus，导致已退款订单的
 * 支付状态仍停留在 FULLY_PAID 或 CANCELLED。
 *
 * 用法: npx ts-node scripts/fix-refunded-status.ts
 */
import { PrismaClient, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查找所有有退款支付记录的订单
  const ordersWithRefundedPayments = await prisma.order.findMany({
    where: {
      payments: {
        some: { status: 'REFUNDED' },
      },
    },
    select: {
      id: true,
      orderNo: true,
      paymentStatus: true,
      paidAmount: true,
      refundedAmount: true,
      totalAmount: true,
    },
  });

  console.log(`找到 ${ordersWithRefundedPayments.length} 个有关联退款支付记录的订单`);
  console.log('');

  let fixedCount = 0;

  for (const order of ordersWithRefundedPayments) {
    const paid = Number(order.paidAmount);
    const refunded = Number(order.refundedAmount || 0);
    const total = Number(order.totalAmount);

    // 计算正确的 paymentStatus
    let correctStatus: string;
    if (paid <= 0 || refunded >= paid) {
      correctStatus = 'REFUNDED';
    } else if (paid >= total) {
      correctStatus = 'FULLY_PAID';
    } else {
      correctStatus = 'PARTIAL_PAID';
    }

    const currentStatus = order.paymentStatus as string;

    if (currentStatus !== correctStatus) {
      console.log(
        `订单 ${order.orderNo}: ${currentStatus} → ${correctStatus} ` +
        `(已付=${paid}, 已退=${refunded}, 总额=${total})`
      );

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: correctStatus as PaymentStatus },
      });

      fixedCount++;
    }
  }

  console.log(`\n完成！修复了 ${fixedCount} 个订单的支付状态`);
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
