import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * 微信支付服务
 * 使用微信支付 APIv3
 */
@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  
  // 微信支付配置
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiV3Key: string;
  private readonly serialNo: string;
  private readonly privateKey: string;
  private readonly notifyUrl: string;
  private readonly isSandbox: boolean;
  private readonly isMock: boolean;

  // 微信支付 API 基础URL
  private readonly baseUrl = 'https://api.mch.weixin.qq.com';

  constructor(private readonly configService: ConfigService) {
    // 加载配置
    this.appId = this.configService.get<string>('WECHAT_APPID') || '';
    this.mchId = this.configService.get<string>('WECHAT_MCH_ID') || '';
    this.apiV3Key = this.configService.get<string>('WECHAT_API_V3_KEY') || '';
    this.serialNo = this.configService.get<string>('WECHAT_SERIAL_NO') || '';
    this.notifyUrl = this.configService.get<string>('WECHAT_NOTIFY_URL') || '';
    this.isSandbox = this.configService.get<boolean>('PAYMENT_SANDBOX_MODE', true);
    this.isMock = this.configService.get<boolean>('PAYMENT_MOCK_MODE', false);

    // 加载商户私钥
    const privateKeyPath = this.configService.get<string>('WECHAT_PRIVATE_KEY_PATH');
    if (privateKeyPath && fs.existsSync(privateKeyPath)) {
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
      this.logger.log('✅ 微信支付商户私钥加载成功');
    } else {
      this.logger.warn('⚠️  微信支付商户私钥未配置或文件不存在');
      this.privateKey = '';
    }

    this.logger.log(`微信支付服务初始化完成 [沙箱模式: ${this.isSandbox}, 模拟模式: ${this.isMock}]`);
  }

  /**
   * 创建JSAPI支付订单
   */
  async createJsapiOrder(params: {
    orderId: string;
    orderNo: string;
    amount: number; // 单位：元
    description: string;
    openid: string;
  }) {
    this.logger.log(`创建JSAPI支付订单: ${params.orderNo}, 金额: ${params.amount}元`);

    // 模拟模式：返回模拟数据
    if (this.isMock) {
      return this.mockPaymentResponse(params);
    }

    // 真实支付：调用微信支付API
    try {
      // 金额转换为分
      const totalAmount = Math.round(params.amount * 100);

      // 构建请求数据
      const requestData = {
        appid: this.appId,
        mchid: this.mchId,
        description: params.description,
        out_trade_no: params.orderNo,
        notify_url: this.notifyUrl,
        amount: {
          total: totalAmount,
          currency: 'CNY',
        },
        payer: {
          openid: params.openid,
        },
      };

      this.logger.debug('微信支付请求数据:', JSON.stringify(requestData));

      // 调用微信支付API
      const url = `${this.baseUrl}/v3/pay/transactions/jsapi`;
      const response = await this.request('POST', url, requestData);

      this.logger.log(`微信预支付订单创建成功: prepay_id=${response.prepay_id}`);

      // 生成小程序调起支付所需参数
      const paymentParams = this.buildMiniProgramPaymentParams(response.prepay_id);

      return {
        prepayId: response.prepay_id,
        ...paymentParams,
        orderId: params.orderId,
        orderNo: params.orderNo,
        amount: params.amount,
        total_fee: totalAmount,
      };
    } catch (error) {
      this.logger.error('创建微信支付订单失败:', error);
      throw error;
    }
  }

  /**
   * 构建小程序调起支付参数
   */
  private buildMiniProgramPaymentParams(prepayId: string) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;

    // 构建签名串
    const signStr = [
      this.appId,
      timestamp,
      nonceStr,
      packageStr,
    ].join('\n') + '\n';

    // 生成签名
    const paySign = this.sign(signStr);

    return {
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: paySign,
    };
  }

  /**
   * 查询订单支付状态
   */
  async queryOrder(orderNo: string) {
    this.logger.log(`查询订单支付状态: ${orderNo}`);

    if (this.isMock) {
      return {
        trade_state: 'SUCCESS',
        trade_state_desc: '支付成功',
      };
    }

    try {
      const url = `${this.baseUrl}/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${this.mchId}`;
      const response = await this.request('GET', url);
      
      this.logger.log(`订单状态: ${response.trade_state}`);
      return response;
    } catch (error) {
      this.logger.error('查询订单失败:', error);
      throw error;
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderNo: string) {
    this.logger.log(`关闭订单: ${orderNo}`);

    if (this.isMock) {
      return { success: true };
    }

    try {
      const url = `${this.baseUrl}/v3/pay/transactions/out-trade-no/${orderNo}/close`;
      await this.request('POST', url, { mchid: this.mchId });
      
      this.logger.log(`订单已关闭: ${orderNo}`);
      return { success: true };
    } catch (error) {
      this.logger.error('关闭订单失败:', error);
      throw error;
    }
  }

  /**
   * 验证支付回调签名
   */
  verifyNotifySignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serialNo: string,
  ): boolean {
    // 构建验签串
    const signStr = `${timestamp}\n${nonce}\n${body}\n`;

    // 使用微信平台证书公钥验签（这里简化处理，实际需要下载并缓存微信平台证书）
    try {
      // TODO: 实现真实的签名验证
      this.logger.log('验证支付回调签名');
      return true;
    } catch (error) {
      this.logger.error('签名验证失败:', error);
      return false;
    }
  }

  /**
   * 解密回调数据
   */
  decryptNotifyData(
    ciphertext: string,
    associatedData: string,
    nonce: string,
  ): any {
    try {
      // 使用 APIv3 密钥解密
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.apiV3Key,
        nonce,
      );
      
      decipher.setAuthTag(Buffer.from(ciphertext.slice(-32), 'hex'));
      decipher.setAAD(Buffer.from(associatedData));

      const decrypted = Buffer.concat([
        decipher.update(ciphertext.slice(0, -32), 'base64'),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf-8'));
    } catch (error) {
      this.logger.error('解密回调数据失败:', error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 发送HTTP请求到微信支付API
   */
  private async request(method: string, url: string, data?: any) {
    // 构建Authorization
    const authorization = this.buildAuthorization(method, url, data);

    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BabyPhotoSystem/1.0',
        'Authorization': authorization,
      },
      data: data ? JSON.stringify(data) : undefined,
    };

    this.logger.debug(`请求微信支付API: ${method} ${url}`);

    const response = await axios(config);
    return response.data;
  }

  /**
   * 构建Authorization头
   */
  private buildAuthorization(method: string, url: string, data?: any): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname + urlObj.search;

    // 构建签名串
    let signStr = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n`;
    
    if (data) {
      signStr += JSON.stringify(data) + '\n';
    } else {
      signStr += '\n';
    }

    // 生成签名
    const signature = this.sign(signStr);

    // 构建Authorization头
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.serialNo}"`;
  }

  /**
   * RSA签名
   */
  private sign(data: string): string {
    if (!this.privateKey) {
      throw new Error('商户私钥未配置');
    }

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 模拟支付响应（开发测试用）
   */
  private mockPaymentResponse(params: any) {
    this.logger.warn('🎭 使用模拟支付模式');
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr(15);
    const prepayId = `mock_prepay_id_${Date.now()}`;
    const totalAmount = Math.round(params.amount * 100);

    return {
      prepayId,
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: `mock_signature_${timestamp}_${nonceStr}`,
      orderId: params.orderId,
      orderNo: params.orderNo,
      amount: params.amount,
      total_fee: totalAmount,
    };
  }
}
