import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Header,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { WxOfficialAccountService } from './wx-official-account.service';
import { parseXml, buildTextReply, buildEmptyReply } from './utils/xml-parser';

@Controller('wx-official-account')
export class WxOfficialAccountController {
  private readonly logger = new Logger(WxOfficialAccountController.name);

  // 关键词回复映射
  private readonly keywordReplies: Record<string, string> = {
    '地址': '📍 店铺地址：辽宁省锦州市黑山县启发路与东内环路交叉路口往西约150米(大红嘉园东侧)\n\n导航搜索"乖宝宝儿童摄影"即可到达。',
    '电话': '📞 座机：0416-5577456\n📱 客服手机：13841640830\n\n营业时间：9:00-18:00（周二至周日）',
    '客服': '📞 座机：0416-5577456\n📱 客服手机：13841640830\n\n营业时间：9:00-18:00（周二至周日）',
    '价格': '💝 我们有多个档次的套餐供您选择：\n\n🔸 体验套餐 198元\n🔸 经典套餐 398元\n🔸 尊享套餐 698元\n\n点击菜单「预约套系」查看全部套系详情。',
    '套餐': '📸 点击菜单「预约套系」→「套系查看」，浏览全部套系详情和价格。',
    '预约': '📅 点击菜单「预约套系」→「套系查看」，选择心仪套系后在线预约。',
    '新人': '🎉 欢迎新朋友！点击菜单「会员专区」→「会员中心」领取新人专属优惠券。',
    '优惠': '💎 当前优惠活动：\n1. 新人专享：关注即送 50 元优惠券\n2. 团购活动：参团享低至 5 折\n3. 推荐有礼：推荐好友各得 30 元\n\n详情点击菜单查看。',
    '帮助': '📋 回复以下关键词获取帮助：\n\n「地址」- 店铺位置\n「电话」- 客服电话\n「价格」- 套餐价格\n「预约」- 在线预约\n「套餐」- 套系查看\n「优惠」- 最新优惠\n「新人」- 新人福利\n「孕婴」- 孕婴知识',
    '孕婴': '📖 孕婴知识小课堂\n\n🤰 孕期知识\n孕期饮食注意事项、产检项目和时间表\n\n👶 育儿知识\n新生儿护理、喂养指南、常见问题\n\n📈 成长发育\n宝宝各月龄发育特点和早教建议\n\n🍳 辅食制作\n辅食添加顺序、食谱推荐\n\n📸 拍照技巧\n在家给宝宝拍出专业感照片的小技巧\n\n回复以上关键词获取详细内容 💕',
    '孕期': '🤰 孕期小贴士\n\n🥦 饮食建议\n• 前3月补充叶酸\n• 多吃蛋白质、钙铁丰富的食物\n• 避免生冷、辛辣刺激\n\n📋 产检时间表\n• 6-8周：B超确认孕囊\n• 11-13周：NT检查\n• 16-20周：唐筛/无创DNA\n• 22-26周：四维彩超\n• 24-28周：糖耐量筛查\n• 34周后：每周胎心监护\n\n更多问题欢迎到店咨询 💕',
    '育儿': '👶 新生儿护理指南\n\n🍼 喂养\n• 母乳按需喂养，约2-3小时一次\n• 奶粉按说明冲调，水温40-50℃\n• 喂完拍嗝，防止吐奶\n\n😴 睡眠\n• 新生儿每天睡16-20小时\n• 仰卧睡姿，床上不放多余物品\n• 区分昼夜，白天不拉窗帘\n\n🛁 护理\n• 脐带未脱落前保持干燥\n• 洗澡水温38-40℃，5分钟内完成\n• 勤换尿布，预防红屁屁\n\n每个宝宝都是独一无二的天使 🌟',
    '辅食': '🍳 辅食添加指南\n\n⏰ 添加时间\n• 建议6个月开始添加\n• 最早不早于4个月，最晚不晚于8个月\n\n🥕 添加顺序\n• 第一阶段：强化铁米粉\n• 第二阶段：根茎类蔬菜泥（胡萝卜、南瓜）\n• 第三阶段：水果泥（苹果、香蕉）\n• 第四阶段：肉泥、肝泥\n\n📝 注意事项\n• 每次只添加一种新食物，观察3天\n• 由稀到稠、由细到粗\n• 1岁前不加盐、糖、蜂蜜\n\n记录宝宝的美食探索之旅 🎉',
  };

  constructor(
    private readonly officialAccountService: WxOfficialAccountService,
  ) {}

