import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WxOrderService } from './wx-order.service';
import { CreateWxOrderDto, QueryMyOrdersDto } from './dto/create-wx-order.dto';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

@ApiTags('微信订单')
@Controller('wx-order')
@UseGuards(WxJwtAuthGuard)
@ApiBearerAuth()
export class WxOrderController {
  constructor(private readonly wxOrderService: WxOrderService) {}

  @Post('create')
  @ApiOperation({ summary: '从购物车创建订单' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '购物车项或地址不存在' })
  async createOrder(@Req() req: any, @Body() createDto: CreateWxOrderDto) {
    const wxUserId = req.user.id;
    return this.wxOrderService.createOrderFromCart(wxUserId, createDto);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的订单列表' })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  async getMyOrders(@Req() req: any, @Query() queryDto: QueryMyOrdersDto) {
    const wxUserId = req.user.id;
    return this.wxOrderService.getMyOrders(wxUserId, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '返回订单详情' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  async getOrderDetail(@Req() req: any, @Param('id') orderId: string) {
    const wxUserId = req.user.id;
    return this.wxOrderService.getOrderDetail(wxUserId, orderId);
  }
}
