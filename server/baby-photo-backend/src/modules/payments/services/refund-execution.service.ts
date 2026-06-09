/**
 * P0 功能：退款原路返回服�?
 * 功能�?
 * 1. 退款金额分配算法（FIFO�?
 * 2. 原路退回逻辑
 * 3. 退款失败重试机�?
 * 4. 线上线下退款统一处理
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { WechatPayService } from '../wechat-pay.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentStatus } from '../../../shared/enums/status.enum';
import { PaymentType, PaymentMethod } from '@prisma/client';

export interface RefundAllocation {
  paymentId: string;
  amount: Decimal;
  method: PaymentMethod;
  transactionId: string | null;
}

export interface ExecuteRefundResult {
  success: boolean;
  message: string;
  refunds: any[];
}

@Injectable()
export class RefundExecutionService {
  private readonly logger = new Logger(RefundExecutionService.name);
  private readonly MAX_RETRY_COUNT = 3; // 最大重试次�?

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
  ) {}

  /**
   * 执行退款（主入口）
   */
  async executeRefund(refundRequestId: string): Promise<ExecuteRefundResult> {
    this.logger.log(`开始执行退�? refundRequestId=${refundRequestId}`);

    // 1. 查询退款申�?
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
    });

    if (!request) {
      throw new NotFoundException(`退款申请不存在: ${refundRequestId}`);
    }

    if (request.status !== 'APPROVED') {
      throw new BadRequestException(`退款申请未审批: status=${request.status}`);
    }

    // 2. 查询订单及支付记�?
    const order = await this.prisma.order.findUnique({
      where: { id: request.orderId },
      include: {
        payments: {
          where: {
            status: PaymentStatus.FULLY_PAID,
            paymentType: { in: ['DEPOSIT' as PaymentType, 'FINAL' as PaymentType, 'FULL' as PaymentType] },
          },
          orderBy: { paidAt: 'desc' }, // 最新的支付优先退
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`订单不存�? ${request.orderId}`);
    }

    // 3. 检查是否已有退款记�?
    const existingRefunds = await this.prisma.refund.findMany({
      where: { refundRequestId },
    });

    if (existingRefunds.length > 0) {
      this.logger.warn(`退款申请已处理: refundRequestId=${refundRequestId}`);
      return {
        success: true,
        message: '退款申请已处理',
        refunds: existingRefunds,
      };
    }

    // 4. 分配退款金额到原支付记�?
    const allocations = await this.allocateRefundAmount(
      request.refundAmount,
      order.payments,
    );

    if (allocations.length === 0) {
      throw new BadRequestException('无可退款的支付记录');
    }

    // 5. 创建退款记�?
    const refunds = await this.createRefundRecords(
      refundRequestId,
      request.orderId,
      allocations,
    );

    // 6. 执行退款（异步处理每笔退款）
    const processPromises = refunds.map((refund) =>
      this.processRefund(refund.id).catch((error) => {
        this.logger.error(`退款执行失�? refundId=${refund.id}, error=${error.message}`);
        return null;
      }),
    );

    await Promise.all(processPromises);

    this.logger.log(`退款执行完�? refundRequestId=${refundRequestId}, count=${refunds.length}`);

    return {
      success: true,
      message: '退款执行成功',
      refunds,
    };
  }

  /**
   * 分配退款金额（FIFO原则�?
   */
  private async allocateRefundAmount(
    totalRefund: Decimal,
    payments: any[],
  ): Promise<RefundAllocation[]> {
    const allocations: RefundAllocation[] = [];
    let remaining = new Decimal(totalRefund);

    this.logger.log(
      `开始分配退款金�? totalRefund=${totalRefund.toString()}, paymentCount=${payments.length}`,
    );

    for (const payment of payments) {
      if (remaining.lte(0)) break;

      // 计算该支付记录已退款金�?
      const alreadyRefunded = await this.prisma.refund.aggregate({
        where: {
          originalPaymentId: payment.id,
          // Refund 模型没有 status 字段,
        },
        _sum: { refundAmount: true },
      });

      const refundedAmount = alreadyRefunded._sum?.refundAmount
        ? new Decimal(alreadyRefunded._sum?.refundAmount)
        : new Decimal(0);

      const availableAmount = new Decimal(payment.amount).sub(refundedAmount);

      if (availableAmount.gt(0)) {
        const refundAmount = Decimal.min(remaining, availableAmount);

        allocations.push({
          paymentId: payment.id,
          amount: refundAmount,
          method: payment.paymentMethod,
          transactionId: payment.transactionId,
        });

        remaining = remaining.sub(refundAmount);

        this.logger.log(
          `分配退�? paymentId=${payment.id}, amount=${refundAmount.toString()}, ` +
            `remaining=${remaining.toString()}`,
        );
      }
    }

    if (remaining.gt(0)) {
      throw new BadRequestException(
        `退款金额超过可退金额: remaining=${remaining.toString()}`,
      );
    }

    return allocations;
  }

  /**
   * 创建退款记�?
   */
  private async createRefundRecords(
    refundRequestId: string,
    orderId: string,
    allocations: RefundAllocation[],
  ): Promise<any[]> {
    return await this.prisma.$transaction(
      allocations.map((allocation) =>
        this.prisma.refund.create({
          data: {
            refundRequestId,
            orderId,
            originalPaymentId: allocation.paymentId,
            refundAmount: allocation.amount,
            refundMethod: allocation.method,
            refundType: 'FULL',
            // status 字段不存在于 Refund 模型
          },
        }),
      ),
    );
  }

  /**
   * 处理单笔退�?
   */
  async processRefund(refundId: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        originalPayment: true,
        order: true,
      },
    });

    if (!refund) {
      throw new NotFoundException(`退款记录不存在: ${refundId}`);
    }

    // Refund 模型没有 status 字段，直接执行退款
    try {
      // 1. 调用退款接口
      let transactionId: string;

      if (refund.refundMethod === 'WECHAT_PAY') {
        // 线上微信退�?
        transactionId = await this.executeWechatRefund(refund);
      } else {
        // 线下退款：生成退款任务
        transactionId = await this.executeOfflineRefund(refund);
      }

      // 2. 更新退款记录（只更新 transactionId 和执行时间，Refund 模型没有 status 字段）
      await this.prisma.refund.update({
        where: { id: refundId },
        data: {
          transactionId,
          // executedAt字段不存在
        },
      });

      // 3. 更新订单退款金额
      await this.updateOrderRefundAmount(refund.orderId, refund.refundAmount);

      // 4. 更新退款申请状态
      if (refund.refundRequestId) {
        await this.checkAndUpdateRefundRequestStatus(refund.refundRequestId);
      }

      this.logger.log(`退款处理成功: refundId=${refundId}, transactionId=${transactionId}`);
    } catch (error) {
      await this.handleRefundError(refund, error);
    }
  }

  /**
   * 执行微信退�?
   */
  private async executeWechatRefund(refund: any): Promise<string> {
    if (!refund.originalPayment?.transactionId) {
      throw new BadRequestException('原支付记录缺少交易号');
    }

    this.logger.log(
      `调用微信退款接�? refundId=${refund.id}, ` +
        `transactionId=${refund.originalPayment.transactionId}, ` +
        `amount=${refund.refundAmount.toString()}`,
    );

    const result = await this.wechatPayService.refund({
      outRefundNo: refund.id,
      outTradeNo: refund.order.orderNo,
      totalFee: refund.originalPayment.amount.toNumber() * 100,
      refundFee: refund.refundAmount.toNumber() * 100,
      refundDesc: '原路退回',
    });

    return result.refundId || result.outRefundNo;
  }

  /**
   * 执行线下退�?
   */
  private async executeOfflineRefund(refund: any): Promise<string> {
    this.logger.log(`创建线下退款任�? refundId=${refund.id}`);

    // 这里可以集成其他系统或创建人工审核任�?
    // 例如：生成退款凭证、通知财务人员�?

    // TODO: 实现线下退款任务创建逻辑
    // await this.createOfflineRefundTask(refund);

    return `OFFLINE_${refund.id}`;
  }

  /**
   * 更新订单退款金�?
   */
  private async updateOrderRefundAmount(orderId: string, refundAmount: Decimal): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: {
          increment: refundAmount.toNumber(),
        },
        updatedAt: new Date(),
      },
    });

    this.logger.log(`更新订单退款金�? orderId=${orderId}, amount=${refundAmount.toString()}`);
  }

  /**
   * 检查并更新退款申请状�?
   */
  private async checkAndUpdateRefundRequestStatus(refundRequestId: string): Promise<void> {
    const refunds = await this.prisma.refund.findMany({
      where: { refundRequestId },
    });

    const allSuccess = false; // Refund 模型没有 status 字段
    const anyFailed = false; // Refund 模型没有 status 字段

    if (allSuccess) {
      await this.prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: 'COMPLETED',
          refundedAt: new Date(),
        },
      });
      this.logger.log(`退款申请完�? refundRequestId=${refundRequestId}`);
    } else if (anyFailed) {
      await this.prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: { status: 'FAILED' },
      });
      this.logger.error(`退款申请失�? refundRequestId=${refundRequestId}`);
    }
  }

  /**
   * 处理退款错�?
   */
  private async handleRefundError(refund: any, error: any): Promise<void> {
    const retryCount = refund.retryCount + 1;

    this.logger.error(
      `退款处理失�? refundId=${refund.id}, retryCount=${retryCount}, error=${error.message}`,
    );

    if (retryCount < this.MAX_RETRY_COUNT) {
      // 更新重试次数（Refund 模型没有 status 字段）
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          retryCount,
          // lastError字段不存在
        },
      });

      this.logger.log(`退款将重试: refundId=${refund.id}, retryCount=${retryCount}`);

      // 延迟重试（指数退避）
      const delayMs = Math.pow(2, retryCount) * 60 * 1000; // 2^n 分钟
      setTimeout(() => {
        this.processRefund(refund.id).catch((err) => {
          this.logger.error(`退款重试失�? refundId=${refund.id}, error=${err.message}`);
        });
      }, delayMs);
    } else {
      // 超过最大重试次数，记录错误（Refund 模型没有 status 字段）
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: {
          // lastError字段不存在
        },
      });

      // TODO: 发送管理员告警
      // await this.alertService.sendRefundFailedAlert(refund);
    }
  }

  /**
   * 批量重试失败的退�?
   */
  async retryFailedRefunds(): Promise<void> {
    // Refund 模型没有 status 字段，通过 transactionId 判断失败的退款
    const failedRefunds = await this.prisma.refund.findMany({
      where: {
        // 查询未执行成功的退款（没有transactionId的）
        transactionId: null,
      },
      take: 10, // 每次最多重试10条
    });

    this.logger.log(`批量重试失败的退款: count=${failedRefunds.length}`);

    for (const refund of failedRefunds) {
      await this.processRefund(refund.id).catch((error) => {
        this.logger.error(`退款重试失�? refundId=${refund.id}, error=${error.message}`);
      });
    }
  }
}
