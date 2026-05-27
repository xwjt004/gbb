import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@Injectable()
export class PhotoPickReminderScheduler {
  private readonly logger = new Logger(PhotoPickReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 每日早 10:00 发送选片提醒（拍摄完成24小时后未选片的客户）
   */
  @Cron('0 10 * * *', { name: 'photo-pick-reminder', timeZone: 'Asia/Shanghai' })
  async handlePhotoPickReminders() {
    this.logger.log('开始定时任务：发送选片提醒');

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        orderStatus: 'COMPLETED',
        photoPickReminderSentAt: null,
        completedAt: { gte: sevenDaysAgo, lte: yesterday },
      },
      include: {
        wxUser: { select: { openid: true, phone: true, nickname: true } },
        package: { select: { name: true } },
      },
    });

    this.logger.log(`找到 ${orders.length} 个待发送选片提醒的订单`);

    for (const order of orders) {
      try {
        const content = `尊敬的客户，您的拍摄已完成，请尽快登录系统选择心仪的照片。套餐：${order.package?.name || '定制套系'}。`;

        await this.notificationsService.create({
          type: 'SYSTEM',
          title: '选片提醒',
          content,
          recipient: order.wxUser?.openid || order.wxUserId || '',
        });

        await this.prisma.order.update({
          where: { id: order.id },
          data: { photoPickReminderSentAt: new Date() },
        });

        this.logger.log(`选片提醒已发送: 订单 ${order.orderNo}`);
      } catch (err) {
        this.logger.error(`发送选片提醒失败: 订单 ${order.orderNo}`, err);
      }
    }
  }
}
