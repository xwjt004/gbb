import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';
import { formatLocalDate } from '../../../shared/utils/date.util';

@Injectable()
export class PackageAnalyticsService {
  private readonly logger = new Logger(PackageAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取套餐分析数据
   */
  async getAnalytics(query: any) {
    const { startDate, endDate } = query;

    try {
      const cacheKey = this.cacheService.getAnalyticsCacheKey(
        'package',
        `${startDate}-${endDate}`,
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const where = this.buildDateFilter(startDate, endDate);

          const [popularPackages, packageRevenue, packageTrends] =
            await Promise.all([
              this.getPopularPackages(where),
              this.getPackageRevenue(where),
              this.getPackageTrends(where),
            ]);

          return {
            code: 200,
            message: '获取成功',
            data: {
              popular_packages: popularPackages,
              package_revenue: packageRevenue,
              package_trends: packageTrends,
              period: { start_date: startDate, end_date: endDate },
            },
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      this.logger.error(`获取套餐分析数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStats(query: any) {
    const { startDate, endDate } = query;
    const where = this.buildDateFilter(startDate, endDate);

    const [totalPackages, mostPopular] = await Promise.all([
      this.prisma.package.count(),
      this.getMostPopularPackage(where),
    ]);

    return {
      total_packages: totalPackages,
      most_popular_package: mostPopular,
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

  private async getPopularPackages(where: any) {
    const result = await this.prisma.order.groupBy({
      by: ['packageId'],
      _count: true,
      _sum: {
        totalAmount: true,
      },
      where,
      orderBy: {
        _count: {
          packageId: 'desc',
        },
      },
      take: 10,
    });

    const packageIds = result.map((item) => item.packageId).filter((id): id is number => id !== null);
    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
    });

    return result.map((item) => {
      const pkg = packages.find((p) => p.id === item.packageId);
      return {
        package_id: item.packageId,
        package_name: pkg?.name || 'Unknown',
        order_count: item._count,
        total_revenue: Number(item._sum?.totalAmount || 0),
      };
    });
  }

  private async getPackageRevenue(where: any) {
    const result = await this.prisma.order.groupBy({
      by: ['packageId'],
      _sum: {
        paidAmount: true,
      },
      where,
      orderBy: {
        _sum: {
          paidAmount: 'desc',
        },
      },
    });

    const packageIds = result.map((item) => item.packageId).filter((id): id is number => id !== null);
    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
    });

    return result.map((item) => {
      const pkg = packages.find((p) => p.id === item.packageId);
      return {
        package_id: item.packageId,
        package_name: pkg?.name || 'Unknown',
        revenue: Number(item._sum?.paidAmount || 0),
      };
    });
  }

  private async getPackageTrends(where: any) {
    // 按日期和套餐分组统计趋势
    const result = await this.prisma.order.groupBy({
      by: ['packageId', 'createdAt'],
      _count: true,
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return result.map((item) => ({
      package_id: item.packageId,
      date: formatLocalDate(item.createdAt),
      order_count: item._count,
    }));
  }

  private async getMostPopularPackage(where: any) {
    const result = await this.prisma.order.groupBy({
      by: ['packageId'],
      _count: true,
      where,
      orderBy: {
        _count: {
          packageId: 'desc',
        },
      },
      take: 1,
    });

    if (result.length === 0 || result[0].packageId === null) return null;

    const pkg = await this.prisma.package.findUnique({
      where: { id: result[0].packageId },
    });

    return {
      package_id: result[0].packageId,
      package_name: pkg?.name || 'Unknown',
      order_count: result[0]._count,
    };
  }
}
