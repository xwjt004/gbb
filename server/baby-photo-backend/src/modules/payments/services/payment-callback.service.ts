/**
 * P0 功能：支付回调幂等性服�?
 * 功能�?
 * 1. 分布式锁防止并发
 * 2. 幂等性检查防止重复处�?
 * 3. 事务保证数据一致�?
 * 4. 金额校验防止异常支付
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentStatus, OrderStatus } from '../../../shared/enums/status.enum';
import { PaymentType, PaymentMethod } from '@prisma/client';

export interface WechatPayCallbackData {
  transaction_id: string;  // 微信支付交易�?
  out_trade_no: string;    // 商户订单�?
  total_amount: number;    // 支付金额（元�?
  success_time?: string;   // 支付成功时间
}

export interface PaymentCallbackResult {
  success: boolean;
  message: string;
  payment?: any;
  order?: any;
}

@Injectable()
export class PaymentCallbackService {
  private readonly logger = new Logger(PaymentCallbackService.name);
  private readonly LOCK_TTL = 10000; // 分布式锁超时时间�?0秒）
  private readonly CACHE_TTL = 300;  // 幂等性缓存时间（5分钟�?

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 处理微信支付回调（幂等性设计）
   */
  async handleWechatPayCallback(
    callbackData: WechatPayCallbackData,
  ): Promise<PaymentCallbackResult> {
    const { transaction_id, out_trade_no, total_amount } = callbackData;

    this.logger.log(
      `接收微信支付回调: transaction_id=${transaction_id}, out_trade_no=${out_trade_no}, amount=${total_amount}`,
    );

    // 1. 分布式锁（防止并发）
    const lockKey = this.cacheService.generateKey(
      'payment-callback-lock',
      transaction_id,
    );
    const lock = await this.acquireLock(lockKey);

    try {
      // 2. 幂等性检�?
      const cachedResult = await this.checkIdempotency(transaction_id);
      if (cachedResult) {
        this.logger.warn(`幂等性检查：支付已处�?transaction_id=${transaction_id}`);
        return cachedResult;
      }

      // 3. 查询支付记录
      const existingPayment = await this.prisma.payment.findFirst({
        where: { transactionId: transaction_id },
      });

      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.FULLY_PAID) {
          const result: PaymentCallbackResult = {
            success: true,
            message: '支付已处理',
            payment: existingPayment,
          };
          await this.cacheIdempotency(transaction_id, result);
          return result;
        }
      }

      // 4. 验证订单
      const order = await this.prisma.order.findUnique({
        where: { orderNo: out_trade_no },
        include: { payments: true },
      });

      if (!order) {
        throw new BadRequestException(`订单不存�? ${out_trade_no}`);
      }

      // 5. 金额校验
      const expectedAmount = this.calculateExpectedAmount(order);
      if (Math.abs(total_amount - expectedAmount.toNumber()) > 0.01) {
        this.logger.error(
          `金额不匹�? expected=${expectedAmount}, actual=${total_amount}`,
        );
        await this.handleAmountMismatch(order, total_amount, expectedAmount);
        throw new BadRequestException('支付金额不匹配');
      }

      // 6. 事务更新
      const result = await this.updatePaymentAndOrder(
        order,
        callbackData,
        existingPayment,
      );

      // 7. 缓存结果
      await this.cacheIdempotency(transaction_id, result);

      this.logger.log(
        `支付回调处理成功: order=${out_trade_no}, payment=${result.payment.id}`,
      );

      return result;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 获取分布式锁
   */
  private async acquireLock(key: string): Promise<boolean> {
    const maxRetries = 30; // 最多重�?0�?
    const retryDelay = 300; // 每次重试间隔300ms

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.cacheService.set(key, '1', this.LOCK_TTL / 1000);
        return true;
      } catch (error) {
        // 锁已存在，继续重�?
      }

      // 等待后重�?
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    throw new Error(`获取分布式锁失败: ${key}`);
  }

  /**
   * 释放分布式锁
   */
  private async releaseLock(key: string): Promise<void> {
    await this.cacheService.del(key);
  }

  /**
   * 检查幂等�?
   */
  private async checkIdempotency(
    transactionId: string,
  ): Promise<PaymentCallbackResult | null> {
    const cacheKey = this.cacheService.generateKey(
      'payment-callback-result',
      transactionId,
    );
    return await this.cacheService.get<PaymentCallbackResult>(cacheKey);
  }

  /**
   * 缓存幂等性结�?
   */
  private async cacheIdempotency(
    transactionId: string,
    result: PaymentCallbackResult,
  ): Promise<void> {
    const cacheKey = this.cacheService.generateKey(
      'payment-callback-result',
      transactionId,
    );
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
  }

  /**
   * 计算期望支付金额
   */
  private calculateExpectedAmount(order: any): Decimal {
    const paymentMode = order.paymentMode;
    const paidAmount = new Decimal(order.paidAmount);

    if (paymentMode.includes('DEPOSIT')) {
      // 定金模式
      if (paidAmount.toNumber() === 0) {
        // 支付定金
        return order.depositAmount;
      } else {
        // 支付尾款
        return order.totalAmount.sub(paidAmount);
      }
    } else {
      // 全款模式
      return order.totalAmount.sub(paidAmount);
    }
  }

  /**
   * 确定支付类型
   */
  private determinePaymentType(order: any): PaymentType {
    const paymentMode = order.paymentMode;
    const paidAmount = new Decimal(order.paidAmount);

    if (paymentMode.includes('DEPOSIT')) {
      return paidAmount.toNumber() === 0 ? 'DEPOSIT' : 'FINAL';
    }
    return 'FULL';
  }

  /**
   * 确定新的支付状�?
   */
  private determineNewPaymentStatus(order: any, newPaidAmount: Decimal): PaymentStatus {
    if (newPaidAmount.gte(order.totalAmount)) {
      return PaymentStatus.FULLY_PAID;
    }

    if (order.paymentMode.includes('DEPOSIT')) {
      return newPaidAmount.gte(order.depositAmount)
        ? PaymentStatus.PARTIAL_PAID
        : PaymentStatus.PENDING_PAYMENT;
    }

    return PaymentStatus.PARTIAL_PAID;
  }

  /**
   * 事务更新支付和订�?
   */
  private async updatePaymentAndOrder(
    order: any,
    callbackData: WechatPayCallbackData,
    existingPayment: any,
  ): Promise<PaymentCallbackResult> {
    const { transaction_id, total_amount, success_time } = callbackData;
    const paymentType = this.determinePaymentType(order);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 创建或更新支付记�?
      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              status: PaymentStatus.FULLY_PAID,
              transactionId: transaction_id,
              paidAt: success_time ? new Date(success_time) : new Date(),
              updatedAt: new Date(),
            },
          })
        : await tx.payment.create({
            data: {
              orderId: order.id,
              paymentType: paymentType as any,
              paymentMethod: 'WECHAT_PAY' as PaymentMethod,
              amount: new Decimal(total_amount),
              status: PaymentStatus.FULLY_PAID,
              transactionId: transaction_id,
              idempotencyKey: transaction_id, // 使用交易号作为幂等性键
              paidAt: success_time ? new Date(success_time) : new Date(),
            },
          });

      // 2. 更新订单金额和状�?
      const newPaidAmount = new Decimal(order.paidAmount).add(total_amount);
      const newRemainingAmount = new Decimal(order.totalAmount).sub(newPaidAmount);
      const newPaymentStatus = this.determineNewPaymentStatus(order, newPaidAmount);

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus: newPaymentStatus as any,
          orderStatus:
            newPaymentStatus === PaymentStatus.FULLY_PAID
              ? OrderStatus.CONFIRMED
              : order.orderStatus as any,
          updatedAt: new Date(),
        },
      });

      // 3. 记录状态变更日�?
      await tx.statusChangeLog.create({
        data: {
          orderId: order.id,
          fieldName: 'paymentStatus',
          oldValue: order.paymentStatus as any,
          newValue: newPaymentStatus,
          operator: 'SYSTEM',
          reason: '微信支付回调',
          createdAt: new Date(),
        },
      });

      return {
        success: true,
        message: '支付处理成功',
        payment,
        order: updatedOrder,
      };
    });

    return result;
  }

  /**
   * 处理金额不匹配情�?
   */
  private async handleAmountMismatch(
    order: any,
    actualAmount: number,
    expectedAmount: Decimal,
  ): Promise<void> {
    this.logger.error(
      `金额不匹配告�? orderId=${order.id}, orderNo=${order.orderNo}, ` +
        `expected=${expectedAmount.toString()}, actual=${actualAmount}`,
    );

    // 这里可以添加告警通知逻辑
    // 例如：发送邮件、短信、企业微信等
    // await this.alertService.sendAmountMismatchAlert({...});
  }
}
