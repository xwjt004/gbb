import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { StockTransferService } from './stock-transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';

@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('stock-transfer')
export class StockTransferController {
  constructor(private readonly stockTransferService: StockTransferService) {}

  /**
   * 创建调拨单
   */
  @Post()
  async create(@Body() createTransferDto: CreateTransferDto) {
    // TODO: 从JWT中获取当前用户ID，这里暂时硬编码
    const submitterId = 172; // 模拟当前用户ID
    const transfer = await this.stockTransferService.create(createTransferDto, submitterId);
    return {
      success: true,
      data: transfer,
      message: '调拨单创建成功'
    };
  }

  /**
   * 查询调拨单列表
   */
  @Get()
  async findAll(@Query() queryDto: QueryTransferDto) {
    const result = await this.stockTransferService.findAll(queryDto);
    return {
      success: true,
      data: result
    };
  }

  /**
   * 统计数据
   */
  @Get('statistics')
  async statistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const stats = await this.stockTransferService.statistics(startDate, endDate);
    return {
      success: true,
      data: stats
    };
  }

  /**
   * 查询调拨单详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transfer = await this.stockTransferService.findOne(id);
    return {
      success: true,
      data: transfer
    };
  }

  /**
   * 审批通过调拨单
   */
  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body('approvalNote') approvalNote?: string
  ) {
    // TODO: 从JWT中获取当前用户ID
    const approverId = 173; // 模拟审批人ID
    const transfer = await this.stockTransferService.approve(id, approverId, approvalNote);
    return {
      success: true,
      data: transfer,
      message: '调拨单审批通过'
    };
  }

  /**
   * 拒绝调拨单
   */
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body('approvalNote') approvalNote?: string
  ) {
    // TODO: 从JWT中获取当前用户ID
    const approverId = 173; // 模拟审批人ID
    const transfer = await this.stockTransferService.reject(id, approverId, approvalNote);
    return {
      success: true,
      data: transfer,
      message: '调拨单已拒绝'
    };
  }

  /**
   * 发货
   */
  @Post(':id/ship')
  async ship(
    @Param('id') id: string,
    @Body('shippingNote') shippingNote?: string
  ) {
    const transfer = await this.stockTransferService.ship(id, shippingNote);
    return {
      success: true,
      data: transfer,
      message: '调拨单已发货'
    };
  }

  /**
   * 收货
   */
  @Post(':id/receive')
  async receive(
    @Param('id') id: string,
    @Body('receivingNote') receivingNote?: string
  ) {
    const transfer = await this.stockTransferService.receive(id, receivingNote);
    return {
      success: true,
      data: transfer,
      message: '调拨单已收货'
    };
  }

  /**
   * 取消调拨单
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string) {
    const transfer = await this.stockTransferService.cancel(id);
    return {
      success: true,
      data: transfer,
      message: '调拨单已取消'
    };
  }

  /**
   * 删除调拨单
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.stockTransferService.remove(id);
    return {
      success: true,
      ...result
    };
  }
}
