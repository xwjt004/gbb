import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WxCouponService } from './wx-coupon.service';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';
import {
  QueryCouponsDto,
  QueryMyCouponsDto,
  QueryAvailableCouponsDto,
} from './dto/query-coupons.dto';
import { ClaimCouponDto } from './dto/claim-coupon.dto';

@ApiTags('微信小程序-优惠券')
@Controller('wx-coupon')
export class WxCouponController {
  constructor(private readonly wxCouponService: WxCouponService) {}

  @Get()
  @ApiOperation({ summary: '获取可领取优惠券列表' })
  async getAvailableCoupons(@Req() req: any, @Query() query: QueryCouponsDto) {
    // 优惠券列表不需要登录,但需要用户ID来判断是否已领取
    const wxUserId = req.user?.id || 'guest';
    return this.wxCouponService.getAvailableCoupons(wxUserId, query);
  }

  @Post('claim')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '领取优惠券' })
  async claimCoupon(@Req() req: any, @Body() dto: ClaimCouponDto) {
    const wxUserId = req.user.id;
    return this.wxCouponService.claimCoupon(wxUserId, dto);
  }

  @Get('my')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的优惠券列表' })
  async getMyCoupons(@Req() req: any, @Query() query: QueryMyCouponsDto) {
    const wxUserId = req.user.id;
    return this.wxCouponService.getMyCoupons(wxUserId, query);
  }

  @Get('available-for-order')
  @UseGuards(WxJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取订单可用优惠券列表' })
  async getAvailableCouponsForOrder(
    @Req() req: any,
    @Query() query: QueryAvailableCouponsDto,
  ) {
    const wxUserId = req.user.id;
    return this.wxCouponService.getAvailableCouponsForOrder(wxUserId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取优惠券详情' })
  async getCouponDetail(@Param('id') id: string, @Req() req: any) {
    const wxUserId = req.user?.id;
    return this.wxCouponService.getCouponDetail(id, wxUserId);
  }
}

