import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdatePrintSettingsDto } from './dto/update-print-settings.dto';

@Injectable()
export class PrintSettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取打印设置
   * 如果不存在则创建默认设置(全部显示)
   */
  async getPrintSettings() {
    let settings = await this.prisma.printSettings.findFirst();

    // 如果不存在,创建默认设置
    if (!settings) {
      settings = await this.prisma.printSettings.create({
        data: {
          showShopName: true,
          showAddress: true,
          showPhone: true,
          showTelephone: false,
          showWechatId: true,
          showDouyinId: false,
          showKuaishouId: false,
          showXiaohongshuId: false,
          showBusinessScope: true,
          showBusinessHours: true,
        },
      });
    }

    return settings;
  }

  /**
   * 更新打印设置
   * 只有一条记录,采用upsert策略
   */
  async updatePrintSettings(updateDto: UpdatePrintSettingsDto) {
    const existing = await this.getPrintSettings();

    return this.prisma.printSettings.upsert({
      where: { id: existing.id },
      update: updateDto,
      create: updateDto,
    });
  }
}
