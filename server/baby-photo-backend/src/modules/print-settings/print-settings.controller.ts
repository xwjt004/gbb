import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { PrintSettingsService } from './print-settings.service';
import { UpdatePrintSettingsDto } from './dto/update-print-settings.dto';

@ApiTags('打印设置')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
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
