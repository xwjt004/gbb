import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { SmartMarketingController } from './smart-marketing.controller';
import { SmartMarketingService } from './smart-marketing.service';

@Module({
  imports: [PrismaModule],
  controllers: [SmartMarketingController],
  providers: [SmartMarketingService],
  exports: [SmartMarketingService],
})
export class SmartMarketingModule {}
