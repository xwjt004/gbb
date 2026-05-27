import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { InventoryIntelligenceController } from './inventory-intelligence.controller';
import { SalesPredictionService } from './services/sales-prediction.service';
import { SafetyStockService } from './services/safety-stock.service';
import { RestockSuggestionService } from './services/restock-suggestion.service';
import { SlowMovingService } from './services/slow-moving.service';
import { TurnoverAnalysisService } from './services/turnover-analysis.service';
import { StockAlertModule } from '../stock-alert/stock-alert.module';

@Module({
  imports: [PrismaModule, forwardRef(() => StockAlertModule)],
  controllers: [InventoryIntelligenceController],
  providers: [
    SalesPredictionService,
    SafetyStockService,
    RestockSuggestionService,
    SlowMovingService,
    TurnoverAnalysisService,
  ],
  exports: [
    SalesPredictionService,
    SafetyStockService,
    RestockSuggestionService,
    SlowMovingService,
    TurnoverAnalysisService,
  ],
})
export class InventoryIntelligenceModule {}
