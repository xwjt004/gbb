import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { BehaviorAnalyticsService } from './services/behavior-analytics.service';
import { PackageAnalyticsService } from './services/package-analytics.service';
import { LoyaltyAnalyticsService } from './services/loyalty-analytics.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    UserAnalyticsService,
    BehaviorAnalyticsService,
    PackageAnalyticsService,
    LoyaltyAnalyticsService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
