import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { WechatPayService } from './wechat-pay.service';
import { AlipayService } from './services/alipay.service';
import { PaymentNotificationService } from './services/payment-notification.service';
import { AutoStatusTransitionService } from '../../shared/services/auto-status-transition.service';
import { StatusChangeLogService } from '../../shared/services/status-change-log.service';
import { ReconciliationTask } from './tasks/reconciliation.task';
import { PaymentReconciliationScheduler } from './tasks/payment-reconciliation.scheduler';
import { PaymentMetadataController } from '../../payment/payment-metadata.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [PaymentsController, PaymentMetadataController],
  providers: [
  PaymentsService,
  WechatPayService,
  AlipayService,
    PaymentNotificationService,
    AutoStatusTransitionService,
    StatusChangeLogService,
    ReconciliationTask, // 对账定时任务
    PaymentReconciliationScheduler, // 支付状态对账定时任务
  ],
  exports: [PaymentsService, WechatPayService, AlipayService],
})
export class PaymentsModule {}
