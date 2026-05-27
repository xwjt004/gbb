// filepath: /home/liyong/gbb/server/baby-photo-backend/src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchDto } from './dto/user-search.dto';
import { UsersWxLoginDto } from './dto/wx-login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 微信小程序登录
   */
  @Post('wx-login')
  @ApiOperation({ summary: '微信小程序登录' })
  async wxLogin(@Body() wxLoginDto: UsersWxLoginDto) {
    this.logger.log(`微信登录: ${JSON.stringify(wxLoginDto)}`);
    return this.usersService.wxLogin(wxLoginDto);
  }

  /**
   * 创建用户
   */
  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  async create(@Body() createUserDto: CreateUserDto) {
    this.logger.log(`创建用户: ${JSON.stringify(createUserDto)}`);
    return this.usersService.create(createUserDto);
  }

  /**
   * 导出用户数据
   */
  @Get('export')
  @ApiOperation({ summary: '导出用户数据' })
  @ApiResponse({ status: 200, description: '成功导出用户数据' })
  async exportUsers(@Query() searchDto: UserSearchDto) {
    this.logger.log(`导出用户数据: ${JSON.stringify(searchDto)}`);
    return this.usersService.exportUsers(searchDto);
  }

  /**
   * 获取所有用户（支持搜索和分页）
   */
  @Get()
  @ApiOperation({ summary: '获取所有用户' })
  async findAll(@Query() searchDto: UserSearchDto) {
    this.logger.log(`查询用户列表: ${JSON.stringify(searchDto)}`);
    return this.usersService.findAll(searchDto);
  }

  /**
   * 通过手机号查找用户
   */
  @Get('by-phone/:phone')
  @ApiOperation({ summary: '根据电话号码获取用户' })
  @ApiResponse({ status: 200, description: '成功获取用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findByPhone(@Param('phone') phone: string) {
    this.logger.log(`通过手机号查找用户: ${phone}`);
    return this.usersService.findByPhone(phone);
  }

  /**
   * 通过昵称查找用户（支持模糊搜索）
   */
  @Get('by-nickname')
  @ApiOperation({ summary: '通过昵称查找用户' })
  async findByNickname(
    @Query('nickname') nickname: string,
    @Query('fuzzy') fuzzy?: string,
  ) {
    this.logger.log(`通过昵称查找用户: ${nickname}, 模糊搜索: ${fuzzy}`);
    const isFuzzy = fuzzy === 'true';
    return this.usersService.findByNickname(nickname, isFuzzy);
  }

  /**
   * 获取全局用户统计
   */
  @Get('statistics/global')
  @ApiOperation({ summary: '获取用户总体统计' })
  async getStatistics() {
    this.logger.log('获取用户总体统计');
    return this.usersService.getStatistics();
  }

  /**
   * 获取用户统计信息
   */
  @Get(':id/statistics')
  @ApiOperation({ summary: '获取用户统计信息' })
  async getUserStatistics(@Param('id') id: string) {
    this.logger.log(`获取用户统计信息: ${id}`);
    return this.usersService.getUserStatistics(id);
  }

  /**
   * 获取用户订单历史
   */
  @Get(':id/orders')
  @ApiOperation({ summary: '获取用户订单历史' })
  async getUserOrders(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`获取用户订单历史: ${id}`);
    return this.usersService.getUserOrders(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  /**
   * 切换用户启用/禁用状态
   */
  @Patch(':id/toggle-status')
  @ApiOperation({ summary: '切换用户启用/禁用状态' })
  async toggleStatus(@Param('id') id: string) {
    this.logger.log(`切换用户状态: ${id}`);
    return this.usersService.toggleStatus(id);
  }

  /**
   * 获取摄影师列表（用于拍摄日程分配）
   */
  @Get('photographers')
  @ApiOperation({ summary: '获取摄影师列表' })
  async getPhotographers() {
    const users = await this.usersService.findPhotographers();
    return {
      code: 200,
      message: '查询成功',
      data: users,
    };
  }

  /**
   * 获取用户详情
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID获取用户' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`获取用户详情: ${id}`);
    return this.usersService.findOne(id);
  }

  /**
   * 更新用户信息
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    this.logger.log(`更新用户: ${id}, 数据: ${JSON.stringify(updateUserDto)}`);
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * 删除用户
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: string) {
    this.logger.log(`删除用户: ${id}`);
    return this.usersService.remove(id);
  }

  /**
   * 管理员登录
   */
  @Post('admin-login')
  @ApiOperation({ summary: '管理员登录' })
  @ApiResponse({ status: 201, description: '登录成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  async adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return this.usersService.adminLogin(adminLoginDto);
  }
}
