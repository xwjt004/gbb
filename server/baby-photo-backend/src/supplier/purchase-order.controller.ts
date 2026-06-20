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
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { ApprovePurchaseOrderDto, RejectPurchaseOrderDto } from './dto/approve-purchase-order.dto';

@ApiTags('采购订单')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('purchase-order')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  /**
   * 创建采购订单
   */
  @Post()
  create(@Body() createDto: CreatePurchaseOrderDto) {
    return this.purchaseOrderService.create(createDto);
  }

  /**
   * 查询采购订单列表
   */
  @Get()
  findAll(@Query() queryDto: QueryPurchaseOrderDto) {
    return this.purchaseOrderService.findAll(queryDto);
  }

  /**
   * 获取统计数据
   */
  @Get('statistics')
  getStatistics() {
    return this.purchaseOrderService.getStatistics();
  }

  /**
   * 查询采购订单详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchaseOrderService.findOne(id);
  }

  /**
   * 更新采购订单
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePurchaseOrderDto) {
    return this.purchaseOrderService.update(id, updateDto);
  }

  /**
   * 提交审批
   */
  @Patch(':id/submit')
  submit(@Param('id') id: string) {
    return this.purchaseOrderService.submit(id);
  }

  /**
   * 审批通过
   */
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() approveDto: ApprovePurchaseOrderDto) {
    return this.purchaseOrderService.approve(id, approveDto);
  }

  /**
   * 审批驳回
   */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() rejectDto: RejectPurchaseOrderDto) {
    return this.purchaseOrderService.reject(id, rejectDto);
  }

  /**
   * 撤回审批
   */
  @Patch(':id/revoke')
  revokeApproval(@Param('id') id: string) {
    return this.purchaseOrderService.revokeApproval(id);
  }

  /**
   * 取消订单
   */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.purchaseOrderService.cancel(id);
  }

  /**
   * 更新物流信息
   */
  @Patch(':id/shipping')
  updateShipping(
    @Param('id') id: string,
    @Body() shippingDto: { shippingCompany?: string; trackingNo?: string; shippingStatus?: string }
  ) {
    return this.purchaseOrderService.updateShipping(id, shippingDto);
  }

  /**
   * 确认收货
   */
  @Patch(':id/receive')
  confirmReceive(
    @Param('id') id: string,
    @Body() receiveDto: { receivedQuantity?: number; qualityCheckStatus?: string; qualityCheckRemark?: string }
  ) {
    return this.purchaseOrderService.confirmReceive(id, receiveDto);
  }

  /**
   * 删除订单
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.purchaseOrderService.remove(id);
  }
}
