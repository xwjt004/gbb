import { Module } from '@nestjs/common';
import { StockTransferService } from './stock-transfer.service';
import { StockTransferController } from './stock-transfer.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockTransferController],
  providers: [StockTransferService],
  exports: [StockTransferService]
})
export class StockTransferModule {}
