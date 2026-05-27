import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/permission.decorator';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    // 没有权限要求则放行
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    try {
      const token = authHeader.slice(7);
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const payload = jwt.verify(token, secret) as any;
      const userId = payload.sub ? parseInt(payload.sub, 10) : null;
      if (!userId) return false;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { role: { include: { permissions: true } } },
      });
      if (!user?.role) return false;

      const userPermissions = user.role.permissions.map((p) => p.permission);
      // 通配符 `*:*` 表示所有权限
      if (userPermissions.includes('*:*')) return true;

      return requiredPermissions.some((rp) => {
        return userPermissions.some((up) => {
          // 精确匹配或模块通配: "orders:*" 匹配 "orders:view", "orders:edit" 等
          if (up === rp) return true;
          const [upMod, upAct] = up.split(':');
          const [rpMod, rpAct] = rp.split(':');
          if (upMod === '*' && upAct === '*') return true; // *:*
          if (upMod === rpMod && upAct === '*') return true; // module:*
          return false;
        });
      });
    } catch (err) {
      this.logger.warn(`Permission check failed: ${err.message}`);
      return false;
    }
  }
}
