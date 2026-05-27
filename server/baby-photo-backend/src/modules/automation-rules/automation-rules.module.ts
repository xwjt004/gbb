import { Module } from '@nestjs/common';
import { AutomationRulesService } from './automation-rules.service';
import { AutomationRulesController } from './automation-rules.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StockAlertModule } from '../stock-alert/stock-alert.module';

@Module({
  imports: [PrismaModule, NotificationsModule, StockAlertModule],
  controllers: [AutomationRulesController],
  providers: [AutomationRulesService],
  exports: [AutomationRulesService],
})
export class AutomationRulesModule {}
