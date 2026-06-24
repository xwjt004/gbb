import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { WxOfficialAccountService } from './wx-official-account.service';

@Controller('wx-official-account/oauth')
export class WxOfficialAccountOAuthController {
  private readonly logger = new Logger(WxOfficialAccountOAuthController.name);

  constructor(
    private readonly officialAccountService: WxOfficialAccountService,
  ) {}

  /**
   * 发起微信静默授权
   * GET /wx-official-account/oauth/authorize?redirect=/h5/orders
   */
  @Get('authorize')
  authorize(
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const appId = this.officialAccountService.officialAppId;
    const domain = process.env.H5_DOMAIN || 'https://guaibaobao.cn';

    const callbackUrl = encodeURIComponent(
      `${domain}/api/v1/wx-official-account/oauth/callback?redirect=${encodeURIComponent(redirect)}`,
    );

    const authUrl =
      `https://open.weixin.qq.com/connect/oauth2/authorize`
      + `?appid=${appId}`
      + `&redirect_uri=${callbackUrl}`
      + `&response_type=code`
      + `&scope=snsapi_base`
      + `&state=STATE#wechat_redirect`;

    this.logger.log(`OAuth 授权跳转: redirect=${redirect}`);
    res.redirect(authUrl);
  }

  /**
   * OAuth 授权回调
   * 微信授权后跳转到此地址，用 code 换取 openid
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    try {
      const appId = this.officialAccountService.officialAppId;
      const appSecret = this.officialAccountService.officialAppSecret;

      // 用 code 换取 openid
      const url =
        `https://api.weixin.qq.com/sns/oauth2/access_token`
        + `?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;

      const { data } = await axios.get(url);

      if (data.errcode) {
        throw new Error(`OAuth 授权失败: ${data.errmsg}`);
      }

      const openid = data.openid;

      this.logger.log(`OAuth 授权成功: openid=${openid}`);

      // 生成简单的 session token
      const sessionToken = Buffer.from(
        JSON.stringify({ openid, t: Date.now() }),
      ).toString('base64');

      const h5Domain = process.env.H5_DOMAIN || 'https://guaibaobao.cn';

      // 跳转到目标 H5 页面，带上 token
      const separator = redirect.includes('?') ? '&' : '?';
      const targetUrl = `${h5Domain}${redirect}${separator}token=${sessionToken}&openid=${openid}`;
      res.redirect(targetUrl);
    } catch (error) {
      this.logger.error(`OAuth 回调处理失败: ${error.message}`);
      res.redirect(`${process.env.H5_DOMAIN || 'https://guaibaobao.cn'}/h5/error?msg=授权失败`);
    }
  }
}
