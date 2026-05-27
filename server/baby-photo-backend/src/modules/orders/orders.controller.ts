import { Controller, Get, Post, Body, Param, Patch, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CheckinDto } from './dto/checkin.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { ChangePackageDto } from './dto/change-package.dto';

@ApiTags('订单管理')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '用户、套餐或时间槽不存在' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有订单' })
  @ApiResponse({ status: 200, description: '成功获取订单列表' })
  async findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query() searchParams: any) {
    const result = await this.ordersService.findAll({
      page: Number(page),
      pageSize: Number(pageSize),
      ...searchParams,
    });
    return {
      success: true,
      data: result,
    };
  }

  @Get('schedule-board')
  @ApiOperation({ summary: '获取拍摄日程看板（按时间段分组）' })
  async getScheduleBoard(
    @Query('date') date: string,
    @Query('photographerId') photographerId?: string,
  ) {
    const pid = photographerId ? parseInt(photographerId, 10) : undefined;
    const result = await this.ordersService.getScheduleBoard(date, pid);
    return { success: true, data: result };
  }

  @Get('schedule-board/range')
  @ApiOperation({ summary: '获取拍摄日程看板（日期范围，按时间段分组）' })
  async getScheduleBoardRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('photographerId') photographerId?: string,
  ) {
    const pid = photographerId ? parseInt(photographerId, 10) : undefined;
    const result = await this.ordersService.getScheduleBoardRange(startDate, endDate, pid);
    return { success: true, data: result };
  }

  @Patch(':id/assign-photographer')
  @ApiOperation({ summary: '分配摄影师' })
  async assignPhotographer(
    @Param('id') id: string,
    @Body('photographerId') photographerId: number,
  ) {
    return this.ordersService.assignPhotographer(id, Number(photographerId));
  }

  @Post('batch-assign-photographer')
  @ApiOperation({ summary: '批量分配摄影师' })
  async batchAssignPhotographer(
    @Body('orderIds') orderIds: string[],
    @Body('photographerId') photographerId: number,
  ) {
    const pid = Number(photographerId);
    return this.ordersService.batchAssignPhotographer(orderIds, pid);
  }

  @Patch(':id/reschedule')
  @ApiOperation({ summary: '调整预约时间' })
  async rescheduleOrder(
    @Param('id') id: string,
    @Body('timeSlotId') timeSlotId: number,
  ) {
    return this.ordersService.rescheduleOrder(id, Number(timeSlotId));
  }

  @Get('stats')
  @ApiOperation({ summary: '获取订单统计信息' })
  @ApiResponse({ status: 200, description: '成功获取订单统计' })
  async getStats() {
    const result = await this.ordersService.getStats();
    return {
      success: true,
      data: result,
    };
  }

  @Get('trends')
  @ApiOperation({ summary: '获取订单历史趋势数据' })
  @ApiResponse({ status: 200, description: '成功获取订单历史趋势' })
  async getOrderTrends(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.ordersService.getOrderTrends(period, startDate, endDate);
    return {
      success: true,
      data: result,
    };
  }

  @Get('future-trends')
  @ApiOperation({ summary: '获取未来订单趋势数据(基于预约)' })
  @ApiResponse({ status: 200, description: '成功获取未来订单趋势' })
  async getFutureOrderTrends(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.ordersService.getFutureOrderTrends(period, startDate, endDate);
    return {
      success: true,
      data: result,
    };
  }

  @Get('cashflow-trends')
  @ApiOperation({ summary: '获取订单资金流趋势数据' })
  @ApiResponse({ status: 200, description: '成功获取订单资金流趋势' })
  async getCashFlowTrends(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const result = await this.ordersService.getCashFlowTrends(startDate, endDate);
    return {
      success: true,
      data: result,
    };
  }

  @Get('user/:userOpenid')
  @ApiOperation({ summary: '根据用户openid获取订单' })
  @ApiParam({ name: 'userOpenid', description: '用户openid' })
  @ApiResponse({ status: 200, description: '成功获取用户订单' })
  findByUserOpenid(@Param('userOpenid') userOpenid: string) {
    return this.ordersService.findByUserOpenid(userOpenid);
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: '根据电话号码获取订单' })
  @ApiParam({ name: 'phone', description: '电话号码' })
  @ApiResponse({ status: 200, description: '成功获取用户订单' })
  @ApiResponse({ status: 404, description: '用户不存在或无订单' })
  findByPhone(@Param('phone') phone: string) {
    return this.ordersService.findByPhone(phone);
  }

  @Get('payment-status/:status')
  @ApiOperation({ summary: '根据支付状态获取订单统计' })
  @ApiParam({
    name: 'status',
    description: '支付状态 (CREATED, PENDING, PAID, FAILED, REFUNDED)',
  })
  @ApiResponse({ status: 200, description: '成功获取订单统计列表' })
  findByPaymentStatus(@Param('status') status: string) {
    return this.ordersService.findByPaymentStatus(status);
  }

  @Get('order-no/:orderNo')
  @ApiOperation({ summary: '根据订单号获取订单' })
  @ApiParam({ name: 'orderNo', description: '订单号' })
  @ApiResponse({ status: 200, description: '成功获取订单详情' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  findByOrderNo(@Param('orderNo') orderNo: string) {
    return this.ordersService.findByOrderNo(orderNo);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取订单详情' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '成功获取订单详情' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新订单信息' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单更新成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Patch(':id/checkin')
  @ApiOperation({ summary: '签到/缺席标记' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '签到状态更新成功' })
  @ApiResponse({ status: 400, description: '订单状态不允许操作' })
  async checkin(@Param('id') id: string, @Body() dto: CheckinDto) {
    return this.ordersService.checkin(id, dto);
  }

  @Post(':id/apply-coupon')
  @ApiOperation({ summary: '应用优惠券' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '优惠券应用成功' })
  @ApiResponse({ status: 400, description: '优惠券无效或订单不存在' })
  async applyCoupon(@Param('id') id: string, @Body() dto: ApplyCouponDto) {
    return this.ordersService.applyCoupon(id, dto);
  }

  @Post(':id/change-package')
  @ApiOperation({ summary: '更换套餐（升级/降级）' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '套餐更换成功' })
  @ApiResponse({ status: 404, description: '订单或套餐不存在' })
  async changePackage(@Param('id') id: string, @Body() dto: ChangePackageDto) {
    return this.ordersService.changePackage(id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单取消成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 400, description: '订单状态不允许取消' })
  async cancelOrder(@Param('id') id: string, @Body() body?: { reason?: string }) {
    const result = await this.ordersService.cancelOrder(id, body?.reason);
    return {
      success: true,
      data: result,
      message: '订单取消成功',
    };
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '确认订单' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单确认成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 400, description: '订单状态不允许确认' })
  async confirmOrder(@Param('id') id: string) {
    const result = await this.ordersService.confirmOrder(id);
    return {
      success: true,
      data: result,
      message: '订单确认成功',
    };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成订单' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单完成成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 400, description: '订单状态不允许完成' })
  async completeOrder(@Param('id') id: string) {
    const result = await this.ordersService.completeOrder(id);
    return {
      success: true,
      data: result,
      message: '订单完成成功',
    };
  }

  @Post('batch')
  @ApiOperation({ summary: '批量操作订单' })
  @ApiResponse({ status: 200, description: '批量操作成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async batchOperate(@Body() batchDto: { operation: string; orderIds: string[] }) {
    const result = await this.ordersService.batchOperate(batchDto.operation, batchDto.orderIds);
    return {
      success: true,
      data: result,
      message: '批量操作完成',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除订单' })
  @ApiParam({ name: 'id', description: '订单ID' })
  @ApiResponse({ status: 200, description: '订单删除成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async deleteOrder(@Param('id') id: string) {
    const result = await this.ordersService.deleteOrder(id);
    return {
      success: true,
      data: result,
      message: '订单删除成功',
    };
  }
}
