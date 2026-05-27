import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { DiscountRulesModule } from '../discount-rules/discount-rules.module';
import { OrdersModule } from '../orders/orders.module';
import { DiyPackagesService } from './diy-packages.service';
import { DiyPackagesController } from './diy-packages.controller';

@Module({
  imports: [
    PrismaModule, 
    DiscountRulesModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [DiyPackagesController],
  providers: [DiyPackagesService],
  exports: [DiyPackagesService],
})
export class DiyPackagesModule {}
