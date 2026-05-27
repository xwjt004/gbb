import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, PaymentStatus, VALID_STATUS_COMBINATIONS, STATUS_DESCRIPTIONS } from '../enums/status.enum';

/**
 * 订单状态验证器
 * 负责验证订单状态和支付状态的组合是否有效
 */
@Injectable()
export class OrderStatusValidator {
  private readonly logger = new Logger(OrderStatusValidator.name);

  /**
   * 验证状态组合是否有效
   * @param orderStatus 订单状态
   * @param paymentStatus 支付状态
   * @returns 是否有效
   */
  static validateStatusCombination(orderStatus: OrderStatus, paymentStatus: PaymentStatus): boolean {
    const validPaymentStatuses = VALID_STATUS_COMBINATIONS.get(orderStatus);
    return validPaymentStatuses?.includes(paymentStatus) ?? false;
  }

  /**
   * 检查状态组合是否有效（别名方法）
   * @param orderStatus 订单状态
   * @param paymentStatus 支付状态
   * @returns 是否有效
   */
  static isValidCombination(orderStatus: OrderStatus, paymentStatus: PaymentStatus): boolean {
    return this.validateStatusCombination(orderStatus, paymentStatus);
  }

  /**
   * 验证状态组合，如果无效则抛出异常
   * @param orderStatus 订单状态
   * @param paymentStatus 支付状态
   * @param orderId 订单ID（用于日志）
   */
  static validateAndThrow(orderStatus: OrderStatus, paymentStatus: PaymentStatus, orderId?: string): void {
    if (!this.validateStatusCombination(orderStatus, paymentStatus)) {
      const orderDesc = STATUS_DESCRIPTIONS.orderStatus[orderStatus] || orderStatus;
      const paymentDesc = STATUS_DESCRIPTIONS.paymentStatus[paymentStatus] || paymentStatus;
      
      const errorMessage = `无效的状态组合: 订单状态「${orderDesc}」不能与支付状态「${paymentDesc}」同时存在`;
      
      if (orderId) {
        Logger.error(`订单 ${orderId} 状态验证失败: ${errorMessage}`, 'OrderStatusValidator');
      }
      
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * 获取指定订单状态的所有有效支付状态
   * @param orderStatus 订单状态
   * @returns 有效的支付状态列表
   */
  static getValidPaymentStatuses(orderStatus: OrderStatus): PaymentStatus[] {
    return VALID_STATUS_COMBINATIONS.get(orderStatus) || [];
  }

  /**
   * 检查状态转换是否允许
   * @param currentOrderStatus 当前订单状态
   * @param currentPaymentStatus 当前支付状态
   * @param newOrderStatus 新订单状态
   * @param newPaymentStatus 新支付状态
   * @returns 是否允许转换
   */
  static isValidTransition(
    currentOrderStatus: OrderStatus,
    currentPaymentStatus: PaymentStatus,
    newOrderStatus: OrderStatus,
    newPaymentStatus: PaymentStatus
  ): boolean {
    // 检查当前状态组合是否有效
    if (!this.validateStatusCombination(currentOrderStatus, currentPaymentStatus)) {
      return false;
    }

    // 检查目标状态组合是否有效
    if (!this.validateStatusCombination(newOrderStatus, newPaymentStatus)) {
      return false;
    }

    // 特殊规则：某些状态转换是不可逆的
    const irreversibleOrderStatuses = [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.CANCELLED];
    const irreversiblePaymentStatuses = [PaymentStatus.REFUNDED, PaymentStatus.CANCELLED];

    // 如果当前状态是不可逆的，不允许转换
    if (irreversibleOrderStatuses.includes(currentOrderStatus) && currentOrderStatus !== newOrderStatus) {
      return false;
    }

    if (irreversiblePaymentStatuses.includes(currentPaymentStatus) && currentPaymentStatus !== newPaymentStatus) {
      return false;
    }

    // 特殊业务规则验证
    return this.validateBusinessRules(currentOrderStatus, currentPaymentStatus, newOrderStatus, newPaymentStatus);
  }

  /**
   * 验证业务规则
   * @param currentOrderStatus 当前订单状态
   * @param currentPaymentStatus 当前支付状态
   * @param newOrderStatus 新订单状态
   * @param newPaymentStatus 新支付状态
   * @returns 是否符合业务规则
   */
  private static validateBusinessRules(
    currentOrderStatus: OrderStatus,
    currentPaymentStatus: PaymentStatus,
    newOrderStatus: OrderStatus,
    newPaymentStatus: PaymentStatus
  ): boolean {
    // 规则1：进行中状态必须已支付
    if (newOrderStatus === OrderStatus.IN_PROGRESS && newPaymentStatus !== PaymentStatus.FULLY_PAID) {
      return false;
    }

    // 规则2：已完成状态必须已支付
    if (newOrderStatus === OrderStatus.COMPLETED && newPaymentStatus !== PaymentStatus.FULLY_PAID) {
      return false;
    }

    // 规则3：从待确认直接到进行中需要先经过已确认
    if (currentOrderStatus === OrderStatus.PENDING && newOrderStatus === OrderStatus.IN_PROGRESS) {
      return false;
    }

    // 规则4：取消订单时，如果已支付需要退款
    if (newOrderStatus === OrderStatus.CANCELLED && currentPaymentStatus === PaymentStatus.FULLY_PAID) {
      return newPaymentStatus === PaymentStatus.REFUNDED;
    }

    return true;
  }

  /**
   * 获取状态组合的风险等级
   * @param orderStatus 订单状态
   * @param paymentStatus 支付状态
   * @returns 风险等级
   */
  static getRiskLevel(orderStatus: OrderStatus, paymentStatus: PaymentStatus): 'low' | 'medium' | 'high' | 'critical' {
    if (!this.validateStatusCombination(orderStatus, paymentStatus)) {
      return 'critical';
    }

    // 高风险：长时间待支付的已确认订单
    if (orderStatus === OrderStatus.CONFIRMED && paymentStatus === PaymentStatus.PENDING_PAYMENT) {
      return 'high';
    }

    // 中风险：支付失败的订单
    if (paymentStatus === PaymentStatus.CANCELLED) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取状态组合的描述
   * @param orderStatus 订单状态
   * @param paymentStatus 支付状态
   * @returns 状态组合描述
   */
  static getStatusCombinationDescription(orderStatus: OrderStatus, paymentStatus: PaymentStatus): string {
    const orderDesc = STATUS_DESCRIPTIONS.orderStatus[orderStatus] || orderStatus;
    const paymentDesc = STATUS_DESCRIPTIONS.paymentStatus[paymentStatus] || paymentStatus;
    return `${orderDesc} (${paymentDesc})`;
  }
}
