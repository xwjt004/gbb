import { Injectable, UnauthorizedException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { PhoneAuthDto } from './dto/phone-auth.dto';
import { CacheService } from '../../shared/cache/cache.service';
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
    private cacheService: CacheService,
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

      // 查找是否有同 openid 的后台用户（自动关联）
      let linkedUserId: number | undefined;
      const existingUser = await this.prisma.user.findUnique({
        where: { openid: wxData.openid },
      });
      if (existingUser) {
        linkedUserId = existingUser.id;
      }

      // 查询最小会员等级作为新用户默认等级
      const defaultLevel = await this.prisma.memberLevel.findFirst({
        orderBy: { level: 'asc' },
        select: { name: true },
      });

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
          memberLevel: defaultLevel?.name || '普通会员',
          linkedUserId,
        },
      });
      this.logger.log(`创建新微信用户: ${wxUser.id}, linkedUserId: ${linkedUserId}`);
    } else {
      // 更新 session_key 和最后登录时间，并尝试关联后台用户
      let updateData: any = {
        sessionKey: this.encryptSessionKey(wxData.session_key),
        lastLoginAt: new Date(),
      };

      // 如果尚未关联，尝试通过 openid 自动关联
      if (!wxUser.linkedUserId) {
        const existingUser = await this.prisma.user.findUnique({
          where: { openid: wxData.openid },
        });
        if (existingUser) {
          updateData.linkedUserId = existingUser.id;
          this.logger.log(`自动关联微信用户 ${wxUser.id} → 后台用户 ${existingUser.id}`);
        }
      }

      await this.prisma.wxUser.update({
        where: { id: wxUser.id },
        data: updateData,
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
    const updateData: any = {
      phone: phoneData.purePhoneNumber,
      phoneEncrypted: encryptedPhone,
    };

    // 如果尚未关联后台用户，尝试通过手机号自动关联
    if (!wxUser.linkedUserId) {
      const userByPhone = await this.prisma.user.findFirst({
        where: { phone: phoneData.purePhoneNumber },
      });
      if (userByPhone) {
        updateData.linkedUserId = userByPhone.id;
        this.logger.log(`手机号绑定自动关联: 微信用户 ${userId} → 后台用户 ${userByPhone.id}`);
      }
    }

    await this.prisma.wxUser.update({
      where: { id: userId },
      data: updateData,
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
   * 获取微信 Access Token（带缓存，有效期 7200 秒，提前 5 分钟刷新）
   */
  private async getAccessToken(): Promise<string> {
    const cacheKey = 'wx:access_token';
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
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
      },
      6900, // TTL: 7200 - 300（预留 5 分钟缓冲）
    );
  }

  /**
   * 内容安全检测 — 文本（调用微信 msg_sec_check）
   * 检测失败时抛出 HttpException，API 异常仅记录日志不阻断
   */
  async checkText(content: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`;

    try {
      const response = await axios.post(url, { content });
      const data = response.data;

      if (data.errcode === 87014) {
        throw new HttpException('内容包含违规信息，请修改后重试', HttpStatus.BAD_REQUEST);
      }
      if (data.errcode !== 0) {
        this.logger.warn(`文本安全检测API异常: ${data.errcode} - ${data.errmsg}`);
      }
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error('文本安全检测请求失败', error);
    }
  }

  /**
   * 内容安全检测 — 图片（调用微信 img_sec_check）
   * 检测失败时抛出 HttpException，API 异常仅记录日志不阻断
   */
  async checkImage(imageUrl: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/img_sec_check?access_token=${accessToken}`;

    try {
      const response = await axios.post(url, { img_url: imageUrl });
      const data = response.data;

      if (data.errcode === 87014) {
        throw new HttpException('头像包含违规信息，请更换后重试', HttpStatus.BAD_REQUEST);
      }
      if (data.errcode !== 0) {
        this.logger.warn(`图片安全检测API异常: ${data.errcode} - ${data.errmsg}`);
      }
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error('图片安全检测请求失败', error);
    }
  }

  /**
   * 生成小程序码（B 方案：wxacode.getUnlimited，scene 参数长度最多 32 字符）
   * 返回图片 Buffer
   */
  async generateWxaCode(scene: string, page: string, checkPath = false): Promise<Buffer> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

    try {
      const response = await axios.post(
        url,
        {
          scene,
          page,
          check_path: checkPath,
          env_version: process.env.NODE_ENV === 'production' ? 'release' : 'trial',
          width: 280,
        },
        { responseType: 'arraybuffer' },
      );

      // 微信返回的 Content-Type 为 image/jpeg 表示成功，application/json 表示错误
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('image')) {
        return Buffer.from(response.data);
      }

      // 错误响应（JSON）
      const errData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
      this.logger.error(`生成小程序码失败: ${errData.errcode} - ${errData.errmsg}`);
      throw new HttpException('生成小程序码失败', HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error('生成小程序码请求失败', error);
      throw new HttpException('生成小程序码失败', HttpStatus.INTERNAL_SERVER_ERROR);
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
