import { Module } from '@nestjs/common';
import { GroupBuyController } from './group-buy.controller';
import { GroupBuyService } from './group-buy.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WxAuthModule } from '../wx-auth/wx-auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WxAuthModule, PaymentsModule, NotificationsModule],
  controllers: [GroupBuyController],
  providers: [GroupBuyService],
  exports: [GroupBuyService],
})
export class GroupBuyModule {}
