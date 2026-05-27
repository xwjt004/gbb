import { Module } from '@nestjs/common';
import { StockAlertService } from './stock-alert.service';
import { StockAlertController } from './stock-alert.controller';
import { AutoPurchaseSuggestionService } from './auto-purchase-suggestion.service';
import { AutoPurchaseSuggestionController } from './auto-purchase-suggestion.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { SupplierModule } from '../../supplier/supplier.module';

@Module({
  imports: [PrismaModule, SupplierModule],
  controllers: [StockAlertController, AutoPurchaseSuggestionController],
  providers: [StockAlertService, AutoPurchaseSuggestionService],
  exports: [StockAlertService, AutoPurchaseSuggestionService],
})
export class StockAlertModule {}
