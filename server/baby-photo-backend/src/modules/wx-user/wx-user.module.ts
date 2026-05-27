import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { WxUserController } from './wx-user.controller';
import { WxUserService } from './wx-user.service';

@Module({
  imports: [PrismaModule],
  controllers: [WxUserController],
  providers: [WxUserService],
  exports: [WxUserService],
})
export class WxUserModule {}
