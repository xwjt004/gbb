import { Module } from '@nestjs/common';
import { GroupBuyController } from './group-buy.controller';
import { GroupBuyService } from './group-buy.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WxAuthModule } from '../wx-auth/wx-auth.module';

@Module({
  imports: [PrismaModule, WxAuthModule],
  controllers: [GroupBuyController],
  providers: [GroupBuyService],
  exports: [GroupBuyService],
})
export class GroupBuyModule {}
