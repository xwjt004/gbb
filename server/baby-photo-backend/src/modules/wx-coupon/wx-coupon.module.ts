import { Module } from '@nestjs/common';
import { WxCouponService } from './wx-coupon.service';
import { WxCouponController } from './wx-coupon.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WxCouponService],
  controllers: [WxCouponController],
  exports: [WxCouponService],
})
export class WxCouponModule {}

