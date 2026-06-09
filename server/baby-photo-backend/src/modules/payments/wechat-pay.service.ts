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
    this.isSandbox = this.configService.get<string>('PAYMENT_SANDBOX_MODE', 'true') === 'true';
    this.isMock = this.configService.get<string>('PAYMENT_MOCK_MODE', 'false') === 'true';

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
      // 微信支付 APIv3 使用 AEAD_AES_256_GCM
      // ciphertext: base64 编码的密文 + 认证标签
      // nonce: base64 编码的初始向量(12字节)
      // APIv3Key: 32字节的字符串，直接作为密钥

      this.logger.debug(`解密回调: nonce="${nonce}" nonce.length=${nonce.length} ad="${associatedData}"`);

      const cipherBuffer = Buffer.from(ciphertext, 'base64');

      // 认证标签是最后 16 字节
      const authTag = cipherBuffer.subarray(cipherBuffer.length - 16);
      const encryptedData = cipherBuffer.subarray(0, cipherBuffer.length - 16);

      this.logger.debug(`解密参数: cipherLen=${cipherBuffer.length} tagLen=${authTag.length} dataLen=${encryptedData.length}`);

      // 微信支付 APIv3: nonce 是 12 字节随机字符串（原始字符串，非 Base64）
      // 官方 Node.js SDK 直接传字符串，Node.js 自动按 UTF-8 转为 12 字节 IV
      const nonceBuffer = Buffer.from(nonce, 'utf8');
      this.logger.debug(`nonceUtf8: len=${nonceBuffer.length} hex=${nonceBuffer.toString('hex')}`);

      // APIv3 密钥是 32 字节字符串
      const keyBuffer = Buffer.from(this.apiV3Key, 'utf8');
      this.logger.debug(`keyLen=${keyBuffer.length} key=${this.apiV3Key}`);

      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, nonceBuffer);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(associatedData));

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf-8'));
    } catch (error) {
      this.logger.error('解密回调数据失败:', error);
      throw error;
    }
  }

  /**
   * 申请退款 (APIv3)
   */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
    refundDesc?: string;
  }) {
    if (this.isMock) {
      this.logger.warn('🎭 模拟退款模式');
      return { refundId: `mock_refund_${Date.now()}`, outRefundNo: params.outRefundNo };
    }

    try {
      const requestData = {
        out_trade_no: params.outTradeNo,
        out_refund_no: params.outRefundNo,
        amount: {
          total: params.totalFee,
          refund: params.refundFee,
          currency: 'CNY',
        },
        reason: params.refundDesc || '退款',
      };

      const url = `${this.baseUrl}/v3/refund/domestic/refunds`;
      const response = await this.request('POST', url, requestData);

      this.logger.log(`退款创建成功: refundId=${response.refund_id}`);
      return { refundId: response.refund_id, outRefundNo: params.outRefundNo };
    } catch (error) {
      this.logger.error('退款失败:', error);
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

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      const wxError = error?.response?.data;
      if (wxError) {
        this.logger.error(`微信支付API返回错误 [HTTP ${error.response.status}]: code=${wxError.code}, message=${wxError.message}`);
        if (wxError.detail) this.logger.error(`错误详情: ${JSON.stringify(wxError.detail)}`);
      } else {
        this.logger.error(`微信支付API请求失败: ${error.message || error}`);
      }
      throw error;
    }
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