  /**
   * 获取 JS-SDK 配置（供 wx.config 使用）
   * 用于 wx-open-launch-weapp 等需要签名的接口
   */
  @Get('jssdk-config')
  async getJsSdkConfig(@Query('url') url: string) {
    return this.officialAccountService.getJsSdkConfig(url);
  }

  // 页面 → 小程序页面映射
  private readonly pageMap: Record<string, string> = {
    booking: 'pages/booking/date/date',
    packages: 'pages/packages/list/list',
    'group-buys': 'pages/group-buy/list/list',
    portfolio: 'pages/works/works',
    'store-nav': 'pages/store-nav/store-nav',
    orders: 'pages/order/list/list',
    profile: 'pages/profile/profile',
  };

  /**
   * 获取小程序 URL Scheme（HTTPS 链接，微信内打开直接跳转小程序）
   */
  @Get('url-scheme')
  async getUrlScheme(
    @Query('path') path: string,
    @Query('query') query?: string,
  ) {
    const openlink = await this.officialAccountService.generateUrlScheme(path, query);
    return { openlink };
  }

  /**
   * 轻量跳转页面（返回纯 HTML，不依赖前端 SPA）
   * 公众号菜单指向此链接，微信内置浏览器打开后立即跳转小程序
   */
  @Get('jump')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async jumpPage(@Query('p') page: string) {
    const mpPath = this.pageMap[page];
    if (!mpPath) {
      this.logger.warn(`未知的跳转页面: ${page}`);
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>页面不存在</title></head><body style="text-align:center;padding:40px;color:#999;font-size:14px;">页面不存在</body></html>';
    }

    let openlink = '';

    try {
      openlink = await this.officialAccountService.generateUrlScheme(mpPath);
    } catch (err) {
      this.logger.error(`生成 URL Scheme 失败: ${err.message}`);
    }

    if (!openlink) {
      return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>跳转失败</title></head><body style="text-align:center;padding:40px;color:#999;font-size:14px;">获取跳转链接失败，请重试</body></html>';
    }

    // 获取小程序头像
    let headImgUrl = '';
    try {
      headImgUrl = await this.officialAccountService.getMiniProgramHeadImageUrl();
    } catch {
      // 忽略
    }

    // 返回轻量 HTML 页面，立即跳转
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=${openlink}">
  <title>跳转中...</title>
  <style>
    body { margin:0; padding:0; background:linear-gradient(135deg,#fce4ec 0%,#f8f0ff 50%,#e8f5e9 100%); display:flex; justify-content:center; align-items:center; min-height:100vh; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
    .card { background:#fff; border-radius:16px; padding:48px 36px 36px; text-align:center; max-width:280px; width:88%; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .avatar { width:72px; height:72px; border-radius:50%; object-fit:cover; margin-bottom:16px; box-shadow:0 2px 12px rgba(0,0,0,0.1); }
    .title { margin:0 0 4px; font-size:18px; font-weight:600; color:#333; }
    .desc { margin:0 0 20px; color:#999; font-size:13px; }
    .btn { display:inline-block; width:200px; height:44px; line-height:44px; background:#07c160; color:#fff; text-decoration:none; border-radius:22px; font-size:16px; font-weight:500; }
    .btn:active { background:#06ad56; }
    .loading { margin-top:16px; color:#bbb; font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    ${headImgUrl ? '<img class="avatar" src="' + headImgUrl.replace(/"/g, '&quot;') + '" alt="乖宝宝儿童摄影">' : ''}
    <h2 class="title">乖宝宝儿童摄影</h2>
    <p class="desc">用镜头记录每一个幸福瞬间</p>
    <a class="btn" href="${openlink}">打开小程序</a>
    <p class="loading">正在跳转...</p>
  </div>
  <script>window.location.href="${openlink}";</script>
</body>
</html>`;
  }

  /**
   * 微信服务器验证（GET）
   * 公众号后台配置时，微信会发 GET 请求来验证服务器地址
   */
  @Get('callback')
  verifyToken(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
  ): string {
    const isValid = this.officialAccountService.verifySignature(
      signature,
      timestamp,
      nonce,
    );

    if (isValid) {
      this.logger.log('微信服务器验证通过');
      return echostr;
    }

    this.logger.warn('微信服务器验证失败');
    return '验证失败';
  }

  /**
   * 接收微信消息和事件推送（POST）
   * 用户发消息、点菜单、关注/取关等操作，微信都会 POST 到这里
   */
  @Post('callback')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async handleMessage(@Req() req: any, @Res() res: Response) {
    try {
      // NestJS 开启 rawBody 后，原始 XML 在 req.rawBody 中
      const xml = req.rawBody || req.body?.toString() || '';

      if (!xml) {
        this.logger.warn('收到空消息');
        return res.send(buildEmptyReply());
      }

      this.logger.debug(`收到消息: ${xml.substring(0, 200)}`);

      const msg = parseXml(xml);
      const MsgType = msg.MsgType;
      const FromUserName = msg.FromUserName;
      const ToUserName = msg.ToUserName;

      if (MsgType === 'text') {
        // 用户发送了文字消息 → 关键词自动回复
        const content = msg.Content?.trim() || '';
        const reply = this.matchKeyword(content, FromUserName, ToUserName);
        return res.send(reply);
      }

      if (MsgType === 'event') {
        const event = msg.Event;
        const eventKey = msg.EventKey;

        this.logger.log(`事件: ${event}, EventKey: ${eventKey}`);

        if (event === 'subscribe') {
          // 用户关注
          await this.officialAccountService.subscribe(
            FromUserName,
            eventKey || undefined,
          );
          const welcomeMsg =
            '🎉 欢迎关注乖宝宝儿童摄影！\n\n'
            + '📸 用镜头记录每一个幸福瞬间\n\n'
            + '👇 点击下方菜单栏开始体验\n\n'
            + '【预约套系】查看套系/团购活动\n'
            + '【门店服务】作品欣赏/导航到店/联系客服\n'
            + '【会员专区】我的订单/会员中心/孕婴知识\n\n'
            + '💝 回复「新人」领取专属优惠券\n'
            + '📍 回复「地址」查看店铺位置\n'
            + '📋 回复「帮助」查看更多功能';

          return res.send(buildTextReply(FromUserName, ToUserName, welcomeMsg));
        }

        if (event === 'unsubscribe') {
          // 用户取消关注
          await this.officialAccountService.unsubscribe(FromUserName);
          return res.send(buildEmptyReply());
        }

        if (event === 'SCAN') {
          // 已关注用户扫码
          await this.officialAccountService.handleScan(FromUserName, eventKey);
          return res.send(
            buildTextReply(FromUserName, ToUserName, '欢迎回来！点击菜单查看最新活动。'),
          );
        }

        if (event === 'CLICK') {
          // 菜单点击事件
          return res.send(this.handleMenuClick(FromUserName, ToUserName, eventKey));
        }
      }

      // 其他类型消息暂时不处理
      return res.send(buildEmptyReply());
    } catch (error) {
      this.logger.error(`消息处理失败: ${error.message}`);
      return res.send(buildEmptyReply());
    }
  }

  /**
   * 关键词匹配回复
   */
  private matchKeyword(content: string, fromUser: string, toUser: string): string {
    for (const [keyword, reply] of Object.entries(this.keywordReplies)) {
      if (content.includes(keyword)) {
        return buildTextReply(fromUser, toUser, reply);
      }
    }

    // 无匹配默认回复
    return buildTextReply(
      fromUser,
      toUser,
      '您好，欢迎来到乖宝宝儿童摄影！\n\n'
      + '👇 点击下方菜单栏\n'
      + '【预约套系】查看套系/团购活动\n'
      + '【门店服务】作品欣赏/导航到店/联系客服\n'
      + '【会员专区】我的订单/会员中心/孕婴知识\n\n'
      + '回复「帮助」查看更多功能\n'
      + '座机：0416-5577456\n'
      + '客服手机：13841640830',
    );
  }

  /**
   * 菜单点击处理
   */
  private handleMenuClick(fromUser: string, toUser: string, eventKey: string): string {
    switch (eventKey) {
      case 'CONTACT':
        return buildTextReply(
          fromUser,
          toUser,
          '📞 座机：0416-5577456\n📱 客服手机：13841640830\n营业时间：9:00-18:00（周二至周日）',
        );
      case 'BABY_KNOWLEDGE':
        return buildTextReply(
          fromUser,
          toUser,
          this.keywordReplies['孕婴'] || '📖 回复「孕婴」获取孕婴知识。',
        );
      case 'NEW_USER':
        return buildTextReply(
          fromUser,
          toUser,
          '🎉 感谢您的关注！请点击菜单「会员专区」→「会员中心」领取新人礼包。',
        );
      default:
        return buildEmptyReply();
    }
  }
}
