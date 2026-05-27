import { Controller, Get, Post, Body, Patch, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WxUserService } from './wx-user.service';
import { QueryWxUserDto } from './dto/query-wx-user.dto';
import { UpdateWxUserDto } from './dto/update-wx-user.dto';

@ApiTags('客户管理')
@Controller('wx-users')
export class WxUserController {
  private readonly logger = new Logger(WxUserController.name);

  constructor(private readonly wxUserService: WxUserService) {}

  @Get('stats/overview')
  @ApiOperation({ summary: '客户统计概览' })
  async getStats() {
    return this.wxUserService.getStats();
  }

  @Get()
  @ApiOperation({ summary: '获取客户列表（分页）' })
  async findAll(@Query() query: QueryWxUserDto) {
    return this.wxUserService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取客户详情' })
  async findOne(@Param('id') id: string) {
    return this.wxUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新客户信息' })
  async update(@Param('id') id: string, @Body() dto: UpdateWxUserDto) {
    return this.wxUserService.update(id, dto);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: '获取客户的订单列表' })
  async getOrders(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.wxUserService.getOrders(id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 10);
  }
}
