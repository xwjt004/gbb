/**
 * 支付系统适配器工具类
 * 
 * 本工具类提供了支付系统中各种数据转换和推断的方法，包括：
 * - 状态标准化：将旧的状态值转换为新的枚举值
 * - 支付模式推断：根据订单信息推断支付模式
 * - 支付类型推断：根据支付金额和订单状态推断支付类型
 * - 支付方式推断：根据订单来源推断支付方式
 * - 金额计算：计算待付金额、已退金额等
 * - 支付摘要生成：生成订单的完整支付记录摘要
 * 
 * 使用方式：
 * ```typescript
 * // 标准化订单状态
 * const order = await prisma.order.findUnique({ where: { id } });
 * const standardizedOrder = {
 *   ...order,
 *   paymentStatus: PaymentAdapter.normalizePaymentStatus(order.paymentStatus),
 *   orderStatus: PaymentAdapter.normalizeOrderStatus(order.orderStatus),
 *   paymentMode: PaymentAdapter.inferPaymentMode(order),
 *   remainingAmount: PaymentAdapter.calculateRemainingAmount(order),
 * };
 * ```
 * 
 * 创建日期: 2025-11-26
 */

import { Logger } from '@nestjs/common';
import {
  PaymentMode,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  PAYMENT_STATUS_MAPPER,
  ORDER_STATUS_MAPPER,
} from '../enums/payment-system.enum';

export class PaymentAdapter {
  private static readonly logger = new Logger(PaymentAdapter.name);

  /**
   * 标准化支付状态
   * 将数据库中的旧状态值转换为新的标准枚举值
   * 
   * @param status 原始状态值（可能是旧格式）
   * @returns 标准化后的PaymentStatus枚举值
   * 
   * @example
   * PaymentAdapter.normalizePaymentStatus('PENDING') // => PaymentStatus.PENDING_PAYMENT
   * PaymentAdapter.normalizePaymentStatus('PARTIAL') // => PaymentStatus.PARTIAL_PAID
   */
  static normalizePaymentStatus(status: string | null | undefined): PaymentStatus {
    if (!status) {
      return PaymentStatus.PENDING_PAYMENT;
    }

    const upperStatus = status.toUpperCase();
    
    // 尝试直接匹配
    if (Object.values(PaymentStatus).includes(upperStatus as PaymentStatus)) {
      return upperStatus as PaymentStatus;
    }

    // 使用映射表
    const mapped = PAYMENT_STATUS_MAPPER[upperStatus];
    if (mapped) {
      return mapped;
    }

    // 默认返回待支付
    this.logger.warn(`未知的支付状态: ${status}，默认返回 PENDING_PAYMENT`);
    return PaymentStatus.PENDING_PAYMENT;
  }

  /**
   * 标准化订单状态
   * 将数据库中的旧状态值转换为新的标准枚举值
   * 
   * @param status 原始状态值（可能是旧格式）
   * @returns 标准化后的OrderStatus枚举值
   * 
   * @example
   * PaymentAdapter.normalizeOrderStatus('PENDING') // => OrderStatus.PENDING
   * PaymentAdapter.normalizeOrderStatus('COMPLETED') // => OrderStatus.COMPLETED
   */
  static normalizeOrderStatus(status: string | null | undefined): OrderStatus {
    if (!status) {
      return OrderStatus.PENDING;
    }

    const upperStatus = status.toUpperCase();
    
    // 尝试直接匹配
    if (Object.values(OrderStatus).includes(upperStatus as OrderStatus)) {
      return upperStatus as OrderStatus;
    }

    // 使用映射表
    const mapped = ORDER_STATUS_MAPPER[upperStatus];
    if (mapped) {
      return mapped;
    }

    // 默认返回待确认
    this.logger.warn(`未知的订单状态: ${status}，默认返回 PENDING`);
    return OrderStatus.PENDING;
  }

