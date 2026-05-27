import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { SeasonalPricesController } from './seasonal-prices.controller';
import { SeasonalPricesService } from './seasonal-prices.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeasonalPricesController],
  providers: [SeasonalPricesService],
  exports: [SeasonalPricesService],
})
export class SeasonalPricesModule {}
