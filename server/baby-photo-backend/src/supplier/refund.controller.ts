import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../modules/auth/guards/admin-jwt-auth.guard';
import { RefundService } from './refund.service';
import {
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  CompleteRefundDto,
  QueryRefundDto,
} from './dto/create-refund.dto';

@ApiTags('采购退款')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('refund')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * 创建退款申请
   */
  @Post()
  create(@Body() createDto: CreateRefundDto) {
    return this.refundService.create(createDto);
  }

  /**
   * 获取退款统计
   */
  @Get('statistics/summary')
  getStatistics() {
    return this.refundService.getStatistics();
  }

  /**
   * 查询退款列表
   */
  @Get('list')
  findAll(@Query() queryDto: QueryRefundDto) {
    return this.refundService.findAll(queryDto);
  }

  /**
   * 查询退款详情
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundService.findOne(id);
  }

  /**
   * 审批通过退款申请
   */
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() approveDto: ApproveRefundDto) {
    return this.refundService.approve(id, approveDto);
  }

  /**
   * 拒绝退款申请
   */
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() rejectDto: RejectRefundDto) {
    return this.refundService.reject(id, rejectDto);
  }

  /**
   * 完成退款
   */
  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() completeDto: CompleteRefundDto) {
    return this.refundService.complete(id, completeDto);
  }
}
