import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { WechatPayService } from '../wechat-pay.service';
import { PaymentsService } from '../payments.service';

/**
 * 支付状态对账定时任务
 * 每30分钟自动核对微信支付状态，确保订单与微信侧状态一致
 */
@Injectable()
export class PaymentReconciliationScheduler {
  private readonly logger = new Logger(PaymentReconciliationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * 每5分钟执行一次支付状态对账
   * 定期核对待支付订单在微信侧的最终状态，用于兜底同步
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'payment-reconciliation',
    timeZone: 'Asia/Shanghai',
  })
  async handlePaymentReconciliation() {
    this.logger.log('开始执行支付状态对账...');

    try {
      // 查找待支付且创建时间超过5分钟的订单（不限来源，确保所有订单都被覆盖）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const pendingOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: { in: ['PENDING_PAYMENT'] },
          createdAt: { lt: fiveMinutesAgo },
          // 不限 source，涵盖 WXAPP、ADMIN 等所有渠道创建的订单
        },
        select: { id: true, orderNo: true, paymentStatus: true, source: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (pendingOrders.length === 0) {
        return;
      }

      this.logger.log(`发现 ${pendingOrders.length} 个待支付订单，开始核对微信状态`);

      let syncedCount = 0;
      for (const order of pendingOrders) {
        try {
          const wxResult = await this.wechatPayService.queryOrder(order.orderNo);

          if (wxResult.trade_state === 'SUCCESS') {
            this.logger.log(`对账发现已支付订单: ${order.orderNo}`);

            const notifyData = {
              out_trade_no: order.orderNo,
              transaction_id: wxResult.transaction_id,
              trade_state: wxResult.trade_state,
              amount: wxResult.amount,
            };

            await this.paymentsService.handlePaymentResult(notifyData);
            syncedCount++;
          }
        } catch (queryErr: any) {
          // 微信侧查不到订单是正常的（未支付），不记录为错误
          if (queryErr?.response?.status !== 404) {
            this.logger.warn(`查询订单 ${order.orderNo} 状态异常: ${queryErr.message}`);
          }
        }
      }

      if (syncedCount > 0) {
        this.logger.log(`支付对账完成: 同步了 ${syncedCount}/${pendingOrders.length} 个订单`);
      }
    } catch (error: any) {
      this.logger.error(`支付对账任务失败: ${error.message}`);
    }
  }
}
