import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { WxAuthService } from './wx-auth.service';
import { WxAuthController } from './wx-auth.controller';
import { WxJwtStrategy } from './strategies/wx-jwt.strategy';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  providers: [WxAuthService, WxJwtStrategy],
  controllers: [WxAuthController],
  exports: [WxAuthService, JwtModule],
})
export class WxAuthModule {}
