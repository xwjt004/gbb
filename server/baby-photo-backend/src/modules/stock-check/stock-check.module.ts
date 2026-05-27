import { Module } from '@nestjs/common';
import { StockCheckService } from './stock-check.service';
import { StockCheckController } from './stock-check.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockCheckController],
  providers: [StockCheckService],
  exports: [StockCheckService]
})
export class StockCheckModule {}
