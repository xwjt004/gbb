import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusChangeLogService } from './status-change-log.service';
import { OrderStatus, PaymentStatus } from '../enums/status.enum';
import { OrderStatusValidator } from '../validators/order-status.validator';

@Injectable()
export class AutoStatusTransitionService {
  private readonly logger = new Logger(AutoStatusTransitionService.name);

  constructor(
    private prisma: PrismaService,
    private statusChangeLogService: StatusChangeLogService,
  ) {}

  /**
   * 支付成功后的自动状态转换
   * @param orderId 订单ID
   * @param transactionId 交易ID
   */
  async onPaymentSuccess(orderId: string, transactionId?: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`订单不存在: ${orderId}`);
        return;
      }

      const currentOrderStatus = order.orderStatus as OrderStatus;
      const currentPaymentStatus = order.paymentStatus as PaymentStatus;

      this.logger.log(`处理支付成功事件: 订单${orderId}, 当前状态: ${currentOrderStatus}+${currentPaymentStatus}`);

      // 如果订单已确认且支付状态变为已支付，可能需要转为进行中
      if (currentOrderStatus === OrderStatus.CONFIRMED && order.appointmentDate) {
        const appointmentDate = new Date(order.appointmentDate);
        const now = new Date();
        
        // 如果预约日期是今天或已过期，自动转为进行中
        if (appointmentDate <= now) {
          await this.updateOrderStatus(
            orderId,
            OrderStatus.IN_PROGRESS,
            'auto-system',
            `支付成功且已到预约时间，自动开始服务`
          );
        } else {
          this.logger.log(`订单${orderId}支付成功，但未到预约时间(${appointmentDate.toISOString()})，保持已确认状态`);
        }
      }

      // 更新支付状态为已支付
      await this.updatePaymentStatus(
        orderId,
        PaymentStatus.FULLY_PAID,
        'auto-system',
        `支付成功，交易ID: ${transactionId || 'N/A'}`
      );

    } catch (error) {
      this.logger.error(`处理支付成功事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 支付失败后的自动状态转换
   * @param orderId 订单ID
   * @param reason 失败原因
   */
  async onPaymentFailed(orderId: string, reason?: string): Promise<void> {
    try {
      await this.updatePaymentStatus(
        orderId,
        PaymentStatus.CANCELLED,
        'auto-system',
        `支付失败: ${reason || '未知原因'}`
      );
    } catch (error) {
      this.logger.error(`处理支付失败事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 到达预约时间时的自动状态转换
   * @param orderId 订单ID
   */
  async onAppointmentTimeReached(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`订单不存在: ${orderId}`);
        return;
      }

      const currentOrderStatus = order.orderStatus as OrderStatus;
      const currentPaymentStatus = order.paymentStatus as PaymentStatus;

      // 只有已确认且已支付的订单才能自动转为进行中
      if (currentOrderStatus === OrderStatus.CONFIRMED && currentPaymentStatus === PaymentStatus.FULLY_PAID) {
        await this.updateOrderStatus(
          orderId,
          OrderStatus.IN_PROGRESS,
          'auto-system',
          '到达预约时间，自动开始服务'
        );
      }
    } catch (error) {
      this.logger.error(`处理预约时间到达事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 检查并处理超时订单
   * 例如：待支付超过24小时的订单自动取消
   */
  async processTimeoutOrders(): Promise<void> {
    try {
      const timeout = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24小时前

      // 查找超时的待支付订单
      const timeoutOrders = await this.prisma.order.findMany({
        where: {
          orderStatus: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING_PAYMENT,
          createdAt: { lt: timeout },
        },
      });

      this.logger.log(`发现 ${timeoutOrders.length} 个超时订单`);

      for (const order of timeoutOrders) {
        await this.updateOrderStatus(
          order.id,
          OrderStatus.CANCELLED,
          'auto-system',
          '支付超时，自动取消订单'
        );
        
        await this.updatePaymentStatus(
          order.id,
          PaymentStatus.CANCELLED,
          'auto-system',
          '支付超时，自动取消'
        );
      }
    } catch (error) {
      this.logger.error(`处理超时订单失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 更新订单状态
   */
  private async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    operator: string,
    reason: string
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    const oldStatus = order.orderStatus as OrderStatus;
    const paymentStatus = order.paymentStatus as PaymentStatus;

    // 验证状态转换是否有效
    if (!OrderStatusValidator.isValidTransition(oldStatus, paymentStatus, newStatus, paymentStatus)) {
      this.logger.warn(
        `无效的状态转换: 订单${orderId} ${oldStatus}+${paymentStatus} → ${newStatus}+${paymentStatus}`
      );
      return;
    }

    // 更新订单状态
    await this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: newStatus as any },
    });

    // 记录状态变更日志
    await this.statusChangeLogService.logStatusChange({
      orderId,
      fieldName: 'orderStatus',
      oldValue: oldStatus,
      newValue: newStatus,
      operator,
      reason,
    });

    this.logger.log(`订单状态已更新: ${orderId} ${oldStatus} → ${newStatus}`);
  }

  /**
   * 更新支付状态
   */
  private async updatePaymentStatus(
    orderId: string,
    newStatus: PaymentStatus,
    operator: string,
    reason: string
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    const orderStatus = order.orderStatus as OrderStatus;
    const oldStatus = order.paymentStatus as PaymentStatus;

    // 验证状态转换是否有效
    if (!OrderStatusValidator.isValidTransition(orderStatus, oldStatus, orderStatus, newStatus)) {
      this.logger.warn(
        `无效的状态转换: 订单${orderId} ${orderStatus}+${oldStatus} → ${orderStatus}+${newStatus}`
      );
      return;
    }

    // 更新支付状态
    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: newStatus as any },
    });

    // 记录状态变更日志
    await this.statusChangeLogService.logStatusChange({
      orderId,
      fieldName: 'paymentStatus',
      oldValue: oldStatus,
      newValue: newStatus,
      operator,
      reason,
    });

    this.logger.log(`支付状态已更新: ${orderId} ${oldStatus} → ${newStatus}`);
  }

  /**
   * 获取自动转换统计信息
   */
  async getAutoTransitionStats(startDate?: Date, endDate?: Date) {
    const where: any = {
      operator: { startsWith: 'auto-' }
    };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalAutoTransitions,
      autoTransitionsByType,
    ] = await Promise.all([
      this.prisma.statusChangeLog.count({ where }),
      this.prisma.statusChangeLog.groupBy({
        by: ['fieldName', 'newValue'],
        where,
        _count: true,
        orderBy: { _count: { fieldName: 'desc' } },
      }),
    ]);

    return {
      totalAutoTransitions,
      transitionsByType: autoTransitionsByType.map(item => ({
        type: `${item.fieldName} → ${item.newValue}`,
        count: item._count,
      })),
    };
  }
}
