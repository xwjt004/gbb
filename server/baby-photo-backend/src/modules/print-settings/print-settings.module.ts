import { Module } from '@nestjs/common';
import { PrintSettingsService } from './print-settings.service';
import { PrintSettingsController } from './print-settings.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrintSettingsController],
  providers: [PrintSettingsService],
  exports: [PrintSettingsService],
})
export class PrintSettingsModule {}
