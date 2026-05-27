import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WxPayService {
  private readonly logger = new Logger(WxPayService.name);
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiKey: string;
  private readonly notifyUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get('WX_APP_ID') || '';
    this.mchId = this.configService.get('WX_MCH_ID') || '';
    this.apiKey = this.configService.get('WX_API_KEY') || '';
    this.notifyUrl = this.configService.get('WX_NOTIFY_URL') || '';

    if (!this.appId || !this.mchId || !this.apiKey) {
      this.logger.error('微信支付配置不完整: 请检查 WX_APP_ID, WX_MCH_ID, WX_API_KEY 环境变量');
    }
    if (!this.notifyUrl) {
      this.logger.warn('微信支付回调地址未配置: WX_NOTIFY_URL 为空，支付回调将无法正常工作');
    }
  }

  /**
   * 创建微信支付订单
   */
  async createPayment(params: {
    outTradeNo: string;
    description: string;
    amount: number;
    openid: string;
  }) {
    try {
      const { outTradeNo, description, amount, openid } = params;

      // 构建请求参数
      const paymentParams: Record<string, any> = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        body: description,
        out_trade_no: outTradeNo,
        total_fee: amount,
        spbill_create_ip: '127.0.0.1',
        notify_url: this.notifyUrl,
        trade_type: 'JSAPI',
        openid: openid,
      };

      // 生成签名
      const sign = this.generateSign(paymentParams);
      paymentParams['sign'] = sign;

      // 转换为XML
      const xml = this.objectToXml(paymentParams);

      // 调用微信API
      const response = await axios.post(
        'https://api.mch.weixin.qq.com/pay/unifiedorder',
        xml,
        {
          headers: { 'Content-Type': 'application/xml' },
        },
      );

      // 解析响应
      const result = this.xmlToObject(response.data);

      if (
        result.return_code !== 'SUCCESS' ||
        result.result_code !== 'SUCCESS'
      ) {
        throw new Error(
          `微信支付下单失败: ${result.return_msg || result.err_code_des}`,
        );
      }

      // 生成小程序支付参数
      const paySign = this.generatePaySign({
        appId: this.appId,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: this.generateNonceStr(),
        package: `prepay_id=${result.prepay_id}`,
        signType: 'MD5',
      });

      return {
        prepay_id: result.prepay_id,
        paySign,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        nonceStr: this.generateNonceStr(),
        signType: 'MD5',
      };
    } catch (error) {
      this.logger.error(`创建微信支付订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 验证回调签名
   * @param body - 微信支付回调的原始请求体
   * @param headers - 微信支付回调的HTTP头部信息
   */
  verifySignature(
    body: Buffer,
    headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      const rawXml = body.toString();
      const data = this.xmlToObject(rawXml);
      if (!data || Object.keys(data).length === 0) {
        this.logger.warn('微信通知解析为空');
        return Promise.resolve(false);
      }

      const receivedSign = data['sign'];
      const signType = (data['sign_type'] || 'MD5').toUpperCase();
      if (!receivedSign) {
        this.logger.warn('微信通知缺少签名字段');
        return Promise.resolve(false);
      }

      // 去除 sign 字段重算
      const paramsForSign: Record<string, any> = { ...data };
      delete paramsForSign['sign'];

      const recalculated = this.computeV2Sign(paramsForSign, signType);
      const match = recalculated === receivedSign;

      // 时间戳偏差校验（头部 wechatpay-timestamp，若不存在跳过）
      const tsHeader = headers['Wechatpay-Timestamp'] || headers['wechatpay-timestamp'] || headers['x-timestamp'];
      const allowSkewSeconds = 300; // 5分钟
      let timeValid = true;
      if (tsHeader) {
        const notifyTs = Number(tsHeader);
        if (!isNaN(notifyTs)) {
          const now = Math.floor(Date.now() / 1000);
          const skew = Math.abs(now - notifyTs);
          timeValid = skew <= allowSkewSeconds;
          if (!timeValid) {
            this.logger.warn(`微信通知时间戳偏差过大: skew=${skew}s headerTs=${notifyTs} now=${now}`);
          }
        }
      }

      if (!match) {
        this.logger.warn(`微信签名校验失败 signType=${signType} expected=${recalculated} received=${receivedSign}`);
      }

      this.logger.debug(`微信签名校验结果 match=${match} timeValid=${timeValid} signType=${signType}`);
      return Promise.resolve(match && timeValid);
    } catch (error) {
      this.logger.error(`验证签名失败: ${error.message}`, error.stack);
      return Promise.resolve(false);
    }
  }

  /**
   * 解析回调数据
   */
  parseNotifyData(body: Buffer): Promise<any> {
    try {
      const xmlData = body.toString();
      return Promise.resolve(this.xmlToObject(xmlData));
    } catch (error) {
      this.logger.error(`解析回调数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 申请退款
   */
  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
    refundDesc?: string;
  }) {
    try {
      // 构建退款参数
      const refundParams: Record<string, any> = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        out_trade_no: params.outTradeNo,
        out_refund_no: params.outRefundNo,
        total_fee: params.totalFee,
        refund_fee: params.refundFee,
        refund_desc: params.refundDesc || '退款',
      };

      // 生成签名
      const sign = this.generateSign(refundParams);
      refundParams['sign'] = sign;

      // 转换为XML
      const xml = this.objectToXml(refundParams);

      // 调用微信退款API（需要 mTLS 客户端证书）
      // ⚠️ 需要配置微信支付证书（apiclient_cert.p12 或 apiclient_cert.pem + apiclient_key.pem）
      // 示例: https.Agent 配置参考微信官方文档
      const response = await axios.post(
        'https://api.mch.weixin.qq.com/secapi/pay/refund',
        xml,
        {
          headers: { 'Content-Type': 'application/xml' },
          // TODO: 配置 mTLS 证书，否则退款接口会报错
          // httpsAgent: new https.Agent({
          //   pfx: fs.readFileSync('path/to/apiclient_cert.p12'),
          //   passphrase: this.mchId,
          // }),
        },
      );

      // 解析响应
      const result = this.xmlToObject(response.data);

      if (
        result.return_code !== 'SUCCESS' ||
        result.result_code !== 'SUCCESS'
      ) {
        throw new Error(
          `微信退款失败: ${result.return_msg || result.err_code_des}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`微信退款失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  // 私有辅助方法

  private generateNonceStr(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSign(params: Record<string, any>, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): string {
    // 过滤空值并排序
    const filteredParams = Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== '')
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    // 构建签名字符串
    const stringA = Object.keys(filteredParams)
      .map((key) => `${key}=${filteredParams[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.apiKey}`;

    if (signType === 'HMAC-SHA256') {
      return crypto
        .createHmac('sha256', this.apiKey)
        .update(stringSignTemp)
        .digest('hex')
        .toUpperCase();
    }

    // 默认 MD5
    return crypto
      .createHash('md5')
      .update(stringSignTemp)
      .digest('hex')
      .toUpperCase();
  }

  private generatePaySign(params: Record<string, string>, signType: 'MD5' | 'HMAC-SHA256' = 'MD5'): string {
    // 构建签名字符串
    const stringA = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.apiKey}`;

    if (signType === 'HMAC-SHA256') {
      return crypto
        .createHmac('sha256', this.apiKey)
        .update(stringSignTemp)
        .digest('hex')
        .toUpperCase();
    }

    // 默认 MD5 签名
    return crypto
      .createHash('md5')
      .update(stringSignTemp)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 计算 V2 回调签名（兼容 sign_type）
   */
  private computeV2Sign(params: Record<string, any>, signType: string): string {
    const upper = signType.toUpperCase();
    if (upper !== 'MD5' && upper !== 'HMAC-SHA256') {
      this.logger.warn(`未支持的签名类型 ${signType}，使用 MD5 作为降级`);
    }
    return this.generateSign(params, upper === 'HMAC-SHA256' ? 'HMAC-SHA256' : 'MD5');
  }

  private objectToXml(obj: Record<string, any>): string {
    let xml = '<xml>';
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        xml += `<${key}>${obj[key]}</${key}>`;
      }
    }
    xml += '</xml>';
    return xml;
  }

  private xmlToObject(xml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const regex = /<(\w+)>([^<]*)<\/\1>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }

    return result;
  }
}
