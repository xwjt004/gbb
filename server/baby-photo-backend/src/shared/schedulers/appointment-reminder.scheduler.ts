import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@Injectable()
export class AppointmentReminderScheduler {
  private readonly logger = new Logger(AppointmentReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 每日早 9:00 发送次日预约提醒
   */
  @Cron('0 9 * * *', { name: 'appointment-reminder', timeZone: 'Asia/Shanghai' })
  async handleAppointmentReminders() {
    this.logger.log('开始定时任务：发送预约提醒');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        appointmentDate: { gte: tomorrowStart, lte: tomorrowEnd },
        reminderSentAt: null,
        orderStatus: { in: ['CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        wxUser: { select: { openid: true, phone: true, nickname: true } },
        package: { select: { name: true } },
        timeSlot: { select: { startTime: true, endTime: true } },
      },
    });

    this.logger.log(`找到 ${orders.length} 个待提醒订单`);

    for (const order of orders) {
      try {
        const timeStr = order.timeSlot
          ? `${order.timeSlot.startTime.toISOString().slice(11, 16)}-${order.timeSlot.endTime.toISOString().slice(11, 16)}`
          : '--:--';

        const content = `尊敬的客户，您的宝贝拍摄预约将于明天 ${timeStr} 进行，套餐：${order.package?.name || '定制套系'}，请提前做好安排。`;

        await this.notificationsService.create({
          type: 'SYSTEM',
          title: '拍摄预约提醒',
          content,
          recipient: order.wxUser?.openid || order.wxUserId || '',
        });

        await this.prisma.order.update({
          where: { id: order.id },
          data: { reminderSentAt: new Date() },
        });

        this.logger.log(`提醒已发送: 订单 ${order.orderNo}`);
      } catch (err) {
        this.logger.error(`发送提醒失败: 订单 ${order.orderNo}`, err);
      }
    }
  }
}
