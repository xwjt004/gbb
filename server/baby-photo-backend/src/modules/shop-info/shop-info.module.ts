import { Module } from '@nestjs/common';
import { ShopInfoService } from './shop-info.service';
import { ShopInfoController } from './shop-info.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ShopInfoService],
  controllers: [ShopInfoController],
  exports: [ShopInfoService], // 导出供其他模块使用(如打印设置)
})
export class ShopInfoModule {}
