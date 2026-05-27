import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { OrderStatus } from '../../shared/enums/status.enum';

export type PaymentState = 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';

interface StateTransition {
  to: PaymentState[];
}

interface StateConfig {
  [key: string]: StateTransition;
  CREATED: StateTransition;
  PAID: StateTransition;
  FAILED: StateTransition;
  REFUNDED: StateTransition;
}

@Injectable()
export class PaymentStateMachineService {
  private readonly logger = new Logger(PaymentStateMachineService.name);
  private readonly states: StateConfig = {
    CREATED: { to: ['PAID', 'FAILED'] },
    PAID: { to: ['REFUNDED'] },
    FAILED: { to: ['CREATED'] },
    REFUNDED: { to: [] },
  };

  constructor(private readonly prisma: PrismaService) {}

  async transition(
    paymentId: string,
    fromState: PaymentState,
    toState: PaymentState,
  ): Promise<void> {
    if (!this.canTransition(fromState, toState)) {
      throw new BadRequestException(
        `Invalid state transition from ${fromState} to ${toState}`,
      );
    }

    try {
      // 开始事务
      await this.prisma.$transaction(async (tx) => {
        // 更新支付状态
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: {
          status: toState as any,
          ...((toState as string) === 'FULLY_PAID' ? { paidAt: new Date() } : {}),
          },
        });

        // 如果支付成功，更新订单已支付金额和支付状态
        if ((toState as string) === 'FULLY_PAID') {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId },
            select: { paidAmount: true, totalAmount: true },
          });

          if (order) {
            const newPaidAmount =
              Number(order.paidAmount) + Number(payment.amount);
            const paymentStatus =
              newPaidAmount >= Number(order.totalAmount)
                ? 'FULLY_PAID'
                : 'PARTIAL_PAID';

            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                paidAmount: newPaidAmount,
                paymentStatus: paymentStatus as any,
                orderStatus: (paymentStatus === 'FULLY_PAID' ? OrderStatus.CONFIRMED : OrderStatus.PENDING) as any,
              },
            });
          }
        }

        this.logger.log(
          `Payment ${paymentId} transitioned from ${fromState} to ${toState}`,
        );
      });
    } catch (error) {
      this.logger.error(`Payment transition error: ${error.message}`);
      throw new Error('支付状态更新失败');
    }
  }

  private canTransition(
    fromState: PaymentState,
    toState: PaymentState,
  ): boolean {
    return this.states[fromState]?.to.includes(toState) || false;
  }
}
