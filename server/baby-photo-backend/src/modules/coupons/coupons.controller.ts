import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('优惠券管理')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Post()
  @ApiOperation({ summary: '创建优惠券' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取优惠券列表' })
  findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number, @Query('status') status?: string) {
    return this.service.findAll({ page, pageSize, status });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取优惠券详情' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新优惠券' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除优惠券' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
