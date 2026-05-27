import { Module } from '@nestjs/common';
import { WxMallService } from './wx-mall.service';
import { WxMallController } from './wx-mall.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  providers: [WxMallService],
  controllers: [WxMallController],
  exports: [WxMallService],
})
export class WxMallModule {}
