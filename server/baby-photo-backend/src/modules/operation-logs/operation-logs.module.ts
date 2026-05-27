import { Module } from '@nestjs/common';
import { OperationLogsController } from './operation-logs.controller';
import { OperationLogsService } from './operation-logs.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
  exports: [OperationLogsService],
})
export class OperationLogsModule {}