  /**
   * 推断支付模式
   * 根据订单来源和定金/总额关系推断支付模式
   * 
   * @param order 订单对象
   * @returns PaymentMode枚举值
   * 
   * @example
   * // 微信订单，定金100元，总额500元 => DEPOSIT_ONLINE
   * PaymentAdapter.inferPaymentMode({ source: 'WXAPP', depositAmount: 100, totalAmount: 500 })
   * 
   * // 门店订单，定金等于总额 => FULL_OFFLINE
   * PaymentAdapter.inferPaymentMode({ source: 'ADMIN', depositAmount: 500, totalAmount: 500 })
   */
  static inferPaymentMode(order: any): PaymentMode {
    const isOnline = order.source === 'WXAPP';
    const depositAmount = Number(order.depositAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;
    
    // 判断是否为定金模式：定金 < 总额
    const isDeposit = depositAmount < totalAmount && depositAmount > 0;

    if (isOnline && isDeposit) {
      return PaymentMode.DEPOSIT_ONLINE;
    }
    
    if (isOnline && !isDeposit) {
      return PaymentMode.FULL_ONLINE;
    }
    
    if (!isOnline && isDeposit) {
      return PaymentMode.DEPOSIT_OFFLINE;
    }
    
    return PaymentMode.FULL_OFFLINE;
  }

  /**
   * 推断支付类型
   * 根据支付金额和订单当前支付状态推断这笔支付是定金、尾款还是全款
   * 
   * @param payment 支付记录对象
   * @param order 订单对象
   * @returns PaymentType枚举值
   * 
   * @example
   * // 第一笔支付，金额等于定金 => DEPOSIT
   * PaymentAdapter.inferPaymentType({ amount: 100 }, { depositAmount: 100, paidAmount: 0 })
   * 
   * // 第二笔支付，已付过定金 => FINAL
   * PaymentAdapter.inferPaymentType({ amount: 400 }, { paidAmount: 100, totalAmount: 500 })
   */
  static inferPaymentType(payment: any, order: any): PaymentType {
    const amount = Number(payment.amount) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    const depositAmount = Number(order.depositAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;

    // 如果金额是负数，说明是退款
    if (amount < 0) {
      return PaymentType.REFUND;
    }

    // 如果支付金额等于订单总额，说明是全款支付
    if (amount === totalAmount) {
      return PaymentType.FULL;
    }

    // 如果支付金额等于定金，且订单尚未支付过，说明是定金支付
    if (amount === depositAmount && paidAmount === 0) {
      return PaymentType.DEPOSIT;
    }

    // 如果订单已经支付过部分款项（但未全额支付），说明这是尾款支付
    if (paidAmount > 0 && paidAmount < totalAmount) {
      return PaymentType.FINAL;
    }

    // 默认认为是全款支付
    return PaymentType.FULL;
  }

  /**
   * 推断支付方式
   * 根据订单来源和支付记录信息推断支付方式
   * 
   * @param payment 支付记录对象
   * @param order 订单对象
   * @returns PaymentMethod枚举值
   * 
   * @example
   * // 微信小程序订单 => WECHAT_PAY
   * PaymentAdapter.inferPaymentMethod({}, { source: 'WXAPP' })
   * 
   * // 门店订单 => CASH（默认）
   * PaymentAdapter.inferPaymentMethod({}, { source: 'ADMIN' })
   */
  static inferPaymentMethod(payment: any, order: any): PaymentMethod {
    // 如果订单来源是微信小程序，默认是微信支付
    if (order.source === 'WXAPP') {
      return PaymentMethod.WECHAT_PAY;
    }

    // 如果有第三方交易号，可能是微信支付
    if (payment.transactionId && payment.transactionId.startsWith('wx')) {
      return PaymentMethod.WECHAT_PAY;
    }

    // 如果Payment记录中已经指定了支付方式，使用已有的
    if (payment.paymentMethod) {
      return payment.paymentMethod;
    }

    // 默认门店支付为现金
    return PaymentMethod.CASH;
  }

  /**
   * 计算待付金额
   * 总额 - 已付金额 = 待付金额
   * 
   * @param order 订单对象
   * @returns 待付金额（保证不为负数）
   * 
   * @example
   * PaymentAdapter.calculateRemainingAmount({ totalAmount: 500, paidAmount: 100 }) // => 400
   * PaymentAdapter.calculateRemainingAmount({ totalAmount: 500, paidAmount: 500 }) // => 0
   */
  static calculateRemainingAmount(order: any): number {
    const totalAmount = Number(order.totalAmount) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    const remaining = totalAmount - paidAmount;
    
    // 确保不返回负数
    return Math.max(0, remaining);
  }

  /**
   * 计算已退金额
   * 如果订单有refundedAmount字段，直接返回；否则计算退款类型的Payment总和
   * 
   * @param order 订单对象
   * @param payments 支付记录数组（可选）
   * @returns 已退金额
   */
  static calculateRefundedAmount(order: any, payments?: any[]): number {
    // 如果订单对象中已有refundedAmount，直接使用
    if (order.refundedAmount !== undefined && order.refundedAmount !== null) {
      return Number(order.refundedAmount) || 0;
    }

    // 如果没有提供payments，返回0
    if (!payments || payments.length === 0) {
      return 0;
    }

    // 计算所有退款类型支付的总和
    const refundTotal = payments
      .filter(p => {
        const type = this.inferPaymentType(p, order);
        return type === PaymentType.REFUND;
      })
      .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

    return refundTotal;
  }

  /**
   * 生成支付摘要
   * 汇总订单的所有支付记录，生成结构化的支付摘要
   * 
   * @param order 订单对象
   * @param payments 支付记录数组
   * @returns 支付摘要对象
   * 
   * @example
   * const summary = PaymentAdapter.generatePaymentSummary(order, payments);
   * // 返回:
   * // {
   * //   deposits: [{ amount: 100, method: 'WECHAT_PAY', paidAt: '2025-11-26' }],
   * //   finals: [{ amount: 400, method: 'WECHAT_PAY', paidAt: '2025-12-01' }],
   * //   refunds: [],
   * //   totalPaid: 500,
   * //   totalRefunded: 0,
   * //   remaining: 0,
   * //   paymentMode: 'DEPOSIT_ONLINE',
   * // }
   */
  static generatePaymentSummary(order: any, payments: any[]): any {
    if (!payments || payments.length === 0) {
      return {
        deposits: [],
        finals: [],
        fullPayments: [],
        refunds: [],
        totalPaid: Number(order.paidAmount) || 0,
        totalRefunded: this.calculateRefundedAmount(order, payments),
        remaining: this.calculateRemainingAmount(order),
        paymentMode: this.inferPaymentMode(order),
      };
    }

    // 按类型分组支付记录
    const deposits: any[] = [];
    const finals: any[] = [];
    const fullPayments: any[] = [];
    const refunds: any[] = [];

    payments.forEach(p => {
      const type = this.inferPaymentType(p, order);
      const method = this.inferPaymentMethod(p, order);
      const amount = Number(p.amount) || 0;

      const paymentInfo = {
        id: p.id,
        amount: Math.abs(amount),
        method,
        status: this.normalizePaymentStatus(p.status),
        paidAt: p.paidAt,
        transactionId: p.transactionId,
        notes: p.notes,
      };

      switch (type) {
        case PaymentType.DEPOSIT:
          deposits.push(paymentInfo);
          break;
        case PaymentType.FINAL:
          finals.push(paymentInfo);
          break;
        case PaymentType.FULL:
          fullPayments.push(paymentInfo);
          break;
        case PaymentType.REFUND:
          refunds.push({
            ...paymentInfo,
            reason: p.refundReason,
            refundedAt: p.refundedAt,
          });
          break;
      }
    });

    return {
      deposits,
      finals,
      fullPayments,
      refunds,
      totalPaid: Number(order.paidAmount) || 0,
      totalRefunded: this.calculateRefundedAmount(order, payments),
      remaining: this.calculateRemainingAmount(order),
      paymentMode: this.inferPaymentMode(order),
    };
  }

  /**
   * 判断订单是否支付完成
   * 
   * @param order 订单对象
   * @returns true表示已支付完成，false表示未完成
   */
  static isFullyPaid(order: any): boolean {
    const totalAmount = Number(order.totalAmount) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    return paidAmount >= totalAmount && totalAmount > 0;
  }

  /**
   * 判断订单是否仅支付了定金
   * 
   * @param order 订单对象
   * @returns true表示仅支付了定金，false表示其他情况
   */
  static isDepositPaid(order: any): boolean {
    const depositAmount = Number(order.depositAmount) || 0;
    const paidAmount = Number(order.paidAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;
    
    return paidAmount === depositAmount && paidAmount > 0 && paidAmount < totalAmount;
  }

  /**
   * 判断订单是否需要支付尾款
   * 
   * @param order 订单对象
   * @returns true表示需要支付尾款，false表示不需要
   */
  static needsFinalPayment(order: any): boolean {
    return this.isDepositPaid(order);
  }

  /**
   * 获取下一步需要支付的金额
   * 
   * @param order 订单对象
   * @returns 下一步需要支付的金额
   */
  static getNextPaymentAmount(order: any): number {
    const paidAmount = Number(order.paidAmount) || 0;
    const depositAmount = Number(order.depositAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;

    // 如果还没有支付
    if (paidAmount === 0) {
      // 如果是定金模式，返回定金金额
      if (depositAmount < totalAmount && depositAmount > 0) {
        return depositAmount;
      }
      // 否则返回全款
      return totalAmount;
    }

    // 如果已经支付了部分，返回剩余金额
    return this.calculateRemainingAmount(order);
  }

  /**
   * 获取下一步支付的类型
   * 
   * @param order 订单对象
   * @returns PaymentType枚举值
   */
  static getNextPaymentType(order: any): PaymentType {
    const paidAmount = Number(order.paidAmount) || 0;
    const depositAmount = Number(order.depositAmount) || 0;
    const totalAmount = Number(order.totalAmount) || 0;

    // 如果还没有支付
    if (paidAmount === 0) {
      // 如果定金小于总额，说明是定金模式
      if (depositAmount < totalAmount && depositAmount > 0) {
        return PaymentType.DEPOSIT;
      }
      // 否则是全款模式
      return PaymentType.FULL;
    }

    // 如果已经支付了部分，下一步是尾款
    if (paidAmount > 0 && paidAmount < totalAmount) {
      return PaymentType.FINAL;
    }

    // 其他情况返回全款
    return PaymentType.FULL;
  }

  /**
   * 生成订单的扩展信息
   * 为订单对象添加所有计算字段和标准化字段
   * 
   * @param order 原始订单对象
   * @param payments 支付记录数组（可选）
   * @returns 扩展后的订单对象
   */
  static enrichOrderData(order: any, payments?: any[]): any {
    return {
      ...order,
      // 标准化状态
      paymentStatus: this.normalizePaymentStatus(order.paymentStatus),
      orderStatus: this.normalizeOrderStatus(order.orderStatus),
      
      // 推断/计算字段
      paymentMode: this.inferPaymentMode(order),
      remainingAmount: this.calculateRemainingAmount(order),
      refundedAmount: this.calculateRefundedAmount(order, payments),
      
      // 支付摘要
      paymentSummary: payments ? this.generatePaymentSummary(order, payments) : null,
      
      // 状态判断
      isFullyPaid: this.isFullyPaid(order),
      isDepositPaid: this.isDepositPaid(order),
      needsFinalPayment: this.needsFinalPayment(order),
      
      // 下一步支付信息
      nextPaymentAmount: this.getNextPaymentAmount(order),
      nextPaymentType: this.getNextPaymentType(order),
    };
  }
}
