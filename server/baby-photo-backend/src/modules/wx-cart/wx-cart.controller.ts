import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WxCartService } from './wx-cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

@ApiTags('微信购物车')
@Controller('wx-cart')
@UseGuards(WxJwtAuthGuard)
@ApiBearerAuth()
export class WxCartController {
  constructor(private readonly wxCartService: WxCartService) {}

  @Get()
  @ApiOperation({ summary: '获取购物车列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCart(@Request() req: any) {
    return this.wxCartService.getCart(req.user.id);
  }

  @Post('add')
  @ApiOperation({ summary: '添加到购物车' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 404, description: '商品或套系不存在' })
  async addToCart(@Request() req: any, @Body() dto: AddToCartDto) {
    return this.wxCartService.addToCart(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新购物车项' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '购物车项不存在' })
  @ApiResponse({ status: 403, description: '无权操作' })
  async updateCart(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.wxCartService.updateCart(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除购物车项' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '购物车项不存在' })
  @ApiResponse({ status: 403, description: '无权操作' })
  async removeFromCart(@Request() req: any, @Param('id') id: string) {
    return this.wxCartService.removeFromCart(req.user.id, id);
  }

  @Post('clear')
  @ApiOperation({ summary: '清空购物车' })
  @ApiResponse({ status: 200, description: '清空成功' })
  async clearCart(@Request() req: any) {
    return this.wxCartService.clearCart(req.user.id);
  }
}
