import { Module } from '@nestjs/common';
import { StatusMonitoringController } from './status-monitoring.controller';
import { StatusMonitoringService } from './status-monitoring.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { StatusChangeLogService } from '../../shared/services/status-change-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatusMonitoringController],
  providers: [StatusMonitoringService, StatusChangeLogService],
  exports: [StatusMonitoringService],
})
export class StatusMonitoringModule {}
