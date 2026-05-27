import { Controller, Get, Post, Put, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalesPredictionService } from './services/sales-prediction.service';
import { SafetyStockService } from './services/safety-stock.service';
import { RestockSuggestionService } from './services/restock-suggestion.service';
import { SlowMovingService } from './services/slow-moving.service';
import { TurnoverAnalysisService } from './services/turnover-analysis.service';
import { PredictionQueryDto, ProductPredictionQueryDto } from './dto/sales-prediction.dto';
import { SafetyStockQueryDto, BatchCalculateDto, UpdateSafetyStockDto } from './dto/safety-stock.dto';
import { RestockSuggestionQueryDto, ConvertSuggestionDto } from './dto/restock-suggestion.dto';
import { SlowMovingQueryDto } from './dto/slow-moving.dto';
import { TurnoverQueryDto } from './dto/turnover-analysis.dto';

@ApiTags('库存智能预测')
@Controller('inventory-intelligence')
export class InventoryIntelligenceController {
  constructor(
    private readonly salesPredictionService: SalesPredictionService,
    private readonly safetyStockService: SafetyStockService,
    private readonly restockSuggestionService: RestockSuggestionService,
    private readonly slowMovingService: SlowMovingService,
    private readonly turnoverAnalysisService: TurnoverAnalysisService,
  ) {}

  // ─── Sales Prediction ───────────────────────────────────────────

  @Get('sales-prediction')
  @ApiOperation({ summary: 'Batch sales forecasts' })
  async getSalesPrediction(@Query() query: PredictionQueryDto) {
    const data = await this.salesPredictionService.getBatchForecasts(query);
    return { code: 200, message: 'success', data };
  }

  @Get('sales-prediction/product/:productId')
  @ApiOperation({ summary: 'Single product sales forecast' })
  async getProductSalesPrediction(
    @Param('productId') productId: string,
    @Query() query: ProductPredictionQueryDto,
  ) {
    const data = await this.salesPredictionService.getProductForecast(+productId, query);
    return { code: 200, message: 'success', data };
  }

  // ─── Safety Stock ───────────────────────────────────────────────

  @Get('safety-stock')
  @ApiOperation({ summary: 'List safety stock configs' })
  async getSafetyStock(@Query() query: SafetyStockQueryDto) {
    const data = await this.safetyStockService.getList(query);
    return { code: 200, message: 'success', data };
  }

  @Post('safety-stock/batch-calculate')
  @ApiOperation({ summary: 'Batch calculate safety stock for all tracked products' })
  async batchCalculateSafetyStock(@Body() dto: BatchCalculateDto) {
    const data = await this.safetyStockService.batchCalculate(dto);
    return { code: 200, message: 'success', data };
  }

  @Put('safety-stock/product/:productId')
  @ApiOperation({ summary: 'Update safety stock config for a product' })
  async updateSafetyStockConfig(
    @Param('productId') productId: string,
    @Body() dto: UpdateSafetyStockDto,
  ) {
    const data = await this.safetyStockService.calculateAndUpdate(+productId, dto);
    return { code: 200, message: 'success', data };
  }

  // ─── Restock Suggestions ────────────────────────────────────────

  @Get('restock-suggestions')
  @ApiOperation({ summary: 'List restock suggestions' })
  async getRestockSuggestions(@Query() query: RestockSuggestionQueryDto) {
    const data = await this.restockSuggestionService.getSuggestions(query);
    return { code: 200, message: 'success', data };
  }

  @Post('restock-suggestions/generate')
  @ApiOperation({ summary: 'Generate restock suggestions for all tracked products' })
  async generateRestockSuggestions() {
    const data = await this.restockSuggestionService.generateBatch();
    return { code: 200, message: 'success', data };
  }

  @Post('restock-suggestions/:id/convert')
  @ApiOperation({ summary: 'Convert suggestion to purchase order' })
  async convertSuggestion(
    @Param('id') id: string,
    @Body() dto: ConvertSuggestionDto,
  ) {
    const data = await this.restockSuggestionService.convertToPurchaseOrder(id, dto.supplierId);
    return { code: 200, message: 'success', data };
  }

  // ─── Slow-moving ────────────────────────────────────────────────

  @Get('slow-moving')
  @ApiOperation({ summary: 'List slow-moving products' })
  async getSlowMovingProducts(@Query() query: SlowMovingQueryDto) {
    const data = await this.slowMovingService.getList(query);
    return { code: 200, message: 'success', data };
  }

  @Post('slow-moving/check')
  @ApiOperation({ summary: 'Run slow-moving detection' })
  async checkSlowMoving() {
    const data = await this.slowMovingService.checkSlowMoving();
    return { code: 200, message: 'success', data };
  }

  // ─── Turnover Analysis ──────────────────────────────────────────

  @Get('turnover-analysis')
  @ApiOperation({ summary: 'Get turnover analysis' })
  async getTurnoverAnalysis(@Query() query: TurnoverQueryDto) {
    const data = await this.turnoverAnalysisService.getAnalysis(query);
    return { code: 200, message: 'success', data };
  }

  @Get('turnover-analysis/report')
  @ApiOperation({ summary: 'Get detailed turnover report with suggestions' })
  async getTurnoverReport(@Query() query: TurnoverQueryDto) {
    const data = await this.turnoverAnalysisService.getReport(query);
    return { code: 200, message: 'success', data };
  }

  @Post('turnover-analysis/refresh')
  @ApiOperation({ summary: 'Refresh turnover analysis data' })
  async refreshTurnoverData() {
    const data = await this.turnoverAnalysisService.refresh();
    return { code: 200, message: 'success', data };
  }
}
