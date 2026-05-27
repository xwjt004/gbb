import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { WxMallService } from './wx-mall.service';
import { QueryPackagesDto } from './dto/query-packages.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CalculateDiyDto } from './dto/calculate-diy.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

@Controller('wx-mall')
export class WxMallController {
  constructor(private readonly wxMallService: WxMallService) {}

  /**
   * 获取首页数据
   * GET /api/v1/wx-mall/home
   */
  @Get('home')
  async getHomeData() {
    return this.wxMallService.getHomeData();
  }

  /**
   * 获取商品分类列表
   * GET /api/v1/wx-mall/product-categories
   */
  @Get('product-categories')
  async getProductCategories() {
    return this.wxMallService.getProductCategories();
  }

  /**
   * 获取套系分类列表
   * GET /api/v1/wx-mall/categories
   */
  @Get('categories')
  async getPackageCategories() {
    return this.wxMallService.getPackageCategories();
  }

  /**
   * 获取套系列表
   * GET /api/v1/wx-mall/packages?category=BABY&page=1&limit=10
   */
  @Get('packages')
  async getPackages(@Query() query: QueryPackagesDto) {
    return this.wxMallService.getPackages(query);
  }

  /**
   * 获取套系详情
   * GET /api/v1/wx-mall/packages/:id
   */
  @Get('packages/:id')
  async getPackageById(@Param('id', ParseIntPipe) id: number) {
    return this.wxMallService.getPackageById(id);
  }

  /**
   * 获取商品列表
   * GET /api/v1/wx-mall/products?category=PHOTO&page=1&limit=10
   */
  @Get('products')
  async getProducts(@Query() query: QueryProductsDto) {
    return this.wxMallService.getProducts(query);
  }

  /**
   * 获取商品详情
   * GET /api/v1/wx-mall/products/:id
   */
  @Get('products/:id')
  async getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.wxMallService.getProductById(id);
  }

  /**
   * 计算 DIY 套系价格
   * POST /api/v1/wx-mall/diy/calculate
   * 需要登录
   */
  @Post('diy/calculate')
  @UseGuards(WxJwtAuthGuard)
  async calculateDiyPrice(@Body() dto: CalculateDiyDto) {
    return this.wxMallService.calculateDiyPrice(dto);
  }

  /**
   * 获取可用的预约时间槽
   * GET /api/v1/wx-mall/timeslots?date=2024-11-21
   */
  @Get('timeslots')
  async getAvailableTimeSlots(@Query('date') date: string) {
    return this.wxMallService.getAvailableTimeSlots(date);
  }

  /**
   * 搜索商品和套系
   * GET /api/v1/wx-mall/search?keyword=宝宝&type=all
   */
  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('type') type?: 'package' | 'product' | 'all',
  ) {
    return this.wxMallService.search(keyword, type);
  }
}
