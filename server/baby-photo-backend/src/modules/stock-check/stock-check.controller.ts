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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StockCheckService } from './stock-check.service';
import { CreateCheckDto } from './dto/create-check.dto';
import { UpdateCheckDto } from './dto/update-check.dto';
import { ApproveCheckDto } from './dto/approve-check.dto';
import { QueryCheckDto } from './dto/query-check.dto';

@ApiTags('库存管理 - 盘点管理')
@Controller('stock-check')
export class StockCheckController {
  constructor(private readonly stockCheckService: StockCheckService) {}

  @Post()
  @ApiOperation({ summary: '创建盘点单' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(@Body() createCheckDto: CreateCheckDto) {
    // TODO: 从认证信息中获取当前用户ID
    const userId = 1; // 临时使用固定值
    return this.stockCheckService.create(userId, createCheckDto);
  }

  @Get()
  @ApiOperation({ summary: '查询盘点单列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryCheckDto) {
    return this.stockCheckService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '盘点统计' })
  @ApiResponse({ status: 200, description: '统计成功' })
  statistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stockCheckService.statistics(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询盘点单详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '盘点单不存在' })
  findOne(@Param('id') id: string) {
    return this.stockCheckService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新盘点单' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '盘点单不存在' })
  @ApiResponse({ status: 400, description: '只能修改待审批状态的盘点单' })
  update(@Param('id') id: string, @Body() updateCheckDto: UpdateCheckDto) {
    return this.stockCheckService.update(id, updateCheckDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除盘点单' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '盘点单不存在' })
  @ApiResponse({ status: 400, description: '只能删除待审批状态的盘点单' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.stockCheckService.remove(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批盘点单' })
  @ApiResponse({ status: 200, description: '审批成功' })
  @ApiResponse({ status: 404, description: '盘点单不存在' })
  @ApiResponse({ status: 400, description: '该盘点单已审批' })
  approve(@Param('id') id: string, @Body() approveDto: ApproveCheckDto) {
    // TODO: 从认证信息中获取当前用户ID
    const userId = 1; // 临时使用固定值
    return this.stockCheckService.approve(
      id,
      userId,
      approveDto.approved,
      approveDto.note,
      approveDto.autoAdjust !== false // 默认为true
    );
  }
}
