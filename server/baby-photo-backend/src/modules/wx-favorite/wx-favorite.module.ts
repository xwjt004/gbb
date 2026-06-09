import { Module } from '@nestjs/common';
import { WxFavoriteService } from './wx-favorite.service';
import { WxFavoriteController } from './wx-favorite.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WxFavoriteService],
  controllers: [WxFavoriteController],
  exports: [WxFavoriteService],
})
export class WxFavoriteModule {}
