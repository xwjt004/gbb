import {
  Controller,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import { WxOfficialAccountService } from './wx-official-account.service';

/**
 * 消息推送控制器
 * 向公众号关注用户推送客服消息（新产品/套系/作品/团购通知）
 *
 * 使用客服消息接口发送小程序卡片，无需配置模板
 */
@Controller('wx-official-account/notify')
export class WxOfficialAccountNotifyController {
  private readonly logger = new Logger(WxOfficialAccountNotifyController.name);

  constructor(
    private readonly officialAccountService: WxOfficialAccountService,
  ) {}

  /** 通知类型 → 小程序页面路径映射 */
  private readonly pageMap: Record<string, string> = {
    product: 'pages/product/list',
    package: 'pages/packages/list/list',
    work: 'pages/works/works',
    groupbuy: 'pages/group-buy/list/list',
  };

  /**
   * 发送通知
   */
  @Post()
  async notify(@Body() dto: { type: string; name: string; page?: string }) {
    const pagePath = dto.page || this.pageMap[dto.type];
    if (!pagePath) {
      return {
        code: 400,
        message: `未知的通知类型：${dto.type}，请指定 page 参数`,
      };
    }

    const result = await this.officialAccountService.notifyAllViaCustomMessage(
      dto.type,
      dto.name,
      pagePath,
    );

    this.logger.log(`客服消息推送完成: type=${dto.type}, name=${dto.name}, result=${JSON.stringify(result)}`);

    return {
      code: 200,
      message: `推送完成（成功 ${result.success} / 失败 ${result.failed} / 共 ${result.total} 人）`,
      data: result,
    };
  }
}
