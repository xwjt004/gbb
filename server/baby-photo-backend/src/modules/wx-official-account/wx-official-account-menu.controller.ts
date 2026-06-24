import {
  Controller,
  Post,
  Logger,
} from '@nestjs/common';
import { WxOfficialAccountService } from './wx-official-account.service';

/**
 * 菜单管理控制器
 * 调用 POST /wx-official-account/menu/create 创建公众号菜单
 *
 * 菜单设计原则：最简洁实用
 * - 预约套系 → 引导下单
 * - 门店服务 → 到店相关 + 客服
 * - 会员专区 → 个人中心 + 增值内容
 */
@Controller('wx-official-account/menu')
export class WxOfficialAccountMenuController {
  private readonly logger = new Logger(WxOfficialAccountMenuController.name);

  constructor(
    private readonly officialAccountService: WxOfficialAccountService,
  ) {}

  @Post('create')
  async createDefaultMenu() {
    const BASE = 'https://guaibaobao.cn/api/v1/wx-official-account/jump';
    const MP_APPID = this.officialAccountService.miniProgramAppId;

    const menu = {
      button: [
        {
          name: '预约套系',
          sub_button: [
            {
              type: 'miniprogram',
              name: '套系查看',
              url: `${BASE}?p=packages`,
              appid: MP_APPID,
              pagepath: 'pages/packages/list/list',
            },
            {
              type: 'miniprogram',
              name: '团购活动',
              url: `${BASE}?p=group-buys`,
              appid: MP_APPID,
              pagepath: 'pages/group-buy/list/list',
            },
          ],
        },
        {
          name: '门店服务',
          sub_button: [
            {
              type: 'miniprogram',
              name: '作品欣赏',
              url: `${BASE}?p=portfolio`,
              appid: MP_APPID,
              pagepath: 'pages/works/works',
            },
            {
              type: 'miniprogram',
              name: '导航到店',
              url: `${BASE}?p=store-nav`,
              appid: MP_APPID,
              pagepath: 'pages/store-nav/store-nav',
            },
            {
              type: 'click',
              name: '联系客服',
              key: 'CONTACT',
            },
          ],
        },
        {
          name: '会员专区',
          sub_button: [
            {
              type: 'miniprogram',
              name: '我的订单',
              url: `${BASE}?p=orders`,
              appid: MP_APPID,
              pagepath: 'pages/order/list/list',
            },
            {
              type: 'miniprogram',
              name: '会员中心',
              url: `${BASE}?p=profile`,
              appid: MP_APPID,
              pagepath: 'pages/profile/profile',
            },
            {
              type: 'click',
              name: '孕婴知识',
              key: 'BABY_KNOWLEDGE',
            },
          ],
        },
      ],
    };

    await this.officialAccountService.createMenu(menu);
    this.logger.log('默认菜单已创建');
    return { code: 200, message: '菜单创建成功' };
  }
}
