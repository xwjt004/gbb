import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard';
import { SeasonalPricesService } from './seasonal-prices.service';
import { CreateSeasonalPriceDto } from './dto/create-seasonal-price.dto';
import { UpdateSeasonalPriceDto } from './dto/update-seasonal-price.dto';
import { QuerySeasonalPriceDto } from './dto/query-seasonal-price.dto';

@ApiTags('季节性价格')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('seasonal-prices')
export class SeasonalPricesController {
  constructor(private readonly service: SeasonalPricesService) {}

  @Post()
  @ApiOperation({ summary: '创建季节性价格' })
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() dto: CreateSeasonalPriceDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取季节性价格列表' })
  findAll(@Query() query: QuerySeasonalPriceDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取季节性价格详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新季节性价格' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeasonalPriceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除季节性价格' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
