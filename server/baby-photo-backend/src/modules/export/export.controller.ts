import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly exportService: ExportService) {}

  /**
   * 导出订单数据
   * GET /export/orders?startDate=2024-01-01&endDate=2024-12-31&orderStatus=CONFIRMED
   */
  @Get('orders')
  async exportOrders(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('userId') userId?: string,
    @Query('packageId') packageId?: string,
  ) {
    this.logger.log('导出订单请求');
    
    const query = {
      startDate,
      endDate,
      orderStatus,
      paymentStatus,
      userId,
      packageId,
    };
    
    return this.exportService.exportOrders(query, res);
  }

  /**
   * 导出用户数据
   * GET /export/users
   */
  @Get('users')
  async exportUsers(@Res() res: Response) {
    this.logger.log('导出用户请求');
    return this.exportService.exportUsers(res);
  }

  /**
   * 导出财务数据
   * GET /export/financial?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('financial')
  async exportFinancial(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    this.logger.log('导出财务请求');
    
    if (!startDate || !endDate) {
      res.status(400).json({
        statusCode: 400,
        message: '请提供开始日期和结束日期',
      });
      return;
    }
    
    return this.exportService.exportFinancial(startDate, endDate, res);
  }

  /**
   * 导出全部数据
   * GET /export/all
   */
  @Get('all')
  async exportAll(@Res() res: Response) {
    this.logger.log('导出全部数据请求');
    return this.exportService.exportAll(res);
  }
}
