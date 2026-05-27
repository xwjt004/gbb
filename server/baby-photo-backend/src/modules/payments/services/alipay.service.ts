import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 支付宝支付骨架服务
 * 目标：后续对接支付宝电脑网站 / 当面付 / APP / 小程序等
 * 当前仅保留核心方法结构与日志，方便后续扩展。
 */
@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private readonly appId: string;
  private readonly privateKey: string; // 开发者私钥（PKCS1/PKCS8）
  private readonly alipayPublicKey: string; // 支付宝公钥
  private readonly notifyUrl: string;
  private readonly gateway: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get('ALIPAY_APP_ID') || '';
    this.privateKey = this.cleanKey(this.configService.get('ALIPAY_PRIVATE_KEY') || '');
    this.alipayPublicKey = this.cleanKey(this.configService.get('ALIPAY_PUBLIC_KEY') || '');
    this.notifyUrl = this.configService.get('ALIPAY_NOTIFY_URL') || '';
    this.gateway = this.configService.get('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do';
  }

  /**
   * 创建支付预订单（统一使用 bizContent + 公共参数签名）
   * 暂不真正调用支付宝，只返回模拟签名数据结构
   */
  async createPayment(params: {
    outTradeNo: string;
    subject: string;
    totalAmount: number; // 单位：元
    buyerId?: string;
  }) {
    this.logger.log(`准备创建支付宝支付: ${params.outTradeNo}`);
    // 构造 biz_content
    const bizContent = {
      out_trade_no: params.outTradeNo,
      product_code: 'FAST_INSTANT_TRADE_PAY',
      subject: params.subject,
      total_amount: params.totalAmount.toFixed(2),
      buyer_id: params.buyerId,
    };

    const commonParams: Record<string, string> = {
      app_id: this.appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      version: '1.0',
      notify_url: this.notifyUrl,
      biz_content: JSON.stringify(bizContent),
    };

    const sign = this.signParams(commonParams);

    return {
      gateway: this.gateway,
      params: commonParams,
      sign,
      sign_type: 'RSA2',
    };
  }

  /**
   * 校验支付宝回调签名（异步通知）
   */
  async verifySignature(params: Record<string, string>): Promise<boolean> {
    try {
      const { sign, sign_type = 'RSA2' } = params;
      if (!sign) {
        this.logger.warn('支付宝回调缺少签名');
        return false;
      }
      // 移除 sign 与 sign_type
      const sorted = Object.keys(params)
        .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== undefined && params[k] !== '')
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(sorted, 'utf8');
      const isValid = verifier.verify(this.formatPublicKey(this.alipayPublicKey), sign, 'base64');
      if (!isValid) {
        this.logger.warn('支付宝签名验证失败');
      }
      this.logger.debug(`支付宝签名验证结果: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`支付宝签名验证异常: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 发起退款骨架（不真实请求）
   */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    refundAmount: number; // 元
    refundReason?: string;
  }) {
    this.logger.log(`模拟支付宝退款: ${params.outRefundNo}`);
    const bizContent = {
      out_trade_no: params.outTradeNo,
      out_request_no: params.outRefundNo,
      refund_amount: params.refundAmount.toFixed(2),
      refund_reason: params.refundReason || '正常退款',
    };

    const commonParams: Record<string, string> = {
      app_id: this.appId,
      method: 'alipay.trade.refund',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
    };

    const sign = this.signParams(commonParams);
    return {
      request: commonParams,
      sign,
      mock: true,
    };
  }

  // =============== 辅助方法 ===============

  private signParams(params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(sorted, 'utf8');
    return signer.sign(this.formatPrivateKey(this.privateKey), 'base64');
  }

  private cleanKey(key: string): string {
    return key.replace(/-----BEGIN[\s\S]*?KEY-----/g, '')
      .replace(/-----END[\s\S]*?KEY-----/g, '')
      .replace(/\r?\n|\s+/g, '');
  }

  private formatPrivateKey(key: string): string {
    if (!key) return '';
    const cleaned = this.cleanKey(key);
    const lines = cleaned.match(/.{1,64}/g) || [];
    return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  private formatPublicKey(key: string): string {
    if (!key) return '';
    const cleaned = this.cleanKey(key);
    const lines = cleaned.match(/.{1,64}/g) || [];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }
}
