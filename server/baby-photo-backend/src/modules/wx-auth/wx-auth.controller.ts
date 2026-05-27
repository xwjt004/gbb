import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WxAuthService } from './wx-auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { PhoneAuthDto } from './dto/phone-auth.dto';
import { WxJwtAuthGuard } from './guards/wx-jwt-auth.guard';

@ApiTags('微信授权')
@Controller('wx-auth')
export class WxAuthController {
  constructor(private readonly wxAuthService: WxAuthService) {}

  @Post('login')
  @ApiOperation({ summary: '微信登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '登录失败' })
  async login(@Body() loginDto: WxLoginDto) {
    return this.wxAuthService.login(loginDto);
  }

  @Post('phone')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取手机号' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getPhone(@Request() req: any, @Body() phoneDto: PhoneAuthDto) {
    return this.wxAuthService.getPhoneNumber(req.user.id, phoneDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新Token' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: 'Token无效' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.wxAuthService.refreshToken(refreshToken);
  }
}
