import { Module } from '@nestjs/common';
import { WxCartService } from './wx-cart.service';
import { WxCartController } from './wx-cart.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WxCartService],
  controllers: [WxCartController],
  exports: [WxCartService],
})
export class WxCartModule {}
