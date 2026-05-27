import { Module } from '@nestjs/common';
import { PackageCategoriesService } from './package-categories.service';
import { PackageCategoriesController } from './package-categories.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PackageCategoriesController],
  providers: [PackageCategoriesService],
  exports: [PackageCategoriesService],
})
export class PackageCategoriesModule {}
