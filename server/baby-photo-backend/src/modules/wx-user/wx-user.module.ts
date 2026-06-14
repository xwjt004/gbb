import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WxAuthModule } from '../wx-auth/wx-auth.module';
import { WxAddressModule } from '../wx-address/wx-address.module';
import { WxUserController } from './wx-user.controller';
import { WxUserService } from './wx-user.service';

@Module({
  imports: [PrismaModule, WxAuthModule, WxAddressModule],
  controllers: [WxUserController],
  providers: [WxUserService],
  exports: [WxUserService],
})
export class WxUserModule {}
