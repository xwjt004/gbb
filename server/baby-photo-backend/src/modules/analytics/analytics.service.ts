import { Injectable, Logger } from '@nestjs/common';
import { UserAnalyticsService } from './services/user-analytics.service';
import { BehaviorAnalyticsService } from './services/behavior-analytics.service';
import { PackageAnalyticsService } from './services/package-analytics.service';
import { LoyaltyAnalyticsService } from './services/loyalty-analytics.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly userAnalyticsService: UserAnalyticsService,
    private readonly behaviorAnalyticsService: BehaviorAnalyticsService,
    private readonly packageAnalyticsService: PackageAnalyticsService,
    private readonly loyaltyAnalyticsService: LoyaltyAnalyticsService,
  ) {}

  /**
   * 获取用户分析数据
   */
  async getUserAnalytics(query: any) {
    try {
      return await this.userAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取用户分析数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取行为分析数据
   */
  async getBehaviorAnalytics(query: any) {
    try {
      return await this.behaviorAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取行为分析数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取套餐分析数据
   */
  async getPackageAnalytics(query: any) {
    try {
      return await this.packageAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取套餐分析数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取忠诚度分析数据
   */
  async getLoyaltyAnalytics(query: any) {
    try {
      return await this.loyaltyAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(
        `获取忠诚度分析数据失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 获取综合分析报告
   */
  async getOverviewAnalytics(query: any) {
    try {
      const [userStats, behaviorStats, packageStats, loyaltyStats] =
        await Promise.all([
          this.userAnalyticsService.getOverviewStats(query),
          this.behaviorAnalyticsService.getOverviewStats(query),
          this.packageAnalyticsService.getOverviewStats(query),
          this.loyaltyAnalyticsService.getOverviewStats(query),
        ]);

      return {
        code: 200,
        message: '获取成功',
        data: {
          user_analytics: userStats,
          behavior_analytics: behaviorStats,
          package_analytics: packageStats,
          loyalty_analytics: loyaltyStats,
          generated_at: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`获取综合分析报告失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 用户消费统计分析 - 使用通用分析方法
   */
  async getUserConsumptionStats(
    phone: string,
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const query = {
        type: 'consumption_stats',
        phone,
        startDate,
        endDate,
      };
      return await this.userAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取用户消费统计失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 套系热度分析 - 使用通用分析方法
   */
  async getPackagePopularityAnalysis(
    timeRange: string = 'month',
    paginationDto: any,
  ) {
    try {
      const query = {
        type: 'popularity_analysis',
        timeRange,
        ...paginationDto,
      };
      return await this.packageAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取套系热度分析失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 自定义关联分析 - 使用通用分析方法
   */
  async getCustomAnalytics(analyticsQuery: any, paginationDto: any) {
    try {
      const query = {
        type: 'custom_analytics',
        ...analyticsQuery,
        ...paginationDto,
      };
      return await this.behaviorAnalyticsService.getAnalytics(query);
    } catch (error) {
      this.logger.error(`获取自定义分析失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
