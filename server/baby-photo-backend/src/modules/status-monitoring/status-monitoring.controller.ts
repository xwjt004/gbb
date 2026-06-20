import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { StatusMonitoringService } from './status-monitoring.service';

@ApiTags('状态监控')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('status-monitoring')
export class StatusMonitoringController {
  constructor(
    private readonly statusMonitoringService: StatusMonitoringService,
  ) {}

  @Get('status-distribution')
  @ApiOperation({ summary: '获取状态组合分布' })
  @ApiResponse({ status: 200, description: '状态分布数据' })
  async getStatusDistribution() {
    return this.statusMonitoringService.getStatusDistribution();
  }

  @Get('status-transitions')
  @ApiOperation({ summary: '获取状态转换统计' })
  @ApiQuery({ name: 'days', required: false, description: '统计天数', example: 7 })
  @ApiResponse({ status: 200, description: '状态转换统计' })
  async getStatusTransitions(@Query('days') days: string = '7') {
    const daysNum = parseInt(days, 10);
    return this.statusMonitoringService.getStatusTransitionStats(daysNum);
  }

  @Get('abnormal-orders')
  @ApiOperation({ summary: '获取异常状态订单' })
  @ApiResponse({ status: 200, description: '异常订单列表' })
  async getAbnormalOrders() {
    return this.statusMonitoringService.getAbnormalOrders();
  }

  @Get('status-timeline')
  @ApiOperation({ summary: '获取状态变化时间线' })
  @ApiQuery({ name: 'orderId', required: true, description: '订单ID' })
  @ApiResponse({ status: 200, description: '状态变化时间线' })
  async getStatusTimeline(@Query('orderId') orderId: string) {
    return this.statusMonitoringService.getOrderStatusTimeline(orderId);
  }

  @Get('dashboard-stats')
  @ApiOperation({ summary: '获取监控仪表板统计数据' })
  @ApiResponse({ status: 200, description: '仪表板数据' })
  async getDashboardStats() {
    return this.statusMonitoringService.getDashboardStats();
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取状态告警信息' })
  @ApiResponse({ status: 200, description: '告警列表' })
  async getAlerts() {
    return this.statusMonitoringService.getStatusAlerts();
  }
}
