import { Module } from '@nestjs/common';
import { TimeSlotsController } from './time-slots.controller';
import { TimeSlotsService } from './time-slots.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimeSlotsController],
  providers: [TimeSlotsService],
  exports: [TimeSlotsService],
})
export class TimeSlotsModule {}
