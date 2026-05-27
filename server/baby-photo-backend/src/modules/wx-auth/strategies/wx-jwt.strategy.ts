import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class WxJwtStrategy extends PassportStrategy(Strategy, 'wx-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    const wxUser = await this.prisma.wxUser.findUnique({
      where: { id: payload.sub },
    });

    if (!wxUser || wxUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return wxUser;
  }
}
