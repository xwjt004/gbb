import { Injectable, UnauthorizedException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { UsersWxLoginDto, AdminLoginDto, PhoneLoginDto } from '../users/dto';
import { UserType } from '../users/enums';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly PBKDF2_ITERATIONS = 10000;
  private readonly PBKDF2_KEY_LENGTH = 64;
  private readonly PBKDF2_DIGEST = 'sha512';

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * PBKDF2 哈希密码
   */
  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, this.PBKDF2_ITERATIONS, this.PBKDF2_KEY_LENGTH, this.PBKDF2_DIGEST).toString('hex');
    return { hash, salt: s };
  }

  /**
   * 验证密码
   */
  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  private hashStored(hash: string, salt: string): string {
    return `${salt}:${hash}`;
  }

  async wechatLogin(wxLoginDto: UsersWxLoginDto) {
    const { code } = wxLoginDto;
    const user = await this.getWechatUser(code);
    const payload = { sub: user.id, userType: UserType.WECHAT };
    return { access_token: this.jwtService.sign(payload), user, userType: UserType.WECHAT };
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    const { username, password } = adminLoginDto;

    // 先在数据库查找用户
    let user = await this.prisma.user.findUnique({
      where: { openid: `admin-${username}` },
      include: { role: { include: { permissions: true } } },
    });

    // 数据库用户存在且设置了密码 → 用数据库密码验证
    if (user && user.passwordHash) {
      if (!this.verifyPassword(password, user.passwordHash)) {
        throw new UnauthorizedException('用户名或密码错误');
      }
    } else {
      // 回退到环境变量验证（首次登录或旧版环境变量模式）
      const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
      const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      let passwordValid = false;

      if (username !== expectedUsername) {
        throw new UnauthorizedException('用户名或密码错误');
      }

      if (expectedPasswordHash) {
        const [salt, storedHash] = expectedPasswordHash.split(':');
        if (salt && storedHash) {
          passwordValid = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex') === storedHash;
        }
      } else {
        passwordValid = password === (process.env.ADMIN_PASSWORD || 'admin123');
      }

      if (!passwordValid) {
        throw new UnauthorizedException('用户名或密码错误');
      }

      // 首次登录成功 → 创建用户记录并保存密码哈希到数据库
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            openid: `admin-${username}`,
            nickname: username,
            phone: '',
            role: { connect: { id: 1 } }, // 默认关联超级管理员角色
          },
          include: { role: { include: { permissions: true } } },
        });
      }

      // 将密码哈希存入数据库（从环境变量迁移到数据库）
      const { hash, salt } = this.hashPassword(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: this.hashStored(hash, salt) },
      });
    }

    // 生成 JWT，包含角色和权限信息
    const permissions = user.role?.permissions?.map(p => p.permission) || [];
    const token = this.jwtService.sign({
      sub: user.id,
      openid: user.openid,
      isAdmin: true,
      roleId: user.roleId,
      roleName: user.role?.name,
      permissions,
    });

    return {
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email,
        isAdmin: true,
        roleId: user.roleId,
        roleName: user.role?.name,
        permissions,
        token,
      },
    };
  }

  async phoneLogin(phoneLoginDto: PhoneLoginDto) {
    const { phone } = phoneLoginDto;
    let user = await this.prisma.user.findFirst({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    const payload = { sub: user.id, userType: UserType.PHONE, phone: user.phone };
    return { access_token: this.jwtService.sign(payload), user, userType: UserType.PHONE };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // 验证旧密码
    if (user.passwordHash) {
      if (!this.verifyPassword(oldPassword, user.passwordHash)) {
        throw new BadRequestException('当前密码错误');
      }
    } else {
      // 旧密码未设置时，验证环境变量密码（首次修改密码场景）
      const envPass = process.env.ADMIN_PASSWORD || 'admin123';
      if (oldPassword !== envPass) {
        throw new BadRequestException('当前密码错误');
      }
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('新密码长度不能少于6位');
    }

    // 更新密码
    const { hash, salt } = this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: this.hashStored(hash, salt) },
    });

    return { success: true, message: '密码修改成功' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      // 安全起见，即使邮箱不存在也不提示具体错误
      return { success: true, message: '如果该邮箱已注册，您将收到密码重置邮件' };
    }

    // 生成重置 token（有效期30分钟）
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: user.passwordHash, // 占位，实际更新 resetToken
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: resetTokenHash, resetExpires },
    });

    // 发送重置邮件
    const resetUrl = `${process.env.ADMIN_BASE_URL || 'https://guaibaobao.cn/admin'}/reset-password?token=${resetToken}`;
    const emailConfigured = await this.emailService.isConfigured();

    if (emailConfigured) {
      await this.emailService.sendMail(
        email,
        'GBB 管理后台 - 密码重置',
        `<p>您好 ${user.nickname || '管理员'}：</p>
         <p>请点击以下链接重置您的密码（30分钟内有效）：</p>
         <p><a href="${resetUrl}">${resetUrl}</a></p>
         <p>如果您没有请求重置密码，请忽略此邮件。</p>`,
      );
      this.logger.log(`密码重置邮件已发送至 ${email}`);
    } else {
      this.logger.warn(`邮件服务未配置，重置链接: ${resetUrl}`);
    }

    return { success: true, message: '如果该邮箱已注册，您将收到密码重置邮件' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException('新密码长度不能少于6位');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { resetToken: tokenHash, resetExpires: { gt: new Date() } },
    });

    if (!user) {
      throw new BadRequestException('重置链接无效或已过期');
    }

    const { hash, salt } = this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: this.hashStored(hash, salt), resetToken: null, resetExpires: null },
    });

    return { success: true, message: '密码重置成功' };
  }

  async adminResetUserPassword(currentUserId: number, targetUserId: number, newPassword: string) {
    // 验证当前用户是超级管理员（roleId = 1 或权限包含 *:*）
    const admin = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      include: { role: { include: { permissions: true } } },
    });

    if (!admin) throw new NotFoundException('当前用户不存在');

    const adminPerms = admin.role?.permissions?.map(p => p.permission) || [];
    const isSuperAdmin = adminPerms.includes('*:*');
    if (!isSuperAdmin) {
      throw new UnauthorizedException('只有超级管理员可以重置其他用户的密码');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('新密码长度不能少于6位');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundException('目标用户不存在');

    const { hash, salt } = this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: this.hashStored(hash, salt) },
    });

    return { success: true, message: '密码已重置' };
  }

  private async getWechatUser(code: string) {
    // 实际微信登录通过 WxAuthService 处理，此处保留接口兼容
    return { id: 'wx_' + Date.now(), openid: 'test_openid' };
  }
}
