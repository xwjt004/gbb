import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersWxLoginDto, AdminLoginDto, PhoneLoginDto } from '../users/dto';
import { UserType } from '../users/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    // 注入其他需要的服务
  ) {}

  async wechatLogin(wxLoginDto: UsersWxLoginDto) {
    // 保持原有微信登录逻辑
    // 这里需要实现具体的微信登录逻辑
    const { code } = wxLoginDto;

    // 模拟获取用户信息
    const user = await this.getWechatUser(code);

    const payload = {
      sub: user.id,
      userType: UserType.WECHAT,
      // ...other user info...
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
      userType: UserType.WECHAT,
    };
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    const { username, password } = adminLoginDto;

    // 验证管理员账号密码
    const admin = await this.validateAdmin(username, password);
    if (!admin) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = {
      sub: admin.id,
      userType: UserType.ADMIN,
      username: admin.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: admin,
      userType: UserType.ADMIN,
    };
  }

  async phoneLogin(phoneLoginDto: PhoneLoginDto) {
    const { phone, code } = phoneLoginDto;

    // 验证手机验证码
    const isValidCode = await this.validatePhoneCode(phone, code);
    if (!isValidCode) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 查找或创建手机用户
    let user = await this.findUserByPhone(phone);
    if (!user) {
      user = await this.createPhoneUser(phone);
    }

    const payload = {
      sub: user.id,
      userType: UserType.PHONE,
      phone: user.phone,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
      userType: UserType.PHONE,
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getWechatUser(code: string) {
    // 实现微信用户获取逻辑
    // 临时返回模拟数据，后续会添加实际的异步调用
    return {
      id: 'wx_' + Date.now(),
      openid: 'test_openid',
      // ...其他用户信息
    };
  }

  private async validateAdmin(username: string, password: string) {
    // 实现管理员验证逻辑
    // 这里需要根据您的数据库结构来实现
    // 临时返回模拟数据用于测试
    if (username === 'admin' && password === 'admin123') {
      return {
        id: 'admin_1',
        username: 'admin',
      };
    }
    return null;
  }

  private async validatePhoneCode(
    phone: string,
    code: string,
  ): Promise<boolean> {
    // 实现验证码验证逻辑
    // 通常从Redis或数据库中验证验证码
    // 临时返回 true 用于测试
    return phone && code ? true : false;
  }

  private async findUserByPhone(phone: string): Promise<{ id: string; phone: string } | null> {
    // 根据手机号查找用户
    // 临时返回 null，表示用户不存在
    return null;
  }

  private async createPhoneUser(phone: string) {
    // 创建手机用户
    // 临时返回模拟数据
    return {
      id: 'phone_' + Date.now(),
      phone: phone,
    };
  }
}
