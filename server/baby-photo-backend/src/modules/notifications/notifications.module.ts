import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TemplatesService } from './templates.service';
import { EmailService } from './email.service';
import { WechatNotificationService } from './wechat.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TemplatesService, EmailService, WechatNotificationService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
