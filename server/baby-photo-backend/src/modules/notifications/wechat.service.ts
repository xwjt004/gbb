import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

@Injectable()
export class WechatNotificationService {
  private readonly logger = new Logger(WechatNotificationService.name);
  private tokenCache: AccessTokenCache | null = null;
  private readonly API_BASE = 'https://api.weixin.qq.com';

  constructor(private configService: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const appId = this.configService.get<string>('WX_APP_ID');
    const appSecret = this.configService.get<string>('WX_APP_SECRET');

    if (!appId || !appSecret || appId === 'your-wechat-app-id') {
      throw new Error('微信配置缺失：请设置 WX_APP_ID 和 WX_APP_SECRET');
    }

    const res = await axios.get(`${this.API_BASE}/cgi-bin/token`, {
      params: { grant_type: 'client_credential', appid: appId, secret: appSecret },
    });

    if (res.data.errcode) {
      throw new Error(`获取 access_token 失败: ${res.data.errmsg} (${res.data.errcode})`);
    }

    this.tokenCache = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in - 300) * 1000,
    };

    return res.data.access_token;
  }

  async sendTemplateMessage(
    openid: string,
    templateId: string,
    data: Record<string, any>,
    page?: string,
  ): Promise<boolean> {
    const token = await this.getAccessToken();
    const url = `${this.API_BASE}/cgi-bin/message/subscribe/send?access_token=${token}`;

    const wechatData: Record<string, { value: string }> = {};
    for (const [key, value] of Object.entries(data)) {
      wechatData[key] = { value: String(value ?? '') };
    }

    const body: Record<string, any> = {
      touser: openid,
      template_id: templateId,
      data: wechatData,
    };

    if (page) body.page = page;

    const res = await axios.post(url, body);

    if (res.data.errcode === 0) {
      this.logger.log(`微信订阅消息发送成功: ${openid} 模板 ${templateId}`);
      return true;
    }

    if (res.data.errcode === 43101) {
      this.logger.warn(`用户未订阅模板消息: ${openid} (${res.data.errmsg})`);
      return false;
    }

    this.logger.error(`微信消息发送失败: ${res.data.errmsg} (${res.data.errcode})`);
    return false;
  }

  clearTokenCache(): void {
    this.tokenCache = null;
  }
}
