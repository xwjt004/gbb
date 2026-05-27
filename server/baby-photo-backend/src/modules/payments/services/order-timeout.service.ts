

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { RefundExecutionService } from './refund-execution.service';

@Injectable()
export class OrderTimeoutService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderTimeoutService.name);
  private isProcessing = false; // 防止并发执行
  private intervalId: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly refundExecutionService: RefundExecutionService,
  ) {}

  /**
   * 模块初始化：启动超时检查（使用 setInterval 代替 @Cron）
   */
  onModuleInit() {
    this.logger.log('OrderTimeoutService initialized - Starting interval timer (every 5 minutes)');
    // 立即执行一次
    this.handleTimeoutOrders().catch(err => {
      this.logger.error('Initial timeout check failed:', err);
    });
    // 定期执行一次
    this.intervalId = setInterval(() => {
      this.handleTimeoutOrders().catch(err => {
        this.logger.error('Scheduled timeout check failed:', err);
      });
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * ��ʱ����ÿ5���Ӽ��һ�γ�ʱ��?
   */
  // @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTimeoutOrders(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('超时检查任务正在运行中，跳过本次执行');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log('��ʼִ�г�ʱ������������');

      // 1. ��������ʱ����
      const depositTimeoutCount = await this.handleDepositTimeoutOrders();

      // 2. ����β�ʱ����
      const finalTimeoutCount = await this.handleFinalTimeoutOrders();

      // 3. ����֧����ʱ��¼
      const paymentTimeoutCount = await this.handlePaymentTimeoutRecords();

      const duration = Date.now() - startTime;
      this.logger.log(
        `超时检查完成：depositTimeout=${depositTimeoutCount}, ` +
          `finalTimeout=${finalTimeoutCount}, paymentTimeout=${paymentTimeoutCount}, ` +
          `duration=${duration}ms`,
      );
    } catch (error) {
      this.logger.error(`超时检查处理失败: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理定金超时订单
   */
  private async handleDepositTimeoutOrders(): Promise<number> {
    const now = new Date();

    // 查询定金超时订单
    const timeoutOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING_PAYMENT,
        depositTimeout: { lte: now },
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      take: 100, // 每次最多处理100条
    });

    this.logger.log(`发现定金超时订单: count=${timeoutOrders.length}`);

    for (const order of timeoutOrders) {
      try {
        await this.cancelOrder(order.id, '定金支付超时自动取消');
      } catch (error) {
        this.logger.error(
          `取消定金超时订单失败: orderId=${order.id}, error=${error.message}`,
        );
      }
    }

    return timeoutOrders.length;
  }

  /**
   * ����β�ʱ����
   */
  private async handleFinalTimeoutOrders(): Promise<number> {
    const now = new Date();

    // 查询尾款超时订单
    const timeoutOrders = await this.prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PARTIAL_PAID,
        finalTimeout: { lte: now },
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      include: {
        payments: {
          where: {
            paymentType: { in: ['DEPOSIT', 'FINAL', 'FULL'] },
            paidAt: { not: null }, // 已支付的记录
          },
        },
      },
      take: 100,
    });

    this.logger.log(`����β�ʱ����: count=${timeoutOrders.length}`);

    for (const order of timeoutOrders) {
      try {
        // ����ҵ���������Ƿ��˻�����
        if (await this.shouldRefundDepositOnTimeout(order)) {
          await this.refundDepositAndCancelOrder(order);
        } else {
          await this.cancelOrder(order.id, 'β��֧����ʱ�Զ�ȡ���������ˣ�');
        }
      } catch (error) {
        this.logger.error(
          `����β�ʱ����ʧ��: orderId=${order.id}, error=${error.message}`,
        );
      }
    }

    return timeoutOrders.length;
  }

  /**
   * 处理支付超时记录
   */
  private async handlePaymentTimeoutRecords(): Promise<number> {
    const now = new Date();

    // 查询支付超时记录
    const timeoutPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING_PAYMENT,
        expiredAt: { lte: now },
      },
      take: 100,
    });

    this.logger.log(`发现支付超时记录: count=${timeoutPayments.length}`);

    for (const payment of timeoutPayments) {
      try {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CANCELLED,
            updatedAt: new Date(),
          },
        });

        this.logger.log(`支付记录已超时取消: paymentId=${payment.id}`);
      } catch (error) {
        this.logger.error(
          `取消支付记录失败: paymentId=${payment.id}, error=${error.message}`,
        );
      }
    }

    return timeoutPayments.length;
  }

  /**
   * 取消订单
   */
  private async cancelOrder(orderId: string, reason: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.CANCELLED,
          orderStatus: OrderStatus.CANCELLED,
          updatedAt: new Date(),
        },
      }),
      this.prisma.statusChangeLog.create({
        data: {
          orderId,
          fieldName: 'paymentStatus',
          oldValue: order.paymentStatus as any,
          newValue: PaymentStatus.CANCELLED,
          operator: 'SYSTEM',
          reason,
        },
      }),
      this.prisma.statusChangeLog.create({
        data: {
          orderId,
          fieldName: 'orderStatus',
          oldValue: order.orderStatus as any,
          newValue: OrderStatus.CANCELLED,
          operator: 'SYSTEM',
          reason,
        },
      }),
    ]);

    this.logger.log(`订单已取消: orderId=${orderId}, reason=${reason}`);
  }

  /**
   * 判断是否应该退还定金
   * 根据业务规则配置，可扩展为配置表驱动
   */
  private async shouldRefundDepositOnTimeout(order: any): Promise<boolean> {
    // 业务规则示例：
    // 1. 距离预约时间超过7天，退还定金
    // 2. 距离预约时间少于7天，不退还定金
    // 3. 如果已经过了预约日期，不退款

    const now = new Date();
    const appointmentDate = new Date(order.appointmentDate);
    const daysUntilAppointment = Math.floor(
      (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 简单规则：超过7天退还定金，否则不退
    const shouldRefund = daysUntilAppointment > 7;

    this.logger.log(
      `判断是否退还定金: orderId=${order.id}, ` +
        `daysUntilAppointment=${daysUntilAppointment}, shouldRefund=${shouldRefund}`,
    );

    return shouldRefund;
  }

  /**
   * 退还定金并取消订单
   */
  private async refundDepositAndCancelOrder(order: any): Promise<void> {
    this.logger.log(`开始退还定金: orderId=${order.id}, depositAmount=${order.depositAmount}`);

    try {
      // 1. 创建退款请求
      const refundRequest = await this.prisma.refundRequest.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          refundNo: `AUTO_${Date.now()}_${order.orderNo}`,
          refundType: 'DEPOSIT_ONLY',
          refundAmount: order.depositAmount,
          refundReason: '尾款支付超时，自动退还定金',
          refundMethod: 'ORIGINAL',
          applicantType: 'SYSTEM',
          status: 'APPROVED', // 自动批准
          approvedBy: 'SYSTEM',
          approvedAt: new Date(),
        },
      });

      // 2. 执行退款
      await this.refundExecutionService.executeRefund(refundRequest.id);

      // 3. 取消订单
        await this.cancelOrder(order.id, '尾款支付超时，已退还定金');

        this.logger.log(`定金退还成功: orderId=${order.id}, refundRequestId=${refundRequest.id}`);
    } catch (error) {
      this.logger.error(`定金退还失败: orderId=${order.id}, error=${error.message}`);
      throw error;
    }
  }

  /**
   * 手动触发超时检查任务（用于测试或管理员操作）
   */
  async manualTrigger(): Promise<{
    depositTimeout: number;
    finalTimeout: number;
    paymentTimeout: number;
  }> {
    this.logger.log('手动触发超时检查任务');

    const depositTimeout = await this.handleDepositTimeoutOrders();
    const finalTimeout = await this.handleFinalTimeoutOrders();
    const paymentTimeout = await this.handlePaymentTimeoutRecords();

    return {
      depositTimeout,
      finalTimeout,
      paymentTimeout,
    };
  }

  /**
   * 获取即将超时的订单（用于提前提醒）
   */
  async getUpcomingTimeoutOrders(minutesBefore: number = 60): Promise<any[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutesBefore * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          {
            paymentStatus: PaymentStatus.PENDING_PAYMENT,
            depositTimeout: {
              gte: now,
              lte: futureTime,
            },
          },
          {
            paymentStatus: PaymentStatus.PARTIAL_PAID,
            finalTimeout: {
              gte: now,
              lte: futureTime,
            },
          },
        ],
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      include: {
        user: true,
      },
    });

    this.logger.log(
      `查询即将超时订单: minutesBefore=${minutesBefore}, count=${orders.length}`,
    );

    return orders;
  }

  /**
   * 定时任务：每小时检查即将超时的订单，发送提醒通知
   * 注意：此方法尚未启用自动调度，需要手动调用
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async sendTimeoutReminders(): Promise<void> {
    try {
      const orders = await this.getUpcomingTimeoutOrders(60);

      for (const order of orders) {
        // TODO: 集成消息通知服务（短信、APP推送等）
        this.logger.log(`发送超时提醒: orderId=${order.id}, userId=${order.userId}`);
        // await this.notificationService.sendTimeoutReminder(order);
      }
    } catch (error) {
      this.logger.error(`发送超时提醒失败: ${error.message}`);
    }
  }

  /**
   * 模块销毁：清理定时器
   */
  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('OrderTimeoutService destroyed - Interval timer cleared');
    }
  }
}

