import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StockTransactionService } from './stock-transaction.service';
import { QueryTransactionDto, ManualAdjustDto } from './dto';

@ApiTags('库存管理 - 库存流水')
@Controller('stock-transaction')
export class StockTransactionController {
  private readonly logger = new Logger(StockTransactionController.name);
  
  constructor(private readonly stockTransactionService: StockTransactionService) {}

  /**
   * 查询库存流水列表
   */
  @Get()
  @ApiOperation({ summary: '查询库存流水列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Query() queryDto: QueryTransactionDto) {
    const result = await this.stockTransactionService.findAll(queryDto);
    return {
      success: true,
      data: result,
      message: '查询成功'
    };
  }

  /**
   * 查询单个流水详情
   */
  @Get(':id')
  @ApiOperation({ summary: '查询流水详情' })
  @ApiParam({ name: 'id', description: '流水记录ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '流水记录不存在' })
  async findOne(@Param('id') id: string) {
    const transaction = await this.stockTransactionService.findOne(id);
    return {
      success: true,
      data: transaction,
      message: '查询成功'
    };
  }

  /**
   * 查询商品流水记录
   */
  @Get('product/:productId')
  @ApiOperation({ summary: '查询商品流水记录' })
  @ApiParam({ name: 'productId', description: '商品ID', type: 'number' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async findByProduct(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.stockTransactionService.findByProduct(
      parseInt(productId),
      startDate,
      endDate
    );
    return {
      success: true,
      data: result,
      message: '查询成功'
    };
  }

  /**
   * 库存流水统计
   */
  @Get('statistics/summary')
  @ApiOperation({ summary: '库存流水统计' })
  @ApiQuery({ name: 'productId', required: false, description: '商品ID' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @ApiResponse({ status: 200, description: '统计成功' })
  async statistics(
    @Query('productId') productId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.stockTransactionService.statistics(
      productId ? parseInt(productId) : undefined,
      startDate,
      endDate
    );
    return {
      success: true,
      data: stats,
      message: '统计成功'
    };
  }

  /**
   * 手工调整库存
   */
  @Post('manual-adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手工调整库存' })
  @ApiResponse({ status: 200, description: '调整成功' })
  @ApiResponse({ status: 400, description: '参数错误或库存不足' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async manualAdjust(@Body() adjustDto: ManualAdjustDto) {
    this.logger.log(`[Controller] 收到手工调整请求: ${JSON.stringify(adjustDto)}`);
    try {
      const result = await this.stockTransactionService.manualAdjust(adjustDto);
      this.logger.log(`[Controller] 手工调整成功: 流水号=${result.transactionNo}`);
      return {
        success: true,
        data: result,
        message: '库存调整成功'
      };
    } catch (error) {
      this.logger.error(`[Controller] 手工调整失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 导出库存流水
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '导出库存流水' })
  @ApiResponse({ status: 200, description: '导出成功' })
  async export(@Body() queryDto: QueryTransactionDto) {
    const result = await this.stockTransactionService.exportTransactions(queryDto);
    return {
      success: true,
      data: result,
      message: '导出成功'
    };
  }
}
