import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { PhotographerController } from './photographer.controller';
import { PhotographerService } from './photographer.service';

@Module({
  imports: [PrismaModule],
  controllers: [PhotographerController],
  providers: [PhotographerService],
  exports: [PhotographerService],
})
export class PhotographerModule {}
