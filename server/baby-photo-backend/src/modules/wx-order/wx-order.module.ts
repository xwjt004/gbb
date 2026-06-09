import { Module } from '@nestjs/common';
import { WxOrderService } from './wx-order.service';
import { WxOrderController } from './wx-order.controller';
import { WxOrderPayController } from './wx-order-pay.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  providers: [WxOrderService],
  controllers: [WxOrderController, WxOrderPayController],
  exports: [WxOrderService],
})
export class WxOrderModule {}
