import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PackagesModule } from '../packages/packages.module';
import { StatusChangeLogService } from '../../shared/services/status-change-log.service';
import { AutomationRulesModule } from '../automation-rules/automation-rules.module';

@Module({
  imports: [PrismaModule, PackagesModule, AutomationRulesModule],
  controllers: [OrdersController],
  providers: [OrdersService, StatusChangeLogService],
  exports: [OrdersService],
})
export class OrdersModule {}
