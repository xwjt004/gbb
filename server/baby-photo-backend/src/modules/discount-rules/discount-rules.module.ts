import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { DiscountRulesService } from './discount-rules.service';
import { DiscountRulesController } from './discount-rules.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountRulesController],
  providers: [DiscountRulesService],
  exports: [DiscountRulesService],
})
export class DiscountRulesModule {}
