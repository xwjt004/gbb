import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersWxLoginDto, AdminLoginDto, PhoneLoginDto } from '../users/dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wechat/login')
  async wechatLogin(@Body() wxLoginDto: UsersWxLoginDto) {
    return this.authService.wechatLogin(wxLoginDto);
  }

  @Post('admin/login')
  async adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return this.authService.adminLogin(adminLoginDto);
  }

  @Post('phone/login')
  async phoneLogin(@Body() phoneLoginDto: PhoneLoginDto) {
    return this.authService.phoneLogin(phoneLoginDto);
  }

  @Post('change-password')
  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(
    @Req() req,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(req.user.id, oldPassword, newPassword);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Post('admin-reset-password')
  async adminResetPassword(
    @Body('adminUserId') adminUserId: number,
    @Body('targetUserId') targetUserId: number,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.adminResetUserPassword(adminUserId, targetUserId, newPassword);
  }
}
