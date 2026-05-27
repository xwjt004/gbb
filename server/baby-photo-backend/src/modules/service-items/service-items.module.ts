import { Module } from '@nestjs/common';
import { ServiceItemsService } from './service-items.service';
import { ServiceItemsController } from './service-items.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
  exports: [ServiceItemsService],
})
export class ServiceItemsModule {}
