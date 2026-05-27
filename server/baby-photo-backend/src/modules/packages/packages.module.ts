import { Module } from '@nestjs/common';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}
