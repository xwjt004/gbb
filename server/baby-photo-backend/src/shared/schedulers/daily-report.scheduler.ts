import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@Injectable()
export class DailyReportScheduler {
  private readonly logger = new Logger(DailyReportScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 每日早 8:00 发送经营日报
   */
  @Cron('0 8 * * *', { name: 'daily-report', timeZone: 'Asia/Shanghai' })
  async handleDailyReport() {
    this.logger.log('开始生成经营日报');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayStart = new Date(yesterday);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(yesterday);
      dayEnd.setHours(23, 59, 59, 999);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 昨日订单统计
      const [orderAgg, paidCount, newUsers] = await Promise.all([
        this.prisma.order.aggregate({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
          _count: { id: true },
          _sum: { totalAmount: true, paidAmount: true },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            paymentStatus: { in: ['FULLY_PAID', 'PARTIAL_PAID'] },
          },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: dayStart, lte: dayEnd } },
        }),
      ]);

      // 本月累计
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthAgg = await this.prisma.order.aggregate({
        where: { createdAt: { gte: monthStart, lte: todayStart } },
        _sum: { paidAmount: true },
      });

      // 昨日完成订单数（用于选片提醒参考）
      const completedOrders = await this.prisma.order.count({
        where: {
          completedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      // 昨日新增预约数
      const newAppointments = await this.prisma.order.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          orderStatus: 'CONFIRMED',
        },
      });

      const orders = orderAgg._count.id;
      const revenue = Number(orderAgg._sum.totalAmount || 0);
      const paidAmount = Number(orderAgg._sum.paidAmount || 0);
      const monthRevenue = Number(monthAgg._sum.paidAmount || 0);

      const content = [
        `📊 经营日报 ${yesterday.toLocaleDateString('zh-CN')}`,
        ``,
        `📦 新增订单: ${orders} 单`,
        `✅ 已付款: ${paidCount} 单`,
        `💰 昨日营收: ¥${revenue.toFixed(2)}`,
        `💳 实收金额: ¥${paidAmount.toFixed(2)}`,
        `📸 完成拍摄: ${completedOrders} 单`,
        `📅 新增预约: ${newAppointments} 单`,
        `👤 新增用户: ${newUsers} 人`,
        ``,
        `📈 本月累计实收: ¥${monthRevenue.toFixed(2)}`,
      ].join('\n');

      // 发送给有角色的管理用户
      const adminUsers = await this.prisma.user.findMany({
        where: { roleId: { not: null }, status: 'ACTIVE' },
        select: { openid: true },
      });

      for (const user of adminUsers) {
        await this.notificationsService.create({
          type: 'SYSTEM',
          title: '经营日报',
          content,
          recipient: user.openid,
        });
      }

      this.logger.log(`经营日报已发送给 ${adminUsers.length} 个管理用户`);
    } catch (error) {
      this.logger.error('生成经营日报失败', error);
    }
  }
}
