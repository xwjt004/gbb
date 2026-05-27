import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WxAddressService } from './wx-address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

/**
 * 微信地址管理控制器
 * 提供收货地址的 CRUD 接口
 */
@ApiTags('微信地址管理')
@Controller('wx-address')
@UseGuards(WxJwtAuthGuard)
@ApiBearerAuth()
export class WxAddressController {
  constructor(private readonly wxAddressService: WxAddressService) {}

  /**
   * 获取地址列表
   */
  @Get()
  @ApiOperation({ summary: '获取用户的所有地址' })
  @ApiResponse({
    status: 200,
    description: '获取成功，返回地址列表（默认地址在最前）',
  })
  async findAll(@Request() req: any) {
    return this.wxAddressService.findAll(req.user.id);
  }

  /**
   * 获取默认地址
   */
  @Get('default')
  @ApiOperation({ summary: '获取默认地址' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  @ApiResponse({
    status: 404,
    description: '没有设置默认地址',
  })
  async getDefault(@Request() req: any) {
    return this.wxAddressService.getDefault(req.user.id);
  }

  /**
   * 获取单个地址详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取地址详情' })
  @ApiParam({
    name: 'id',
    description: '地址ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
  })
  @ApiResponse({
    status: 404,
    description: '地址不存在',
  })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.wxAddressService.findOne(req.user.id, id);
  }

  /**
   * 创建新地址
   */
  @Post()
  @ApiOperation({ summary: '创建新地址' })
  @ApiResponse({
    status: 201,
    description: '创建成功',
  })
  @ApiResponse({
    status: 400,
    description: '参数验证失败',
  })
  async create(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.wxAddressService.create(req.user.id, dto);
  }

  /**
   * 更新地址
   */
  @Put(':id')
  @ApiOperation({ summary: '更新地址' })
  @ApiParam({
    name: 'id',
    description: '地址ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({
    status: 404,
    description: '地址不存在',
  })
  @ApiResponse({
    status: 400,
    description: '参数验证失败',
  })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.wxAddressService.update(req.user.id, id, dto);
  }

  /**
   * 删除地址
   */
  @Delete(':id')
  @ApiOperation({ summary: '删除地址' })
  @ApiParam({
    name: 'id',
    description: '地址ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({
    status: 404,
    description: '地址不存在',
  })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.wxAddressService.remove(req.user.id, id);
  }

  /**
   * 设置默认地址
   */
  @Patch(':id/default')
  @ApiOperation({ summary: '设置默认地址' })
  @ApiParam({
    name: 'id',
    description: '地址ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: '设置成功',
  })
  @ApiResponse({
    status: 404,
    description: '地址不存在',
  })
  async setDefault(@Request() req: any, @Param('id') id: string) {
    return this.wxAddressService.setDefault(req.user.id, id);
  }
}
