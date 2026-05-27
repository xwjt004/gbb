import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('系统信息')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取系统欢迎信息' })
  @ApiResponse({ status: 200, description: '返回系统欢迎信息' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '系统健康状态' })
  async getHealth() {
    return this.appService.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: '获取系统版本信息' })
  @ApiResponse({ status: 200, description: '系统版本信息' })
  getVersion() {
    return this.appService.getVersion();
  }
}
