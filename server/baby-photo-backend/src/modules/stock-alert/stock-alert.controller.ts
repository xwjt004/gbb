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
import { StockAlertService } from './stock-alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';

@ApiTags('库存管理 - 预警管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('stock-alert')
export class StockAlertController {
  constructor(private readonly stockAlertService: StockAlertService) {}

  @Post()
  @ApiOperation({ summary: '创建预警记录（通常由系统自动创建）' })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(@Body() createAlertDto: CreateAlertDto) {
    return this.stockAlertService.createAlert(createAlertDto);
  }

  @Get()
  @ApiOperation({ summary: '查询预警列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Query() query: QueryAlertDto) {
    return this.stockAlertService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '预警统计' })
  @ApiResponse({ status: 200, description: '统计成功' })
  statistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.stockAlertService.statistics(startDate, endDate);
  }

  @Post('check')
  @ApiOperation({ summary: '手动触发预警检测' })
  @ApiResponse({ status: 200, description: '检测成功' })
  @HttpCode(HttpStatus.OK)
  manualCheck() {
    return this.stockAlertService.manualCheck();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询预警详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '预警记录不存在' })
  findOne(@Param('id') id: string) {
    return this.stockAlertService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '处理预警' })
  @ApiResponse({ status: 200, description: '处理成功' })
  @ApiResponse({ status: 404, description: '预警记录不存在' })
  handle(@Param('id') id: string, @Body() updateAlertDto: UpdateAlertDto) {
    // TODO: 从认证信息中获取当前用户ID
    const userId = 1; // 临时使用固定值
    return this.stockAlertService.handle(id, userId, updateAlertDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除预警记录' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '预警记录不存在' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.stockAlertService.remove(id);
  }
}
