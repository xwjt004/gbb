import { Module } from '@nestjs/common';
import { SystemBackupController } from './system-backup.controller';
import { SystemBackupService } from './system-backup.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemBackupController],
  providers: [SystemBackupService],
  exports: [SystemBackupService],
})
export class SystemBackupModule {}
