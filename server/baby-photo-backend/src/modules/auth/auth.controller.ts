import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersWxLoginDto, AdminLoginDto, PhoneLoginDto } from '../users/dto';

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
}
