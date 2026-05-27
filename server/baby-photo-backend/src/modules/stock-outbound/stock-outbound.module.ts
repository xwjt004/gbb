import { Module } from '@nestjs/common';
import { StockOutboundService } from './stock-outbound.service';
import { StockOutboundController } from './stock-outbound.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockOutboundController],
  providers: [StockOutboundService],
  exports: [StockOutboundService],
})
export class StockOutboundModule {}
