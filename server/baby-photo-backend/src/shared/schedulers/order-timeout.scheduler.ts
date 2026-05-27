import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutoStatusTransitionService } from '../services/auto-status-transition.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderTimeoutScheduler {
  private readonly logger = new Logger(OrderTimeoutScheduler.name);

  constructor(
    private readonly autoStatusTransitionService: AutoStatusTransitionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 每小时检查一次超时订单
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTimeoutOrders() {
    this.logger.log('开始检查超时订单...');
    
    try {
      await this.autoStatusTransitionService.processTimeoutOrders();
      this.logger.log('超时订单检查完成');
    } catch (error) {
      this.logger.error(`检查超时订单失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 每天凌晨2点检查并处理预约时间到达的订单
   */
  @Cron('0 2 * * *')
  async handleAppointmentTimeReached() {
    this.logger.log('开始检查预约时间到达的订单...');
    
    try {
      // 这里可以添加逻辑来查找今天有预约的订单
      // 并触发相应的状态转换
      this.logger.log('预约时间检查完成');
    } catch (error) {
      this.logger.error(`检查预约时间失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 每天凌晨1点生成状态转换统计报告
   */
  @Cron('0 1 * * *')
  async generateDailyReport() {
    this.logger.log('开始生成状态转换日报...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await this.autoStatusTransitionService.getAutoTransitionStats(
        yesterday,
        today
      );

      this.logger.log(`昨日自动状态转换统计: ${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      this.logger.error(`生成日报失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 每日凌晨 2:30 自动释放过期未签到订单的时间槽
   */
  @Cron('30 2 * * *', { name: 'auto-release-no-show', timeZone: 'Asia/Shanghai' })
  async handleAutoReleaseNoShow() {
    this.logger.log('开始自动释放未签到时间槽...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const noShowOrders = await this.prisma.order.findMany({
      where: {
        appointmentDate: { gte: yesterday, lt: today },
        checkinStatus: 'PENDING',
        orderStatus: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      include: { timeSlot: true },
    });

    for (const order of noShowOrders) {
      try {
        if (order.timeSlot && order.timeSlotId) {
          const ts = order.timeSlot;
          const newBooked = Math.max(0, ts.bookedCount - 1);
          await this.prisma.timeSlot.update({
            where: { id: order.timeSlotId },
            data: {
              bookedCount: newBooked,
              availableCount: Math.max(0, ts.capacity - newBooked),
              isBooked: newBooked > 0,
            },
          });
        }

        await this.prisma.order.update({
          where: { id: order.id },
          data: { checkinStatus: 'NO_SHOW', checkinTime: null },
        });

        this.logger.log(`自动释放: ${order.orderNo}`);
      } catch (err) {
        this.logger.error(`释放失败 ${order.orderNo}`, err);
      }
    }

    this.logger.log(`自动释放完成: ${noShowOrders.length} 个订单`);
  }
}
