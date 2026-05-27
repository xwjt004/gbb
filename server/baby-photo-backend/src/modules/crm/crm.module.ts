import { Module, OnModuleInit } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule implements OnModuleInit {
  constructor(private readonly crmService: CrmService) {}

  async onModuleInit() {
    await this.crmService.seedDefaultLevels();
  }
}
