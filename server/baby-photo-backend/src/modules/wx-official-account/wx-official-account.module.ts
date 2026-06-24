import { Module } from '@nestjs/common';
import { WxOfficialAccountService } from './wx-official-account.service';
import { WxOfficialAccountController } from './wx-official-account.controller';
import { WxOfficialAccountOAuthController } from './wx-official-account-oauth.controller';
import { WxOfficialAccountMenuController } from './wx-official-account-menu.controller';
import { WxOfficialAccountNotifyController } from './wx-official-account-notify.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [
    WxOfficialAccountController,
    WxOfficialAccountOAuthController,
    WxOfficialAccountMenuController,
    WxOfficialAccountNotifyController,
  ],
  providers: [WxOfficialAccountService],
  exports: [WxOfficialAccountService],
})
export class WxOfficialAccountModule {}
