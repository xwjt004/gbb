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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { StockOutboundService } from './stock-outbound.service';
import { CreateOutboundDto } from './dto/create-outbound.dto';
import { UpdateOutboundDto } from './dto/update-outbound.dto';
import { ApproveOutboundDto } from './dto/approve-outbound.dto';
import { QueryOutboundDto } from './dto/query-outbound.dto';

@ApiTags('库存管理 - 出库管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('stock-outbound')
export class StockOutboundController {
  constructor(private readonly stockOutboundService: StockOutboundService) {}

  @Post()
  @ApiOperation({ summary: '创建出库单' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(@Body() createOutboundDto: CreateOutboundDto) {
    // TODO: 从认证信息中获取当前用户ID
    const userId = 1; // 临时使用固定值
    return this.stockOutboundService.create(userId, createOutboundDto);
  }

  @Get()
  @ApiOperation({ summary: '查询出库单列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryOutboundDto) {
    return this.stockOutboundService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '出库统计' })
  @ApiResponse({ status: 200, description: '统计成功' })
  statistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.stockOutboundService.statistics(startDate, endDate, groupBy);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询出库单详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '出库单不存在' })
  findOne(@Param('id') id: string) {
    return this.stockOutboundService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新出库单' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '出库单不存在' })
  @ApiResponse({ status: 400, description: '只能修改待审批状态的出库单' })
  update(@Param('id') id: string, @Body() updateOutboundDto: UpdateOutboundDto) {
    return this.stockOutboundService.update(id, updateOutboundDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除出库单' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '出库单不存在' })
  @ApiResponse({ status: 400, description: '只能删除待审批状态的出库单' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.stockOutboundService.remove(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批出库单' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 404, description: '出库单不存在' })
  @ApiResponse({ status: 400, description: '该出库单已审批或库存不足' })
  approve(@Param('id') id: string, @Body() approveDto: ApproveOutboundDto) {
    // TODO: 从认证信息中获取当前用户ID
    const userId = 1; // 临时使用固定值
    return this.stockOutboundService.approve(id, userId, approveDto.approved, approveDto.note);
  }
}
