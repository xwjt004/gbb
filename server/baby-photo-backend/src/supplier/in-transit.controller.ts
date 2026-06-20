import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../modules/auth/guards/admin-jwt-auth.guard';
import { InTransitService } from './in-transit.service';
import {
  CreateInTransitDto,
  UpdateLogisticsDto,
  UpdateShippingStatusDto,
  UpdateExpectedDateDto,
  MarkDelayDto,
  ReportExceptionDto,
  HandleExceptionDto,
  ConfirmArrivalDto,
  QueryInTransitDto,
} from './dto/create-in-transit.dto';

@ApiTags('在途管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('in-transit')
export class InTransitController {
  constructor(private readonly inTransitService: InTransitService) {}

  /**
   * 创建在途商品记录
   */
  @Post()
  create(@Body() createDto: CreateInTransitDto) {
    return this.inTransitService.create(createDto);
  }

  /**
   * 获取统计数据
   */
  @Get('statistics/summary')
  getStatistics() {
    return this.inTransitService.getStatistics();
  }

  /**
   * 查询在途商品列表
   */
  @Get('list')
  findAll(@Query() queryDto: QueryInTransitDto) {
    return this.inTransitService.findAll(queryDto);
  }

  /**
   * 根据采购订单ID查询在途商品
   */
  @Get('by-purchase-order/:id')
  getByPurchaseOrderId(@Param('id') purchaseOrderId: string) {
    return this.inTransitService.getByPurchaseOrderId(purchaseOrderId);
  }

  /**
   * 查询在途商品详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inTransitService.findOne(id);
  }

  /**
   * 通用更新在途记录
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.inTransitService.update(id, updateDto);
  }

  /**
   * 记录异常（别名）
   */
  @Patch(':id/exception')
  recordException(@Param('id') id: string, @Body() reportDto: import('./dto/create-in-transit.dto').ReportExceptionDto) {
    return this.inTransitService.reportException(id, reportDto);
  }

  /**
   * 更新物流信息
   */
  @Patch(':id/logistics')
  updateLogistics(@Param('id') id: string, @Body() updateDto: UpdateLogisticsDto) {
    return this.inTransitService.updateLogistics(id, updateDto);
  }

  /**
   * 更新物流状态
   */
  @Patch(':id/shipping-status')
  updateShippingStatus(@Param('id') id: string, @Body() updateDto: UpdateShippingStatusDto) {
    return this.inTransitService.updateShippingStatus(id, updateDto);
  }

  /**
   * 更新预计到货时间
   */
  @Patch(':id/expected-date')
  updateExpectedDate(@Param('id') id: string, @Body() updateDto: UpdateExpectedDateDto) {
    return this.inTransitService.updateExpectedDate(id, updateDto);
  }

  /**
   * 标记延迟
   */
  @Patch(':id/mark-delay')
  markDelay(@Param('id') id: string, @Body() markDto: MarkDelayDto) {
    return this.inTransitService.markDelay(id, markDto);
  }

  /**
   * 报告异常
   */
  @Patch(':id/report-exception')
  reportException(@Param('id') id: string, @Body() reportDto: ReportExceptionDto) {
    return this.inTransitService.reportException(id, reportDto);
  }

  /**
   * 处理异常
   */
  @Patch(':id/handle-exception')
  handleException(@Param('id') id: string, @Body() handleDto: HandleExceptionDto) {
    return this.inTransitService.handleException(id, handleDto);
  }

  /**
   * 确认到货
   */
  @Patch(':id/confirm-arrival')
  confirmArrival(@Param('id') id: string, @Body() confirmDto: ConfirmArrivalDto) {
    return this.inTransitService.confirmArrival(id, confirmDto);
  }

  /**
   * 确认收货（与 confirm-arrival 相同）
   */
  @Patch(':id/receive')
  confirmReceive(@Param('id') id: string, @Body() confirmDto: ConfirmArrivalDto) {
    return this.inTransitService.confirmArrival(id, confirmDto);
  }

  /**
   * 删除在途记录
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inTransitService.remove(id);
  }
}
