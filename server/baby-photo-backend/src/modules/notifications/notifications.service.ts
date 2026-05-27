import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { EmailService } from './email.service';
import { WechatNotificationService } from './wechat.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly wechatService: WechatNotificationService,
  ) {}

  async create(dto: CreateNotificationDto) {
    let status: 'PENDING' | 'SENT' | 'FAILED' = 'PENDING';
    let sentAt: Date | null = null;
    let errorMessage: string | null = null;

    try {
      if (dto.type === 'EMAIL') {
        if (!dto.recipient) {
          throw new Error('邮件发送必须指定收件人');
        }
        await this.emailService.sendMail(dto.recipient, dto.title, dto.content);
        status = 'SENT';
        sentAt = new Date();
      } else if (dto.type === 'WECHAT') {
        if (!dto.recipient) {
          throw new Error('微信消息必须指定用户');
        }
        const wxUser = await this.prisma.wxUser.findUnique({ where: { id: dto.recipient } });
        if (!wxUser?.openid) {
          throw new Error('微信用户不存在或缺少 openid');
        }
        let msgData: { templateId: string; data: Record<string, any>; page?: string };
        try {
          msgData = JSON.parse(dto.content);
        } catch {
          throw new Error('微信消息内容必须是包含 templateId 和 data 的 JSON 格式');
        }
        const sent = await this.wechatService.sendTemplateMessage(
          wxUser.openid,
          msgData.templateId,
          msgData.data,
          msgData.page,
        );
        if (sent) {
          status = 'SENT';
          sentAt = new Date();
        } else {
          throw new Error('用户未订阅该模板消息');
        }
      } else {
        // PUSH / SYSTEM: 标记为已发送
        status = 'SENT';
        sentAt = new Date();
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || '发送失败';
      this.logger.error(`通知发送失败 [${dto.type}] ${dto.title}: ${errorMessage}`);
    }

    const notification = await this.prisma.appNotification.create({
      data: {
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        recipient: dto.recipient,
        status: status as any,
        sentAt,
        errorMessage,
      },
    });

    this.logger.log(`通知已创建 [${dto.type}] ${dto.title} -> ${status}`);

    return {
      code: 200,
      message: status === 'FAILED' ? '通知发送失败' : '通知发送成功',
      data: notification,
    };
  }

  async findAll(query: QueryNotificationDto) {
    const { page = 1, pageSize = 20, type, status } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      this.prisma.appNotification.count({ where }),
      this.prisma.appNotification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      code: 200,
      message: '查询通知列表成功',
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string) {
    const notification = await this.prisma.appNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('通知记录不存在');
    }

    return {
      code: 200,
      message: '查询通知详情成功',
      data: notification,
    };
  }

  async remove(id: string) {
    const notification = await this.prisma.appNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('通知记录不存在');
    }

    await this.prisma.appNotification.delete({ where: { id } });

    return {
      code: 200,
      message: '删除通知记录成功',
      data: null,
    };
  }

  async retry(id: string) {
    const notification = await this.prisma.appNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('通知记录不存在');
    }

    let status: 'PENDING' | 'SENT' | 'FAILED' = 'SENT';
    let sentAt: Date | null = new Date();
    let errorMessage: string | null = null;

    try {
      if (notification.type === 'EMAIL') {
        if (!notification.recipient) {
          throw new Error('收件人未指定');
        }
        await this.emailService.sendMail(notification.recipient, notification.title, notification.content);
      } else if (notification.type === 'WECHAT') {
        if (!notification.recipient) {
          throw new Error('微信用户未指定');
        }
        const wxUser = await this.prisma.wxUser.findUnique({ where: { id: notification.recipient } });
        if (!wxUser?.openid) {
          throw new Error('微信用户不存在或缺少 openid');
        }
        let msgData: { templateId: string; data: Record<string, any>; page?: string };
        try {
          msgData = JSON.parse(notification.content);
        } catch {
          throw new Error('微信消息内容 JSON 解析失败');
        }
        const sent = await this.wechatService.sendTemplateMessage(
          wxUser.openid,
          msgData.templateId,
          msgData.data,
          msgData.page,
        );
        if (!sent) {
          throw new Error('用户未订阅该模板消息');
        }
      }
      // PUSH / SYSTEM: 只需标记为已发送
    } catch (err: any) {
      status = 'FAILED';
      sentAt = null;
      errorMessage = err.message || '重试发送失败';
      this.logger.error(`通知重试失败 [${notification.type}] ${notification.title}: ${errorMessage}`);
    }

    await this.prisma.appNotification.update({
      where: { id },
      data: {
        status: status as any,
        sentAt,
        errorMessage,
      },
    });

    this.logger.log(`通知重试 [${notification.type}] ${notification.title} -> ${status}`);

    return {
      code: 200,
      message: status === 'FAILED' ? '重试发送失败' : '重试发送成功',
      data: { id, status, sentAt, errorMessage },
    };
  }

  async retryAllFailed() {
    const failedNotifs = await this.prisma.appNotification.findMany({
      where: { status: 'FAILED' },
    });

    if (failedNotifs.length === 0) {
      return { code: 200, message: '没有需要重试的失败通知', data: { total: 0, success: 0 } };
    }

    let success = 0;
    for (const n of failedNotifs) {
      try {
        await this.retry(n.id);
        success++;
      } catch {
        // individual retry failure already logged in retry()
      }
    }

    return {
      code: 200,
      message: `批量重试完成: ${success}/${failedNotifs.length} 成功`,
      data: { total: failedNotifs.length, success },
    };
  }
}
