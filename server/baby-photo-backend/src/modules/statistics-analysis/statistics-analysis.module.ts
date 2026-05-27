import { Module } from '@nestjs/common';
import { StatisticsAnalysisController } from './statistics-analysis.controller';
import { StatisticsAnalysisService } from './statistics-analysis.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StatisticsAnalysisController],
  providers: [StatisticsAnalysisService],
  exports: [StatisticsAnalysisService],
})
export class StatisticsAnalysisModule {}
