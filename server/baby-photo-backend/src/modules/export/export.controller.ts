import { Controller, Get, Query, Res, Logger, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { ExportService } from './export.service';

@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
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

  /**
   * 导出套系数据
   * GET /export/packages
   */
  @Get('packages')
  async exportPackages(@Res() res: Response) {
    this.logger.log('导出套系请求');
    return this.exportService.exportPackages(res);
  }

  /**
   * 导出商品数据
   * GET /export/products
   */
  @Get('products')
  async exportProducts(@Res() res: Response) {
    this.logger.log('导出商品请求');
    return this.exportService.exportProducts(res);
  }

  /**
   * 导出服务项目数据
   * GET /export/service-items
   */
  @Get('service-items')
  async exportServiceItems(@Res() res: Response) {
    this.logger.log('导出服务项目请求');
    return this.exportService.exportServiceItems(res);
  }

  /**
   * 导出顾客数据
   * GET /export/customers
   */
  @Get('customers')
  async exportCustomers(@Res() res: Response) {
    this.logger.log('导出顾客请求');
    return this.exportService.exportCustomers(res);
  }

  /**
   * 导出团购数据
   * GET /export/group-buys
   */
  @Get('group-buys')
  async exportGroupBuys(@Res() res: Response) {
    this.logger.log('导出团购请求');
    return this.exportService.exportGroupBuys(res);
  }

  /**
   * 导出积分/优惠券数据
   * GET /export/points
   */
  @Get('points')
  async exportPoints(@Res() res: Response) {
    this.logger.log('导出积分/优惠券请求');
    return this.exportService.exportPoints(res);
  }

  /**
   * 导出拍摄日程数据
   * GET /export/time-slots
   */
  @Get('time-slots')
  async exportTimeSlots(@Res() res: Response) {
    this.logger.log('导出拍摄日程请求');
    return this.exportService.exportTimeSlots(res);
  }

  /**
   * 导出退款数据
   * GET /export/refunds
   */
  @Get('refunds')
  async exportRefunds(@Res() res: Response) {
    this.logger.log('导出退款请求');
    return this.exportService.exportRefunds(res);
  }

  /**
   * 导出采购订单数据
   * GET /export/purchase-orders
   */
  @Get('purchase-orders')
  async exportPurchaseOrders(@Res() res: Response) {
    this.logger.log('导出采购订单请求');
    return this.exportService.exportPurchaseOrders(res);
  }

  /**
   * 导出库存商品数据
   * GET /export/stock-items
   */
  @Get('stock-items')
  async exportStockItems(@Res() res: Response) {
    this.logger.log('导出库存商品请求');
    return this.exportService.exportStockItems(res);
  }

  /**
   * 导出供应商数据
   * GET /export/suppliers
   */
  @Get('suppliers')
  async exportSuppliers(@Res() res: Response) {
    this.logger.log('导出供应商请求');
    return this.exportService.exportSuppliers(res);
  }

  /**
   * 导出在途商品数据
   * GET /export/in-transit
   */
  @Get('in-transit')
  async exportInTransit(@Res() res: Response) {
    this.logger.log('导出在途商品请求');
    return this.exportService.exportInTransit(res);
  }

  /**
   * 导出入库记录数据
   * GET /export/inbound
   */
  @Get('inbound')
  async exportInbound(@Res() res: Response) {
    this.logger.log('导出入库记录请求');
    return this.exportService.exportInbound(res);
  }
}
