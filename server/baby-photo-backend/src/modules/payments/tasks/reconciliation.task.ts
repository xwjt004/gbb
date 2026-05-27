import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PaymentNotificationService } from '../services/payment-notification.service';

/**
 * 对账定时任务
 * 每日凌晨3点自动执行订单-支付对账检测
 */
@Injectable()
export class ReconciliationTask {
  private readonly logger = new Logger(ReconciliationTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: PaymentNotificationService,
  ) {}

  /**
   * 每日凌晨3点执行对账任务
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'daily-reconciliation',
    timeZone: 'Asia/Shanghai',
  })
  async handleDailyReconciliation() {
    this.logger.log('开始执行每日对账任务...');
    const startTime = Date.now();

    try {
      const discrepancies = await this.detectDiscrepancies();
      
      if (discrepancies.length > 0) {
        this.logger.warn(`发现 ${discrepancies.length} 条支付差异记录`);
        
        // 标记差异记录（可选：创建专门的对账差异表）
        await this.markDiscrepancies(discrepancies);
        
        // 发送通知给管理员
        await this.sendDiscrepancyNotification(discrepancies);
      } else {
        this.logger.log('对账完成，未发现差异');
      }

      const duration = Date.now() - startTime;
      this.logger.log(`对账任务完成，耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error(`对账任务执行失败: ${error.message}`, error.stack);
      
      // 发送错误通知
      await this.notificationService.sendAdminNotification({
        title: '对账任务执行失败',
        message: `错误信息: ${error.message}`,
        type: 'error',
      });
    }
  }

  /**
   * 检测订单-支付金额差异
   * 差异类型:
   * 1. 订单状态为已支付，但 paidAmount !== totalAmount
   * 2. 订单状态为部分支付，但 paidAmount >= totalAmount
   * 3. 支付记录状态与订单支付状态不一致
   */
  private async detectDiscrepancies() {
    const discrepancies: Array<{
      type: string;
      orderId: string;
      orderNo: string;
      orderStatus: string;
      paymentStatus: string;
      totalAmount: number;
      paidAmount: number;
      expectedAmount: number;
      difference: number;
      severity: 'high' | 'medium' | 'low';
    }> = [];

    // 检测类型1：已支付订单但金额不匹配
    const paidOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'FULLY_PAID',
      },
      include: {
        payments: {
          where: {
            status: {
              in: ['FULLY_PAID' as any, 'PARTIAL_PAID' as any, 'OVERPAID' as any],
            },
          },
        },
      },
    });

    for (const order of paidOrders) {
      const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(order.totalAmount);
      const difference = Math.abs(totalPaid - totalAmount);

      if (difference > 0.01) { // 容忍1分钱误差
        discrepancies.push({
          type: 'AMOUNT_MISMATCH',
          orderId: order.id,
          orderNo: order.orderNo,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          totalAmount,
          paidAmount: totalPaid,
          expectedAmount: totalAmount,
          difference,
          severity: difference > 100 ? 'high' : difference > 10 ? 'medium' : 'low',
        });
      }
    }

    // 检测类型2：部分支付订单但实际已付全款或超额
    const partialOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PARTIAL_PAID' as any,
      },
      include: {
        payments: {
          where: {
            status: {
              in: ['FULLY_PAID' as any, 'PARTIAL_PAID' as any, 'OVERPAID' as any],
            },
          },
        },
      },
    });

    for (const order of partialOrders) {
      const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(order.totalAmount);

      if (totalPaid >= totalAmount) {
        discrepancies.push({
          type: 'STATUS_INCONSISTENT',
          orderId: order.id,
          orderNo: order.orderNo,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          totalAmount,
          paidAmount: totalPaid,
          expectedAmount: totalAmount,
          difference: totalPaid - totalAmount,
          severity: 'high', // 状态不一致属于高优先级问题
        });
      }
    }

    // 检测类型3：支付记录状态为 PAID，但订单状态为 PENDING
    const pendingOrdersWithPaidPayments = await this.prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING_PAYMENT' as any,
        payments: {
          some: {
            status: {
              in: ['FULLY_PAID' as any, 'PARTIAL_PAID' as any, 'OVERPAID' as any],
            },
          },
        },
      },
      include: {
        payments: {
          where: {
            status: {
              in: ['FULLY_PAID' as any, 'PARTIAL_PAID' as any, 'OVERPAID' as any],
            },
          },
        },
      },
    });

    for (const order of pendingOrdersWithPaidPayments) {
      const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(order.totalAmount);

      discrepancies.push({
        type: 'PAYMENT_STATUS_MISMATCH',
        orderId: order.id,
        orderNo: order.orderNo,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount,
        paidAmount: totalPaid,
        expectedAmount: totalAmount,
        difference: totalAmount - totalPaid,
        severity: 'high',
      });
    }

    return discrepancies;
  }

  /**
   * 标记差异记录（可选：写入专门的对账差异表）
   * 这里简化处理，写入日志即可
   */
  private async markDiscrepancies(discrepancies: any[]) {
    for (const disc of discrepancies) {
      this.logger.warn(
        `[对账差异] 类型=${disc.type} 订单=${disc.orderNo} ` +
        `总额=${disc.totalAmount} 已付=${disc.paidAmount} ` +
        `差额=${disc.difference} 严重级别=${disc.severity}`
      );
    }

    // 可选：创建 ReconciliationDiscrepancy 表来持久化差异记录
    // await this.prisma.reconciliationDiscrepancy.createMany({
    //   data: discrepancies.map(d => ({
    //     ...d,
    //     detectedAt: new Date(),
    //     resolved: false,
    //   })),
    // });
  }

  /**
   * 发送差异通知给管理员
   */
  private async sendDiscrepancyNotification(discrepancies: any[]) {
    const highSeverity = discrepancies.filter(d => d.severity === 'high');
    const mediumSeverity = discrepancies.filter(d => d.severity === 'medium');
    const lowSeverity = discrepancies.filter(d => d.severity === 'low');

    const message = [
      `发现 ${discrepancies.length} 条支付差异：`,
      `🔴 高风险: ${highSeverity.length} 条`,
      `🟡 中风险: ${mediumSeverity.length} 条`,
      `🟢 低风险: ${lowSeverity.length} 条`,
      '',
      '请及时登录系统查看详情并处理。',
    ].join('\n');

    await this.notificationService.sendAdminNotification({
      title: '每日对账发现异常',
      message,
      type: 'warning',
      data: {
        discrepancies: discrepancies.slice(0, 10), // 只发送前10条详情
        totalCount: discrepancies.length,
      },
    });
  }

  /**
   * 手动触发对账任务（用于测试或手动执行）
   */
  async manualReconciliation() {
    this.logger.log('手动触发对账任务');
    return this.handleDailyReconciliation();
  }
}
