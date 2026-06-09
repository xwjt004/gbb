import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WxOrderService } from './wx-order.service';
import { WechatPayService } from '../payments/wechat-pay.service';
import { PaymentsService } from '../payments/payments.service';
import { WxJwtAuthGuard } from '../wx-auth/guards/wx-jwt-auth.guard';

@ApiTags('微信订单(小程序)')
@Controller('wx-orders')
@UseGuards(WxJwtAuthGuard)
export class WxOrderPayController {
  private readonly logger = new Logger(WxOrderPayController.name);

  constructor(
    private readonly wxOrderService: WxOrderService,
    private readonly wechatPayService: WechatPayService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post(':id/pay')
  @ApiOperation({ summary: '发起支付' })
  async pay(
    @Req() req: any,
    @Param('id') orderId: string,
    @Body() body: { amount?: number; paymentMethod?: string },
  ) {
    const wxUserId = req.user.id;
    const order = await this.wxOrderService.getOrderDetail(wxUserId, orderId);
    if (!order) throw new NotFoundException('订单不存在');

    const openid = req.user.openid;
    if (!openid) throw new BadRequestException('无法获取用户openid');

    const amount = body.amount ?? Number(order.totalAmount);

    // 如果订单已支付，直接返回
    if (order.paymentStatus === 'FULLY_PAID' || order.paymentStatus === 'PAID') {
      return { code: 200, message: '订单已支付', paid: true, orderNo: order.orderNo };
    }

    // 检查是否有待支付的支付记录，没有则创建
    let paymentRecord = await this.paymentsService.findPendingPaymentByOrderNo(order.orderNo);
    if (!paymentRecord) {
      paymentRecord = await this.paymentsService.createPaymentRecord({
        orderId: order.id,
        orderNo: order.orderNo,
        amount,
        paymentMethod: 'WECHAT_PAY',
      });
      this.logger.log(`创建支付记录: ${paymentRecord.id} order=${order.orderNo}`);
    }

    try {
      const result = await this.wechatPayService.createJsapiOrder({
        orderId,
        orderNo: order.orderNo,
        amount,
        description: `乖宝宝摄影-${order.orderNo}`,
        openid,
      });

      return {
        code: 200,
        message: '支付参数获取成功',
        total_fee: result.total_fee,
        data: result,
      };
    } catch (error: any) {
      const wxMsg = error?.response?.data?.message || error?.message || '支付服务异常';
      this.logger.error(`支付失败 [${orderId}]: ${wxMsg}`);
      throw new InternalServerErrorException(`支付失败: ${wxMsg}`);
    }
  }

  /**
   * 支付成功后同步状态（小程序 wx.requestPayment 成功后调用）
   * 主动查询微信支付确认订单状态，避免依赖回调通知
   */
  @Post(':id/pay/sync')
  @ApiOperation({ summary: '同步支付状态(支付成功后主动查询)' })
  async syncPayStatus(
    @Req() req: any,
    @Param('id') orderId: string,
  ) {
    const wxUserId = req.user.id;
    const order = await this.wxOrderService.getOrderDetail(wxUserId, orderId);
    if (!order) throw new NotFoundException('订单不存在');

    // 如果订单已支付，直接返回
    if (order.paymentStatus === 'FULLY_PAID' || order.paymentStatus === 'PAID') {
      return { code: 200, message: '订单已支付', paid: true, orderNo: order.orderNo };
    }

    // 查询微信支付状态
    try {
      const wxResult = await this.wechatPayService.queryOrder(order.orderNo);
      this.logger.log(`同步支付状态: ${order.orderNo} trade_state=${wxResult.trade_state}`);

      if (wxResult.trade_state === 'SUCCESS') {
        // 构造回调数据格式，复用 handlePaymentResult
        const notifyData = {
          out_trade_no: order.orderNo,
          transaction_id: wxResult.transaction_id,
          trade_state: wxResult.trade_state,
          amount: wxResult.amount,
        };
        await this.paymentsService.handlePaymentResult(notifyData);
        return { code: 200, message: '支付状态同步成功', paid: true, orderNo: order.orderNo };
      }

      // 支付状态不是 SUCCESS（USERPAYING/CLOSED 等）
      return {
        code: 200,
        message: `当前支付状态: ${wxResult.trade_state}`,
        paid: false,
        trade_state: wxResult.trade_state,
        orderNo: order.orderNo,
      };

    } catch (error: any) {
      this.logger.error(`同步支付状态失败 [${order.orderNo}]: ${error.message}`);
      // 查询失败可能是订单在微信侧未找到（刚支付还未同步）
      // 不要抛异常，让小程序端能正常跳转
      return {
        code: 200,
        message: '暂未查询到支付状态，系统将通过回调自动同步',
        paid: false,
        orderNo: order.orderNo,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情(小程序)' })
  async getOrder(@Req() req: any, @Param('id') orderId: string) {
    return this.wxOrderService.getOrderDetail(req.user.id, orderId);
  }
}
