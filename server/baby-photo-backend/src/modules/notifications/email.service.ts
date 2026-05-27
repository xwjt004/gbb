import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`邮件服务已初始化: ${host}:${port}`);
    } else {
      this.logger.warn('邮件服务未配置（MAIL_HOST/MAIL_USER/MAIL_PASS 不完整），邮件发送将使用模拟模式');
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`[模拟发送] 收件人: ${to}, 主题: ${subject}`);
      return true;
    }

    const from = this.configService.get<string>('MAIL_USER');
    await this.transporter.sendMail({
      from: `"${this.configService.get('SYSTEM_NAME', '系统通知')}" <${from}>`,
      to,
      subject,
      html,
    });

    this.logger.log(`邮件已发送至 ${to}: ${subject}`);
    return true;
  }

  async isConfigured(): Promise<boolean> {
    return this.transporter !== null;
  }
}
