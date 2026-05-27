import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class WxJwtAuthGuard extends AuthGuard('wx-jwt') {}
