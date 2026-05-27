import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';

@Injectable()
export class LoyaltyAnalyticsService {
  private readonly logger = new Logger(LoyaltyAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取忠诚度分析数据
   */
  async getAnalytics(query: any) {
    const { startDate, endDate } = query;

    try {
      const cacheKey = this.cacheService.getAnalyticsCacheKey(
        'loyalty',
        `${startDate}-${endDate}`,
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const [customerSegmentation, repeatCustomers, loyaltyTrends] =
            await Promise.all([
              this.getCustomerSegmentation(),
              this.getRepeatCustomers(startDate, endDate),
              this.getLoyaltyTrends(startDate, endDate),
            ]);

          return {
            code: 200,
            message: '获取成功',
            data: {
              customer_segmentation: customerSegmentation,
              repeat_customers: repeatCustomers,
              loyalty_trends: loyaltyTrends,
              period: { start_date: startDate, end_date: endDate },
            },
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      this.logger.error(
        `获取忠诚度分析数据失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStats(query: any) {
    // 记录查询参数以便后续扩展
    this.logger.debug(
      `获取忠诚度概览统计数据，查询参数: ${JSON.stringify(query)}`,
    );

    const [totalCustomers, repeatCustomerCount] = await Promise.all([
      this.prisma.user.count(),
      this.getRepeatCustomerCount(),
    ]);

    return {
      total_customers: totalCustomers,
      repeat_customer_count: repeatCustomerCount,
      loyalty_rate:
        totalCustomers > 0 ? (repeatCustomerCount / totalCustomers) * 100 : 0,
    };
  }

  // 私有方法

  private async getCustomerSegmentation() {
    // 根据订单数量和消费金额对客户进行分段
    const result = await this.prisma.user.findMany({
      include: {
        orders: {
          include: {
            payments: {
              where: { status: 'FULLY_PAID' },
            },
          },
        },
      },
    });

    const segmentation = {
      vip: 0, // >= 10订单 && >= 5000元
      gold: 0, // >= 5订单 && >= 2000元
      silver: 0, // >= 2订单 && >= 500元
      regular: 0, // >= 1订单
      new: 0, // 0订单
    };

    result.forEach((user) => {
      const orderCount = user.orders.length;
      const totalSpent = user.orders.reduce((sum, order) => {
        const paidAmount = order.payments.reduce(
          (paySum, payment) => paySum + Number(payment.amount),
          0,
        );
        return sum + paidAmount;
      }, 0);

      if (orderCount >= 10 && totalSpent >= 5000) {
        segmentation.vip++;
      } else if (orderCount >= 5 && totalSpent >= 2000) {
        segmentation.gold++;
      } else if (orderCount >= 2 && totalSpent >= 500) {
        segmentation.silver++;
      } else if (orderCount >= 1) {
        segmentation.regular++;
      } else {
        segmentation.new++;
      }
    });

    return segmentation;
  }

  private async getRepeatCustomers(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const repeatCustomers = await this.prisma.user.findMany({
      where: {
        orders: {
          some: where,
        },
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return repeatCustomers
      .filter((user) => user._count?.orders > 1)
      .map((user) => ({
        user_id: user.openid,
        nickname: user.nickname,
        order_count: user._count?.orders,
      }));
  }

  private async getRepeatCustomerCount() {
    const result = await this.prisma.user.findMany({
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return result.filter((user) => user._count?.orders > 1).length;
  }

  private async getLoyaltyTrends(startDate?: string, endDate?: string) {
    // 按月统计复购率趋势
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 这里简化实现，实际可以按月分组计算复购率
    const totalCustomers = await this.prisma.user.count();
    const repeatCustomers = await this.getRepeatCustomerCount();

    return [
      {
        period: '本月',
        total_customers: totalCustomers,
        repeat_customers: repeatCustomers,
        loyalty_rate:
          totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
      },
    ];
  }
}
