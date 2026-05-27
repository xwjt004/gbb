import { Module } from '@nestjs/common';
import { StockTransactionService } from './stock-transaction.service';
import { StockTransactionController } from './stock-transaction.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockTransactionController],
  providers: [StockTransactionService],
  exports: [StockTransactionService]
})
export class StockTransactionModule {}
