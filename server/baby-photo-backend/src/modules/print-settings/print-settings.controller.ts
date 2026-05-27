import { Controller, Get, Put, Body } from '@nestjs/common';
import { PrintSettingsService } from './print-settings.service';
import { UpdatePrintSettingsDto } from './dto/update-print-settings.dto';

@Controller('print-settings')
export class PrintSettingsController {
  constructor(private readonly printSettingsService: PrintSettingsService) {}

  /**
   * 获取打印设置
   * GET /api/v1/print-settings
   */
  @Get()
  async getPrintSettings() {
    try {
      const data = await this.printSettingsService.getPrintSettings();
      return {
        code: 200,
        message: '获取打印设置成功',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: '获取打印设置失败: ' + error.message,
        data: null,
      };
    }
  }

  /**
   * 更新打印设置
   * PUT /api/v1/print-settings
   */
  @Put()
  async updatePrintSettings(@Body() updateDto: UpdatePrintSettingsDto) {
    try {
      const data = await this.printSettingsService.updatePrintSettings(updateDto);
      return {
        code: 200,
        message: '更新打印设置成功',
        data,
      };
    } catch (error) {
      return {
        code: 500,
        message: '更新打印设置失败: ' + error.message,
        data: null,
      };
    }
  }
}
