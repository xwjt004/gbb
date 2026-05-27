import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('数据分析')
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取用户分析数据
   */
  @Get('users')
  @ApiOperation({ summary: '获取用户分析数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserAnalytics(@Query() query: any) {
    this.logger.log(`获取用户分析数据: ${JSON.stringify(query)}`);
    return await this.analyticsService.getUserAnalytics(query);
  }

  /**
   * 获取行为分析数据
   */
  @Get('behavior')
  @ApiOperation({ summary: '获取行为分析数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getBehaviorAnalytics(@Query() query: any) {
    this.logger.log(`获取行为分析数据: ${JSON.stringify(query)}`);
    return await this.analyticsService.getBehaviorAnalytics(query);
  }

  /**
   * 获取套餐分析数据
   */
  @Get('packages')
  @ApiOperation({ summary: '获取套餐分析数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPackageAnalytics(@Query() query: any) {
    this.logger.log(`获取套餐分析数据: ${JSON.stringify(query)}`);
    return await this.analyticsService.getPackageAnalytics(query);
  }

  /**
   * 获取忠诚度分析数据
   */
  @Get('loyalty')
  @ApiOperation({ summary: '获取忠诚度分析数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getLoyaltyAnalytics(@Query() query: any) {
    this.logger.log(`获取忠诚度分析数据: ${JSON.stringify(query)}`);
    return await this.analyticsService.getLoyaltyAnalytics(query);
  }

  /**
   * 获取综合分析报告
   */
  @Get('overview')
  @ApiOperation({ summary: '获取综合分析报告' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOverviewAnalytics(@Query() query: any) {
    this.logger.log(`获取综合分析报告: ${JSON.stringify(query)}`);
    return await this.analyticsService.getOverviewAnalytics(query);
  }
}
