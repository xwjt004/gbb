import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { StatisticsAnalysisService } from './statistics-analysis.service';
import {
  TrendData,
  RevenueAnalysis,
  SuspiciousPayment,
  RefundAnalysis,
  DailyReconciliation,
  MissingVouchers,
  DashboardStats,
  RevenuePrediction,
  ComparativeAnalysis,
  ComprehensiveTrendData,
} from './dto/statistics-analysis.dto';

@ApiTags('统计分析')
@Controller('statistics-analysis')
export class StatisticsAnalysisController {
  constructor(
    private readonly statisticsAnalysisService: StatisticsAnalysisService,
  ) {}

  @Get('orders/trend')
  @ApiOperation({ summary: '订单趋势分析' })
  @ApiQuery({ name: 'period', description: '时间周期', enum: ['daily', 'weekly', 'monthly', 'yearly'] })
  @ApiQuery({ name: 'startDate', description: '开始日期', required: false })
  @ApiQuery({ name: 'endDate', description: '结束日期', required: false })
  @ApiResponse({ status: 200, description: '订单趋势数据' })
  async getOrderTrend(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TrendData[]> {
    return this.statisticsAnalysisService.getOrderTrend(period, startDate, endDate);
  }

  @Get('revenue/analysis')
  @ApiOperation({ summary: '收入分析' })
  @ApiQuery({ name: 'dimension', description: '分析维度', enum: ['time', 'package', 'user', 'channel'] })
  @ApiQuery({ name: 'period', description: '时间周期', required: false })
  @ApiResponse({ status: 200, description: '收入分析数据' })
  async getRevenueAnalysis(
    @Query('dimension') dimension: 'time' | 'package' | 'user' | 'channel',
    @Query('period') period?: string,
  ): Promise<RevenueAnalysis> {
    return this.statisticsAnalysisService.getRevenueAnalysis(dimension, period);
  }

  @Get('refunds/analysis')
  @ApiOperation({ summary: '退款分析' })
  @ApiQuery({ name: 'startDate', description: '开始日期', required: false })
  @ApiQuery({ name: 'endDate', description: '结束日期', required: false })
  @ApiResponse({ status: 200, description: '退款分析数据' })
  async getRefundAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<RefundAnalysis> {
    return this.statisticsAnalysisService.getRefundAnalysis(startDate, endDate);
  }

  @Get('payments/suspicious')
  @ApiOperation({ summary: '可疑支付检测' })
  @ApiQuery({ name: 'type', description: '检测类型', enum: ['duplicate', 'overpayment', 'system_error', 'all'] })
  @ApiResponse({ status: 200, description: '可疑支付记录' })
  async getSuspiciousPayments(
    @Query('type') type: 'duplicate' | 'overpayment' | 'system_error' | 'all' = 'all',
  ): Promise<SuspiciousPayment[]> {
    return this.statisticsAnalysisService.getSuspiciousPayments(type);
  }

  @Get('reconciliation/daily')
  @ApiOperation({ summary: '每日对账数据' })
  @ApiQuery({ name: 'date', description: '对账日期', required: false })
  @ApiQuery({ name: 'platform', description: '支付平台', required: false })
  @ApiResponse({ status: 200, description: '每日对账数据' })
  async getDailyReconciliation(
    @Query('date') date?: string,
    @Query('platform') platform?: string,
  ): Promise<DailyReconciliation> {
    return this.statisticsAnalysisService.getDailyReconciliation(date, platform);
  }

  @Get('reconciliation/range')
  @ApiOperation({ summary: '日期范围对账数据' })
  @ApiQuery({ name: 'startDate', description: '开始日期', required: false })
  @ApiQuery({ name: 'endDate', description: '结束日期', required: false })
  @ApiQuery({ name: 'platform', description: '支付平台', required: false })
  @ApiResponse({ status: 200, description: '日期范围对账数据' })
  async getReconciliationRange(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('platform') platform?: string,
  ) {
    return this.statisticsAnalysisService.getReconciliationRange(
      startDate,
      endDate,
      platform,
    );
  }

  @Get('vouchers/missing')
  @ApiOperation({ summary: '缺失凭证检查' })
  @ApiQuery({ name: 'startDate', description: '开始日期', required: false })
  @ApiQuery({ name: 'endDate', description: '结束日期', required: false })
  @ApiResponse({ status: 200, description: '缺失凭证列表' })
  async getMissingVouchers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<MissingVouchers> {
    return this.statisticsAnalysisService.getMissingVouchers(startDate, endDate);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: '仪表板统计数据' })
  @ApiResponse({ status: 200, description: '仪表板数据' })
  async getDashboardStats(): Promise<DashboardStats> {
    return this.statisticsAnalysisService.getDashboardStats();
  }

  @Get('predictions/revenue')
  @ApiOperation({ summary: '收入预测分析' })
  @ApiQuery({ name: 'period', description: '预测周期', enum: ['week', 'month', 'quarter'] })
  @ApiResponse({ status: 200, description: '收入预测数据' })
  async getRevenuePrediction(
    @Query('period') period: 'week' | 'month' | 'quarter' = 'month',
  ): Promise<RevenuePrediction> {
    return this.statisticsAnalysisService.getRevenuePrediction(period);
  }

  @Get('trends/comprehensive')
  @ApiOperation({ summary: '综合趋势数据（营收/订单量/客单价/转化率）' })
  @ApiQuery({ name: 'startDate', description: '开始日期', required: false })
  @ApiQuery({ name: 'endDate', description: '结束日期', required: false })
  @ApiResponse({ status: 200, description: '综合趋势数据' })
  async getComprehensiveTrends(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ComprehensiveTrendData[]> {
    return this.statisticsAnalysisService.getComprehensiveTrends(startDate, endDate);
  }

  @Get('comparative/analysis')
  @ApiOperation({ summary: '对比分析' })
  @ApiQuery({ name: 'current', description: '当前周期开始日期' })
  @ApiQuery({ name: 'previous', description: '对比周期开始日期' })
  @ApiQuery({ name: 'period', description: '周期长度(天)' })
  @ApiResponse({ status: 200, description: '对比分析数据' })
  async getComparativeAnalysis(
    @Query('current') current: string,
    @Query('previous') previous: string,
    @Query('period') period: number,
  ): Promise<ComparativeAnalysis> {
    return this.statisticsAnalysisService.getComparativeAnalysis(current, previous, period);
  }
}
