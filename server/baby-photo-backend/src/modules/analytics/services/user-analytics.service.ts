import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { formatLocalDate } from '../../../shared/utils/date.util';

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取用户分析数据
   */
  async getAnalytics(query: any) {
    const { startDate, endDate } = query;

    try {
      const cacheKey = this.cacheService.getAnalyticsCacheKey(
        'user',
        `${startDate}-${endDate}`,
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const where = this.buildDateFilter(startDate, endDate);

          const [totalUsers, newUsers, activeUsers, userGrowth] =
            await Promise.all([
              this.getTotalUsers(where),
              this.getNewUsers(where),
              this.getActiveUsers(where),
              this.getUserGrowth(where),
            ]);

          return {
            code: 200,
            message: '获取成功',
            data: {
              total_users: totalUsers,
              new_users: newUsers,
              active_users: activeUsers,
              user_growth: userGrowth,
              period: { start_date: startDate, end_date: endDate },
            },
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      this.logger.error(`获取用户分析数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStats(query: any) {
    const { startDate, endDate } = query;
    const where = this.buildDateFilter(startDate, endDate);

    const [totalUsers, newUsers] = await Promise.all([
      this.getTotalUsers({}),
      this.getNewUsers(where),
    ]);

    return {
      total_users: totalUsers,
      new_users_period: newUsers,
    };
  }

  // 私有方法

  private buildDateFilter(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    return where;
  }

  private async getTotalUsers(where: any) {
    return await this.prisma.user.count({ where });
  }

  private async getNewUsers(where: any) {
    return await this.prisma.user.count({ where });
  }

  private async getActiveUsers(where: any) {
    // 获取在指定期间有订单活动的用户数
    return await this.prisma.user.count({
      where: {
        orders: {
          some: where.createdAt ? { createdAt: where.createdAt } : {},
        },
      },
    });
  }

  private async getUserGrowth(where: any) {
    // 按日期分组统计用户增长
    const result = await this.prisma.user.groupBy({
      by: ['createdAt'],
      _count: true,
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return result.map((item) => ({
      date: formatLocalDate(item.createdAt),
      count: item._count,
    }));
  }
}
