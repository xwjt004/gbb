import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { PhoneAuthDto } from './dto/phone-auth.dto';
import axios from 'axios';
import * as crypto from 'crypto';

/**
 * 微信用户信息接口
 */
interface WxUserInfo {
  nickName: string;
  avatarUrl: string;
  gender: number;
  country?: string;
  province?: string;
  city?: string;
  language?: string;
}

@Injectable()
export class WxAuthService {
  private readonly logger = new Logger(WxAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 微信登录
   */
  async login(dto: WxLoginDto) {
    this.logger.log('微信登录请求');

    // 1. 调用微信API换取 openid 和 session_key
    const wxData = await this.code2Session(dto.code);

    // 2. 查找或创建用户
    let wxUser = await this.prisma.wxUser.findUnique({
      where: { openid: wxData.openid },
    });

    if (!wxUser) {
      // 解密用户信息（如果提供）
      let userInfo: WxUserInfo | null = null;
      if (dto.encryptedData && dto.iv && wxData.session_key) {
        try {
          userInfo = this.decryptData(
            dto.encryptedData,
            wxData.session_key,
            dto.iv,
          ) as WxUserInfo;
        } catch (error) {
          this.logger.warn('解密用户信息失败', error);
        }
      }

      // 创建新用户
      wxUser = await this.prisma.wxUser.create({
        data: {
          openid: wxData.openid,
          unionid: wxData.unionid,
          sessionKey: this.encryptSessionKey(wxData.session_key),
          nickname: userInfo?.nickName,
          avatar: userInfo?.avatarUrl,
          gender: userInfo?.gender,
          status: 'ACTIVE',
        },
      });
      this.logger.log(`创建新用户: ${wxUser.id}`);
    } else {
      // 更新 session_key 和最后登录时间
      await this.prisma.wxUser.update({
        where: { id: wxUser.id },
        data: {
          sessionKey: this.encryptSessionKey(wxData.session_key),
          lastLoginAt: new Date(),
        },
      });
      this.logger.log(`用户登录: ${wxUser.id}`);
    }

    // 3. 生成 JWT Token
    const tokens = await this.generateTokens(wxUser.id, wxUser.openid);

    return {
      ...tokens,
      user: {
        id: wxUser.id,
        openid: wxUser.openid,
        nickname: wxUser.nickname,
        avatar: wxUser.avatar,
        phone: wxUser.phone ? this.maskPhone(wxUser.phone) : null,
        memberLevel: wxUser.memberLevel,
      },
    };
  }

  /**
   * 获取手机号
   */
  async getPhoneNumber(userId: string, dto: PhoneAuthDto) {
    const wxUser = await this.prisma.wxUser.findUnique({
      where: { id: userId },
    });

    if (!wxUser) {
      throw new UnauthorizedException('用户不存在');
    }

    // 调用微信API获取手机号
    const phoneData = await this.getPhoneFromWx(dto.code);

    // 加密存储手机号
    const encryptedPhone = this.encryptPhone(phoneData.purePhoneNumber);

    // 更新用户手机号
    await this.prisma.wxUser.update({
      where: { id: userId },
      data: {
        phone: phoneData.purePhoneNumber,
        phoneEncrypted: encryptedPhone,
      },
    });

    this.logger.log(`用户 ${userId} 绑定手机号`);

    return {
      phone: phoneData.phoneNumber,
      purePhone: phoneData.purePhoneNumber,
      countryCode: phoneData.countryCode,
    };
  }

  /**
   * code换取session
   */
  private async code2Session(code: string) {
    const appId = process.env.WX_APP_ID;
    const appSecret = process.env.WX_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('微信小程序配置缺失');
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.errcode) {
        throw new UnauthorizedException(
          `微信登录失败: ${data.errmsg}`,
        );
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid,
      };
    } catch (error) {
      this.logger.error('微信登录失败', error);
      throw new UnauthorizedException('微信登录失败');
    }
  }

  /**
   * 获取微信手机号
   */
  private async getPhoneFromWx(code: string) {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;

    try {
      const response = await axios.post(url, { code });
      const data = response.data;

      if (data.errcode !== 0) {
        throw new UnauthorizedException(
          `获取手机号失败: ${data.errmsg}`,
        );
      }

      return data.phone_info;
    } catch (error) {
      this.logger.error('获取手机号失败', error);
      throw new UnauthorizedException('获取手机号失败');
    }
  }

  /**
   * 获取微信 Access Token
   * TODO: 实现 Redis 缓存（access_token 有效期 7200秒）
   */
  private async getAccessToken(): Promise<string> {
    const appId = process.env.WX_APP_ID;
    const appSecret = process.env.WX_APP_SECRET;
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

    try {
      const response = await axios.get(url);
      if (response.data.errcode) {
        throw new Error(response.data.errmsg);
      }
      return response.data.access_token;
    } catch (error) {
      this.logger.error('获取AccessToken失败', error);
      throw new UnauthorizedException('获取AccessToken失败');
    }
  }

  /**
   * 解密微信数据
   */
  private decryptData(encryptedData: string, sessionKey: string, iv: string) {
    const key = Buffer.from(sessionKey, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const encrypted = Buffer.from(encryptedData, 'base64');

    const decipher = crypto.createDecipheriv('aes-128-cbc', key, ivBuffer);
    decipher.setAutoPadding(true);

    let decoded = decipher.update(encrypted, undefined, 'utf8');
    decoded += decipher.final('utf8');

    return JSON.parse(decoded);
  }

  /**
   * 加密 session_key
   */
  private encryptSessionKey(sessionKey: string): string {
    const key = process.env.ENCRYPT_KEY;
    if (!key || key.length !== 64) {
      throw new Error('ENCRYPT_KEY 必须是32字节的hex字符串（64个字符）');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv,
    );

    let encrypted = cipher.update(sessionKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 加密手机号
   */
  private encryptPhone(phone: string): string {
    return this.encryptSessionKey(phone);
  }

  /**
   * 手机号脱敏
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length !== 11) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  /**
   * 生成 JWT Tokens
   */
  private async generateTokens(userId: string, openid: string) {
    const payload = { sub: userId, openid };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '2h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7200,
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      return this.generateTokens(payload.sub, payload.openid);
    } catch (error) {
      throw new UnauthorizedException('Token已过期');
    }
  }
}
