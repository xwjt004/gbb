import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { CreateBatchTimeSlotsDto } from './dto/create-batch-time-slots.dto';
import { BatchUpdateStatusDto, BatchDeleteDto } from './dto/batch-operation.dto';

@ApiTags('时间槽管理')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @Post()
  @ApiOperation({ summary: '创建单个时间槽' })
  @ApiResponse({ status: 201, description: '时间槽创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '时间槽已存在' })
  create(@Body() createTimeSlotDto: CreateTimeSlotDto) {
    return this.timeSlotsService.create(createTimeSlotDto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建时间槽' })
  @ApiResponse({ status: 201, description: '批量时间槽创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  createBatch(@Body() createBatchDto: CreateBatchTimeSlotsDto) {
    return this.timeSlotsService.createBatch(createBatchDto);
  }

  @Get()
  @ApiOperation({ summary: '获取时间槽列表' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'isBooked', required: false, description: '是否已预订' })
  @ApiQuery({ name: 'status', required: false, description: '时间槽状态', enum: ['AVAILABLE', 'BOOKED', 'UNAVAILABLE'] })
  @ApiQuery({ name: 'isHoliday', required: false, description: '是否为节假日' })
  @ApiQuery({ name: 'hasCapacity', required: false, description: '是否只显示有余量的时间槽' })
  @ApiQuery({ name: 'notes', required: false, description: '备注搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码', type: Number })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量', type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: '排序方式',
    enum: ['date_asc', 'date_desc', 'time_asc', 'time_desc'],
  })
  @ApiResponse({ status: 200, description: '成功获取时间槽列表' })
  findAll(@Query() query: QueryTimeSlotsDto) {
    return this.timeSlotsService.findAll(query);
  }

  @Get('available')
  @ApiOperation({ summary: '获取可用时间槽' })
  @ApiQuery({ name: 'date', required: false, description: '指定日期（可选）' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期（与 endDate 搭配使用）' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期（与 startDate 搭配使用）' })
  @ApiQuery({ name: 'limit', required: false, description: '限制数量（可选）' })
  @ApiResponse({ status: 200, description: '成功获取可用时间槽' })
  findAvailable(
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.timeSlotsService.getAvailableSlots(date, limitNum, startDate, endDate);
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: '获取时间槽统计概览' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '成功获取统计数据' })
  getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeSlotsService.getStatistics(startDate, endDate);
  }

  @Get('statistics/daily')
  @ApiOperation({ summary: '获取每日统计数据' })
  @ApiQuery({ name: 'startDate', required: true, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: true, description: '结束日期' })
  @ApiResponse({ status: 200, description: '成功获取每日统计数据' })
  getDailyStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.timeSlotsService.getDailyStatistics(startDate, endDate);
  }

  @Get('conflicts')
  @ApiOperation({ summary: '检测指定日期时间槽冲突与容量预警' })
  @ApiQuery({ name: 'date', required: true, description: '日期 YYYY-MM-DD' })
  getConflicts(@Query('date') date: string) {
    return this.timeSlotsService.getConflictAnalysis(date);
  }

  @Get('recommendations')
  @ApiOperation({ summary: '智能推荐可用时间槽' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiQuery({ name: 'limit', required: false, description: '返回数量' })
  getRecommendations(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timeSlotsService.getRecommendations(startDate, endDate, limit ? parseInt(limit, 10) : 5);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取时间槽详情' })
  @ApiParam({ name: 'id', description: '时间槽ID' })
  @ApiResponse({ status: 200, description: '成功获取时间槽详情' })
  @ApiResponse({ status: 404, description: '时间槽不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.timeSlotsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新时间槽' })
  @ApiParam({ name: 'id', description: '时间槽ID' })
  @ApiResponse({ status: 200, description: '时间槽更新成功' })
  @ApiResponse({ status: 404, description: '时间槽不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
  ) {
    return this.timeSlotsService.update(id, updateTimeSlotDto);
  }

  @Patch('batch/status')
  @ApiOperation({ summary: '批量更新时间槽状态' })
  @ApiResponse({ status: 200, description: '批量更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  async batchUpdateStatus(@Body() batchUpdateDto: BatchUpdateStatusDto) {
    const count = await this.timeSlotsService.batchUpdateStatus(batchUpdateDto.ids, batchUpdateDto.status);
    return { count };
  }

  @Delete('batch')
  @ApiOperation({ summary: '批量删除时间槽' })
  @ApiResponse({ status: 200, description: '批量删除成功' })
  @ApiResponse({ status: 400, description: '无法删除有订单的时间槽' })
  async batchDelete(@Body() batchDeleteDto: BatchDeleteDto) {
    const count = await this.timeSlotsService.batchDelete(batchDeleteDto.ids);
    return { count };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除时间槽' })
  @ApiParam({ name: 'id', description: '时间槽ID' })
  @ApiResponse({ status: 200, description: '时间槽删除成功' })
  @ApiResponse({ status: 404, description: '时间槽不存在' })
  @ApiResponse({ status: 400, description: '无法删除有订单的时间槽' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.timeSlotsService.remove(id);
  }
}
