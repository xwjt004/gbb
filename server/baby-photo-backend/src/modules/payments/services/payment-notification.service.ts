import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class PaymentNotificationService {
  private readonly logger = new Logger(PaymentNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 发送支付成功通知
   */
  async sendPaymentSuccessNotification(orderNo: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderNo },
        include: {
          user: true,
          package: true,
        },
      });

      if (!order) {
        this.logger.warn(`订单不存在: ${orderNo}`);
        return;
      }

      // 发送微信模板消息
      this.sendWxTemplateMessage({
        openid: order.user.openid,
        templateId: 'payment_success_template_id',
        data: {
          orderNo: order.orderNo,
          packageName: order.package?.name || '套系',
          amount: order.totalAmount.toString(),
          appointmentDate:
            order.appointmentDate?.toISOString().split('T')[0] || '',
        },
      });

      this.logger.log(`支付成功通知已发送: ${orderNo}`);
    } catch (error) {
      this.logger.error(`发送支付成功通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 发送退款成功通知
   */
  async sendRefundSuccessNotification(orderNo: string, refundAmount: number) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderNo },
        include: { user: true },
      });

      if (!order) {
        this.logger.warn(`订单不存在: ${orderNo}`);
        return;
      }

      // 发送微信模板消息
      this.sendWxTemplateMessage({
        openid: order.user.openid,
        templateId: 'refund_success_template_id',
        data: {
          orderNo: order.orderNo,
          refundAmount: refundAmount.toString(),
          refundTime: new Date().toISOString(),
        },
      });

      this.logger.log(`退款成功通知已发送: ${orderNo}`);
    } catch (error) {
      this.logger.error(`发送退款成功通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 发送管理员通知
   */
  async sendAdminNotification(params: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    data?: any;
  }) {
    try {
      this.logger.log(`[管理员通知] ${params.type.toUpperCase()}: ${params.title}`);
      this.logger.log(`消息内容: ${params.message}`);
      
      if (params.data) {
        this.logger.debug(`附加数据: ${JSON.stringify(params.data, null, 2)}`);
      }

      // TODO: 实现实际的管理员通知机制
      // 可选方案:
      // 1. 发送邮件通知
      // 2. 企业微信/钉钉机器人
      // 3. 短信通知
      // 4. 系统内站内信
      // 5. WebSocket 实时推送

    } catch (error) {
      this.logger.error(`发送管理员通知失败: ${error.message}`, error.stack);
    }
  }

  // 私有方法
  private sendWxTemplateMessage(params: {
    openid: string;
    templateId: string;
    data: Record<string, string>;
  }) {
    // TODO: 实现微信模板消息发送
    this.logger.debug(`发送模板消息: ${JSON.stringify(params)}`);
  }
}
