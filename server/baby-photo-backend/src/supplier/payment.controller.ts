import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreateSupplierPaymentDto, QueryPaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 创建付款记录
   */
  @Post()
  create(@Body() createDto: CreateSupplierPaymentDto) {
    return this.paymentService.create(createDto);
  }

  /**
   * 获取付款统计
   */
  @Get('statistics/summary')
  getStatistics() {
    return this.paymentService.getStatistics();
  }

  /**
   * 获取订单付款状态
   */
  @Get('order/:orderId/status')
  getOrderPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentService.getOrderPaymentStatus(orderId);
  }

  /**
   * 查询付款列表
   */
  @Get('list')
  findAll(@Query() queryDto: QueryPaymentDto) {
    return this.paymentService.findAll(queryDto);
  }

  /**
   * 查询付款详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  /**
   * 确认付款
   */
  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.paymentService.confirm(id);
  }

  /**
   * 取消付款
   */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.paymentService.cancel(id);
  }
}
