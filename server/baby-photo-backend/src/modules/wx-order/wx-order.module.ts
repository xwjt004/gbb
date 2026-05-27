import { Module } from '@nestjs/common';
import { WxOrderService } from './wx-order.service';
import { WxOrderController } from './wx-order.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WxOrderService],
  controllers: [WxOrderController],
  exports: [WxOrderService],
})
export class WxOrderModule {}
