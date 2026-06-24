import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';

@Injectable()
export class WxOfficialAccountService {
  private readonly logger = new Logger(WxOfficialAccountService.name);
  private readonly TOKEN_CACHE_KEY = 'wx:official:access_token';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // ==================== 配置 ====================

  private get appId(): string {
    return process.env.WX_OFFICIAL_APPID || process.env.WX_APP_ID || '';
  }

  private get appSecret(): string {
    return process.env.WX_OFFICIAL_APPSECRET || process.env.WX_APP_SECRET || '';
  }

  private get token(): string {
    return process.env.WX_OFFICIAL_TOKEN || '';
  }

  get officialToken(): string {
    return this.token;
  }

  get officialAppId(): string {
    return this.appId;
  }

  get officialAppSecret(): string {
    return this.appSecret;
  }

  get miniProgramAppId(): string {
    return process.env.WX_APP_ID || '';
  }

  // ==================== Token 管理 ====================

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string): boolean {
    const crypto = require('crypto');
    const arr = [this.token, timestamp, nonce].sort();
    const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
    return sha1 === signature;
  }

  /**
   * 获取公众号 access_token（带缓存）
   */
  async getAccessToken(): Promise<string> {
    return this.cacheService.getOrSet(
      this.TOKEN_CACHE_KEY,
      async () => {
        const url = `https://api.weixin.qq.com/cgi-bin/token`
          + `?grant_type=client_credential`
          + `&appid=${this.appId}&secret=${this.appSecret}`;

        const { data } = await axios.get(url);

        if (data.errcode) {
          throw new Error(`获取 access_token 失败: ${data.errmsg}`);
        }

        return data.access_token;
      },
      6900, // 7200 - 300 秒缓冲
    );
  }

  // ==================== 用户管理 ====================

  /**
   * 用户关注公众号
   */
  async subscribe(openid: string, sceneId?: string) {
    const existing = await this.prisma.officialAccountUser.findUnique({
      where: { openid },
    });

    if (existing) {
      await this.prisma.officialAccountUser.update({
        where: { openid },
        data: {
          subscribe: true,
          unsubscribeAt: null,
          sceneId: sceneId || existing.sceneId,
        },
      });
    } else {
      await this.prisma.officialAccountUser.create({
        data: {
          openid,
          subscribe: true,
          sceneId,
          subscribeAt: new Date(),
        },
      });
    }

    this.logger.log(`公众号关注: ${openid}`);
  }

  /**
   * 用户取消关注公众号
   */
  async unsubscribe(openid: string) {
    await this.prisma.officialAccountUser.updateMany({
      where: { openid, subscribe: true },
      data: {
        subscribe: false,
        unsubscribeAt: new Date(),
      },
    });

    this.logger.log(`公众号取关: ${openid}`);
  }

  // ==================== 菜单管理 ====================

  /**
   * 创建/更新自定义菜单
   */
  async createMenu(menuConfig: any): Promise<void> {
    const token = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`;

    const { data } = await axios.post(url, menuConfig);

    if (data.errcode && data.errcode !== 0) {
      throw new Error(`创建菜单失败: ${data.errmsg}`);
    }

    this.logger.log('自定义菜单创建成功');
  }

  // ==================== JS-SDK ====================

  private readonly TICKET_CACHE_KEY = 'wx:official:jsapi_ticket';

  /**
   * 获取 jsapi_ticket（带缓存）
   */
  async getJsApiTicket(): Promise<string> {
    return this.cacheService.getOrSet(
      this.TICKET_CACHE_KEY,
      async () => {
        const token = await this.getAccessToken();
        const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket`
          + `?access_token=${token}&type=jsapi`;

        const { data } = await axios.get(url);

        if (data.errcode) {
          throw new Error(`获取 jsapi_ticket 失败: ${data.errmsg}`);
        }

        return data.ticket;
      },
      6900,
    );
  }

  /**
   * 生成 JS-SDK 配置（供 wx.config 使用）
   */
  async getJsSdkConfig(url: string) {
    const ticket = await this.getJsApiTicket();
    const nonceStr = Math.random().toString(36).substring(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.signJsSdk(ticket, nonceStr, timestamp, url);

    return {
      appId: this.appId,
      timestamp,
      nonceStr,
      signature,
    };
  }

  private signJsSdk(
    ticket: string,
    nonceStr: string,
    timestamp: number,
    url: string,
  ): string {
    const crypto = require('crypto');
    const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    return crypto.createHash('sha1').update(raw).digest('hex');
  }

  // ==================== 小程序 URL Scheme ====================

  private readonly MP_TOKEN_CACHE_KEY = 'wx:mini-program:access_token';

  /**
   * 获取小程序 access_token（带缓存）
   */
  async getMiniProgramAccessToken(): Promise<string> {
    const appId = process.env.WX_APP_ID || '';
    const appSecret = process.env.WX_APP_SECRET || '';

    return this.cacheService.getOrSet(
      this.MP_TOKEN_CACHE_KEY,
      async () => {
        const url = `https://api.weixin.qq.com/cgi-bin/token`
          + `?grant_type=client_credential`
          + `&appid=${appId}&secret=${appSecret}`;

        const { data } = await axios.get(url);

        if (data.errcode) {
          throw new Error(`获取小程序 access_token 失败: ${data.errmsg}`);
        }

        return data.access_token;
      },
      6900,
    );
  }

  /**
   * 生成小程序 URL Scheme（HTTPS 链接，在微信内打开即跳转小程序）
   */
  async generateUrlScheme(path: string, query?: string): Promise<string> {
    const cacheKey = `wx:mini-program:scheme:${path}${query ? '?' + query : ''}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const token = await this.getMiniProgramAccessToken();
        const url = `https://api.weixin.qq.com/wxa/generatescheme?access_token=${token}`;

        const { data } = await axios.post(url, {
          jump_wxa: {
            path: `/${path}`,
            query: query || '',
          },
          is_expire: false, // 永久有效
        });

        if (data.errcode && data.errcode !== 0) {
          throw new Error(`生成 URL Scheme 失败: ${data.errmsg}`);
        }

        return data.openlink;
      },
      86400 * 30, // 缓存 30 天（永久 scheme 不变）
    );
  }

  // ==================== 小程序头像 ====================

  private readonly MP_HEAD_IMG_KEY = 'wx:mini-program:head_img';

  /**
   * 获取小程序头像 URL（带缓存，从微信 API 获取）
   */
  async getMiniProgramHeadImageUrl(): Promise<string> {
    return this.cacheService.getOrSet(
      this.MP_HEAD_IMG_KEY,
      async () => {
        try {
          const token = await this.getMiniProgramAccessToken();
          const { data } = await axios.get(
            `https://api.weixin.qq.com/cgi-bin/account/getaccountbasicinfo?access_token=${token}`,
          );
          if (data.head_img) {
            this.logger.log(`获取小程序头像成功: ${data.head_img}`);
            return data.head_img;
          }
        } catch (err) {
          this.logger.warn(`获取小程序头像失败: ${err.message}，使用默认头像`);
        }

        // 兜底：返回 Logo 图片
        return '/uploads/logo.png';
      },
      86400 * 7, // 缓存 7 天（头像不常变）
    );
  }

  // ==================== 模板消息 ====================

  /**
   * 发送模板消息
   */
  async sendTemplate(
    openid: string,
    templateId: string,
    data: Record<string, any>,
    url?: string,
  ) {
    const token = await this.getAccessToken();
    const apiUrl =
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;

    const body: any = {
      touser: openid,
      template_id: templateId,
      data,
    };
    if (url) body.url = url;

    const response = await axios.post(apiUrl, body);
    const result = response.data;

    // 记录发送日志
    await this.prisma.templateMessageLog.create({
      data: {
        openid,
        templateId,
        status: result.errcode === 0 ? 'SENT' : 'FAILED',
        errorMsg: result.errcode !== 0 ? result.errmsg : undefined,
        sentAt: new Date(),
      },
    });

    return result;
  }

  /**
   * 向所有关注用户发送模板消息
   * 用于新产品/套系/作品发布等场景的通知推送
   */
  async notifyAllSubscribers(
    templateId: string,
    data: Record<string, any>,
    url?: string,
  ) {
    const users = await this.prisma.officialAccountUser.findMany({
      where: { subscribe: true },
      select: { openid: true },
    });

    if (users.length === 0) {
      this.logger.log('没有关注用户，跳过推送');
      return { success: 0, failed: 0, total: 0 };
    }

    this.logger.log(`开始推送通知给 ${users.length} 位用户`);

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.sendTemplate(user.openid, templateId, data, url);
        success++;
      } catch (err) {
        failed++;
        this.logger.error(`推送失败 ${user.openid}: ${err.message}`);
      }

      // 每 100 条暂停 1 秒，避免触发频率限制
      if ((success + failed) % 100 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    this.logger.log(`推送完成: 成功=${success}, 失败=${failed}`);
    return { success, failed, total: users.length };
  }

  // ==================== 带参二维码 ====================

  /**
   * 创建永久带参二维码
   */
  async createPermanentQRCode(sceneStr: string) {
    const token = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${token}`;

    const { data } = await axios.post(url, {
      action_name: 'QR_LIMIT_STR_SCENE',
      action_info: { scene: { scene_str: sceneStr } },
    });

    // 存入数据库
    await this.prisma.qRCode.create({
      data: {
        sceneStr,
        ticket: data.ticket,
        url: data.url,
      },
    });

    return data;
  }

  /**
   * 处理扫码事件
   */
  async handleScan(openid: string, sceneStr: string) {
    // 更新扫码次数
    await this.prisma.qRCode.updateMany({
      where: { sceneStr },
      data: { scanCount: { increment: 1 } },
    });

    this.logger.log(`扫码事件: openid=${openid}, scene=${sceneStr}`);
    return sceneStr;
  }

  // ==================== 客服消息推送（替代模板消息） ====================

  /**
   * 生成占位图片（64x64 品牌色 PNG）
   * 用于小程序卡片的缩略图
   */
  private createPlaceholderImage(): Buffer {
    const width = 64;
    const height = 64;

    // CRC32
    const crcTable = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[i] = c;
    }
    const crc32 = (buf: Buffer): number => {
      let crc = 0xffffffff;
      for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    };

    // 像素数据（品牌色 #FF6B9D）
    const rawData = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y++) {
      const off = y * (1 + width * 3);
      rawData[off] = 0; // filter None
      for (let x = 0; x < width; x++) {
        const p = off + 1 + x * 3;
        rawData[p] = 255;     // R
        rawData[p + 1] = 107; // G
        rawData[p + 2] = 157; // B
      }
    }
    const compressed = zlib.deflateSync(rawData);

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    const chunk = (type: string, data: Buffer): Buffer[] => {
      const t = Buffer.from(type, 'ascii');
      const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
      const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
      return [len, t, data, c];
    };

    return Buffer.concat([
      sig,
      ...chunk('IHDR', ihdr),
      ...chunk('IDAT', compressed),
      ...chunk('IEND', Buffer.alloc(0)),
    ]);
  }

  /**
   * 获取缩略图 media_id（上传到微信永久素材，用于客服消息小程序卡片）
   * 缓存 30 天（永久素材 media_id 不变）
   */
  async getNotifyThumbMediaId(): Promise<string> {
    return this.cacheService.getOrSet(
      'wx:official:notify_thumb',
      async () => {
        const token = await this.getAccessToken();
        const imageBuf = this.createPlaceholderImage();
        const tempPath = path.join('/tmp', `notify-thumb-${Date.now()}.png`);
        fs.writeFileSync(tempPath, imageBuf);

        let mediaId: string;
        try {
          const FormData = require('form-data');
          const form = new FormData();
          form.append('media', fs.createReadStream(tempPath), {
            filename: 'placeholder.png',
            contentType: 'image/png',
          });
          // 先尝试永久素材
          const { data } = await axios.post(
            `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
            form,
            { headers: { ...form.getHeaders() }, maxBodyLength: Infinity },
          );
          if (data.errcode) throw new Error(data.errmsg);
          mediaId = data.media_id;
        } catch {
          // 降级到临时素材（3 天有效期）
          const FormData = require('form-data');
          const form = new FormData();
          form.append('media', fs.createReadStream(tempPath), {
            filename: 'placeholder.png',
            contentType: 'image/png',
          });
          const { data } = await axios.post(
            `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=image`,
            form,
            { headers: { ...form.getHeaders() }, maxBodyLength: Infinity },
          );
          if (data.errcode) throw new Error(`上传临时图片失败: ${data.errmsg}`);
          mediaId = data.media_id;
        } finally {
          fs.unlinkSync(tempPath);
        }
        return mediaId;
      },
      86400 * 30, // 30 天缓存
    );
  }

  /**
   * 发送客服消息（小程序卡片）
   */
  async sendCustomMiniProgramMessage(
    openid: string,
    title: string,
    pagePath: string,
  ): Promise<any> {
    const token = await this.getAccessToken();
    const thumbMediaId = await this.getNotifyThumbMediaId();

    const { data } = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${token}`,
      {
        touser: openid,
        msgtype: 'miniprogrampage',
        miniprogrampage: {
          title,
          appid: this.miniProgramAppId,
          pagepath: pagePath,
          thumb_media_id: thumbMediaId,
        },
      },
    );

    return data;
  }

  /**
   * 向所有关注用户发送客服消息通知
   * 替代旧的模板消息推送方式
   */
  async notifyAllViaCustomMessage(
    type: string,
    name: string,
    pagePath: string,
  ) {
    const users = await this.prisma.officialAccountUser.findMany({
      where: { subscribe: true },
      select: { openid: true },
    });

    if (users.length === 0) {
      this.logger.log('没有关注用户，跳过推送');
      return { success: 0, failed: 0, total: 0 };
    }

    this.logger.log(`开始客服消息推送（${type}）给 ${users.length} 位用户`);

    const typeLabels: Record<string, string> = {
      product: '新品上架',
      package: '新套系发布',
      work: '新作品发布',
      groupbuy: '团购活动',
    };
    const title = `${typeLabels[type] || type}：${name}`;

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.sendCustomMiniProgramMessage(user.openid, title, pagePath);
        success++;
      } catch (err) {
        failed++;
        this.logger.error(`客服消息推送失败 ${user.openid}: ${err.message}`);
      }

      if ((success + failed) % 100 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    this.logger.log(`客服消息推送完成: 成功=${success}, 失败=${failed}`);
    return { success, failed, total: users.length };
  }
}
