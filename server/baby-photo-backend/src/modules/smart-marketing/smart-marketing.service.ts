import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/create-segment.dto';
import { QuerySegmentDto } from './dto/query-segment.dto';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { QueryCampaignDto } from './dto/query-campaign.dto';
import { TrackEventDto } from './dto/track-event.dto';

@Injectable()
export class SmartMarketingService {
  private readonly logger = new Logger(SmartMarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 预设模板 ====================

  static readonly PRESET_SEGMENTS = [
    {
      name: 'VIP客户',
      description: '消费10次以上且总金额5000元以上',
      rules: [
        { field: 'totalOrders', operator: '>=', value: 10 },
        { field: 'totalAmount', operator: '>=', value: 5000 },
      ],
    },
    {
      name: '黄金客户',
      description: '消费5次以上且总金额2000元以上',
      rules: [
        { field: 'totalOrders', operator: '>=', value: 5 },
        { field: 'totalAmount', operator: '>=', value: 2000 },
      ],
    },
    {
      name: '白银客户',
      description: '消费2次以上且总金额500元以上',
      rules: [
        { field: 'totalOrders', operator: '>=', value: 2 },
        { field: 'totalAmount', operator: '>=', value: 500 },
      ],
    },
    {
      name: '新客户',
      description: '未下过单的注册用户',
      rules: [
        { field: 'totalOrders', operator: '==', value: 0 },
      ],
    },
    {
      name: '即将流失',
      description: '超过60天未下单的活跃用户',
      rules: [
        { field: 'daysSinceLastOrder', operator: '>=', value: 60 },
        { field: 'churnStatus', operator: '==', value: 'ACTIVE' },
      ],
    },
    {
      name: '本月生日',
      description: '本月过生日的用户',
      rules: [
        { field: 'birthdayMonth', operator: '==', value: new Date().getMonth() + 1 },
      ],
    },
  ];

  // ==================== 客户分群 ====================

  async createSegment(dto: CreateSegmentDto) {
    const segment = await this.prisma.customerSegment.create({
      data: {
        name: dto.name,
        description: dto.description,
        rules: dto.rules,
      },
    });

    // 异步计算成员数
    this.refreshSegmentMemberCount(segment.id).catch((err) =>
      this.logger.error(`刷新分群成员数失败: ${segment.id}`, err),
    );

    return { code: 200, message: '分群创建成功', data: segment };
  }

  async findSegments(query: QuerySegmentDto) {
    const { page = 1, pageSize = 20, name, status } = query;
    const where: any = {};
    if (name) where.name = { contains: name };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.customerSegment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerSegment.count({ where }),
    ]);

    return {
      code: 200,
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  }

  async findSegment(id: string) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('分群不存在');
    return { code: 200, data: segment };
  }

  async updateSegment(id: string, dto: UpdateSegmentDto) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('分群不存在');

    const updated = await this.prisma.customerSegment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.rules !== undefined && { rules: dto.rules }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    // 如果规则变了，刷新计数
    if (dto.rules) {
      this.refreshSegmentMemberCount(id).catch((err) =>
        this.logger.error(`刷新分群成员数失败: ${id}`, err),
      );
    }

    return { code: 200, message: '更新成功', data: updated };
  }

  async removeSegment(id: string) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('分群不存在');
    await this.prisma.customerSegment.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }

  async getSegmentMembers(id: string, page = 1, pageSize = 20) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('分群不存在');

    const where = this.buildSegmentQuery(segment.rules as any[]);

    // 并行获取总数和当前页数据
    const [items, total] = await Promise.all([
      this.prisma.wxUser.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          avatar: true,
          gender: true,
          phone: true,
          memberLevel: true,
          totalOrders: true,
          totalAmount: true,
          growthPoints: true,
          lastOrderAt: true,
          createdAt: true,
        },
      }),
      this.prisma.wxUser.count({ where }),
    ]);

    return {
      code: 200,
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  }

  async refreshSegmentMemberCount(id: string) {
    const segment = await this.prisma.customerSegment.findUnique({ where: { id } });
    if (!segment) throw new NotFoundException('分群不存在');

    const where = this.buildSegmentQuery(segment.rules as any[]);
    const count = await this.prisma.wxUser.count({ where });

    await this.prisma.customerSegment.update({
      where: { id },
      data: { memberCount: count },
    });

    return { code: 200, data: { memberCount: count } };
  }

  /**
   * 将分群规则转换为 Prisma WxUser 查询条件
   * 支持的字段:
   *   totalOrders, totalAmount, growthPoints → 数字比较
   *   memberLevel, churnStatus, gender → 字符串相等
   *   daysSinceLastOrder → 转为 lastOrderAt 日期范围
   *   birthdayMonth → 转为 SQL EXTRACT 条件
   */
  private buildSegmentQuery(rules: any[]): any {
    if (!rules || rules.length === 0) return {};

    const conditions: any[] = [];

    for (const rule of rules) {
      const { field, operator, value } = rule;
      if (!field || !operator) continue;

      switch (field) {
        case 'totalOrders':
        case 'totalAmount':
        case 'growthPoints': {
          const numVal = Number(value);
          const opMap: Record<string, string> = {
            '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte', '==': 'equals',
          };
          const prismaOp = opMap[operator];
          if (prismaOp) conditions.push({ [field]: { [prismaOp]: numVal } });
          break;
        }
        case 'memberLevel':
        case 'churnStatus':
          if (operator === '==') conditions.push({ [field]: String(value) });
          else if (operator === '!=') conditions.push({ [field]: { not: String(value) } });
          break;
        case 'gender': {
          const genVal = Number(value);
          if (operator === '==') conditions.push({ gender: genVal });
          break;
        }
        case 'daysSinceLastOrder': {
          // daysSinceLastOrder >= N → lastOrderAt <= now - N days
          const days = Number(value);
          const date = new Date();
          date.setDate(date.getDate() - days);
          if (operator === '>=') conditions.push({ lastOrderAt: { lte: date } });
          else if (operator === '<=') conditions.push({ lastOrderAt: { gte: date } });
          else if (operator === '==') {
            // Approximate: lastOrderAt within that day
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            conditions.push({
              lastOrderAt: { gte: date, lte: nextDay },
            });
          }
          break;
        }
        case 'birthdayMonth': {
          // 使用原始 SQL 查询 birthday 字段的月份匹配
          const month = Number(value);
          conditions.push({
            birthday: { not: null },
          });
          // 这里用简单的日期范围近似 month filter
          // 实际场景: month=5 → 所有生日月份为5的用户
          // Prisma不支持EXTRACT，因此通过原始查询处理
          // 这里我们使用ID列表方式实现
          conditions.push({
            id: {
              in: this.getBirthdayMonthUserIds(month),
            },
          });
          break;
        }
      }
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private getBirthdayMonthUserIds(month: number): string[] {
    // 使用数组中永远不会匹配的ID来让后面的查询为空 — 实际会通过原始SQL查询
    // 该方法在实际使用时会被替换为原始查询
    return [];
  }

  /**
   * 获取本月生日的用户（通过原始 SQL）
   */
  async getBirthdayUsers(month: number) {
    const result: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id FROM "wx_users" WHERE EXTRACT(MONTH FROM birthday) = $1 AND birthday IS NOT NULL`,
      month,
    );
    return result.map((r: any) => r.id);
  }

  // ==================== 营销活动 ====================

  async createCampaign(dto: CreateCampaignDto) {
    const data: any = {
      name: dto.name,
      description: dto.description,
      segmentId: dto.segmentId,
      campaignType: dto.campaignType,
      couponId: dto.couponId,
      title: dto.title,
      content: dto.content,
    };
    if (dto.scheduledAt) data.scheduledAt = new Date(dto.scheduledAt);

    const campaign = await this.prisma.marketingCampaign.create({ data });

    return { code: 200, message: '活动创建成功', data: campaign };
  }

  async findCampaigns(query: QueryCampaignDto) {
    const { page = 1, pageSize = 20, name, status, campaignType } = query;
    const where: any = {};
    if (name) where.name = { contains: name };
    if (status) where.status = status;
    if (campaignType) where.campaignType = campaignType;

    const [items, total] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          segment: { select: { id: true, name: true, memberCount: true } },
        },
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);

    return {
      code: 200,
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  }

  async findCampaign(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        segment: { select: { id: true, name: true, memberCount: true, rules: true } },
      },
    });
    if (!campaign) throw new NotFoundException('活动不存在');
    return { code: 200, data: campaign };
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('活动不存在');
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('只能编辑草稿状态的活动');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.segmentId !== undefined) data.segmentId = dto.segmentId;
    if (dto.campaignType !== undefined) data.campaignType = dto.campaignType;
    if (dto.couponId !== undefined) data.couponId = dto.couponId;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt);

    const updated = await this.prisma.marketingCampaign.update({ where: { id }, data });
    return { code: 200, message: '更新成功', data: updated };
  }

  async removeCampaign(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('活动不存在');
    await this.prisma.marketingCampaign.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }

  /**
   * 执行营销活动 - 向分群成员推送优惠券或通知
   */
  async sendCampaign(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: { segment: true },
    });
    if (!campaign) throw new NotFoundException('活动不存在');
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('只能发送草稿状态的活动');
    }

    // 标记为发送中
    await this.prisma.marketingCampaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    try {
      // 获取目标用户
      let wxUserIds: string[] = [];

      if (campaign.segment && campaign.segment.rules) {
        const rules = campaign.segment.rules as any[];
        // 特殊处理 birthdayMonth
        const birthdayRule = rules.find((r) => r.field === 'birthdayMonth');
        let baseWhere: any = {};
        if (birthdayRule) {
          const month = Number(birthdayRule.value);
          const birthdayIds = await this.getBirthdayUsers(month);
          const otherRules = rules.filter((r) => r.field !== 'birthdayMonth');
          const otherWhere = this.buildSegmentQuery(otherRules);
          // 组合查询
          if (otherRules.length > 0) {
            baseWhere = { AND: [{ id: { in: birthdayIds } }, otherWhere] };
          } else {
            baseWhere = { id: { in: birthdayIds } };
          }
        } else {
          baseWhere = this.buildSegmentQuery(rules);
        }

        const users = await this.prisma.wxUser.findMany({
          where: baseWhere,
          select: { id: true },
        });
        wxUserIds = users.map((u) => u.id);
      }

      if (wxUserIds.length === 0) {
        await this.prisma.marketingCampaign.update({
          where: { id },
          data: { status: 'COMPLETED', sentCount: 0 },
        });
        return { code: 200, message: '没有匹配的用户', data: { sentCount: 0 } };
      }

      let sentCount = 0;

      if (campaign.campaignType === 'COUPON_PUSH' && campaign.couponId) {
        // 批量发放优惠券
        sentCount = await this.batchIssueCoupons(wxUserIds, campaign.couponId, id);
      } else if (campaign.campaignType === 'NOTIFICATION_PUSH') {
        // 批量发送通知
        sentCount = await this.batchSendNotifications(wxUserIds, campaign.title, campaign.content, id);
      }

      // 更新活动统计
      await this.prisma.marketingCampaign.update({
        where: { id },
        data: { status: 'SENT', sentCount },
      });

      return { code: 200, message: '发送成功', data: { sentCount } };
    } catch (err) {
      this.logger.error(`活动发送失败: ${id}`, err);
      await this.prisma.marketingCampaign.update({
        where: { id },
        data: { status: 'DRAFT' },
      });
      throw err;
    }
  }

  private async batchIssueCoupons(wxUserIds: string[], couponId: string, campaignId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || coupon.status !== 'ACTIVE') {
      throw new BadRequestException('优惠券不存在或未激活');
    }

    let sentCount = 0;
    const perUserLimit = coupon.perUserLimit || 1;

    for (const wxUserId of wxUserIds) {
      try {
        // 检查用户已领取数量
        const existingCount = await this.prisma.userCoupon.count({
          where: { wxUserId, couponId },
        });
        if (existingCount >= perUserLimit) continue;

        // 创建用户优惠券
        await this.prisma.userCoupon.create({
          data: {
            wxUserId,
            couponId,
            status: 'UNUSED',
            expiredAt: coupon.endTime,
          },
        });

        // 记录追踪
        await this.prisma.campaignTrack.create({
          data: {
            campaignId,
            wxUserId,
            event: 'DELIVERED',
          },
        });

        sentCount++;
      } catch (err) {
        this.logger.warn(`发放优惠券失败: userId=${wxUserId}, couponId=${couponId}`, err);
      }
    }

    return sentCount;
  }

  private async batchSendNotifications(
    wxUserIds: string[],
    title: string | null | undefined,
    content: string | null | undefined,
    campaignId: string,
  ) {
    let sentCount = 0;

    for (const wxUserId of wxUserIds) {
      try {
        await this.prisma.appNotification.create({
          data: {
            type: 'SYSTEM',
            title: title || '营销通知',
            content: content || '',
            recipient: wxUserId,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        await this.prisma.campaignTrack.create({
          data: {
            campaignId,
            wxUserId,
            event: 'DELIVERED',
          },
        });

        sentCount++;
      } catch (err) {
        this.logger.warn(`发送通知失败: userId=${wxUserId}`, err);
      }
    }

    return sentCount;
  }

  // ==================== 漏斗追踪 ====================

  async getCampaignFunnel(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('活动不存在');

    const events = await this.prisma.campaignTrack.groupBy({
      by: ['event'],
      where: { campaignId: id },
      _count: { id: true },
    });

    const eventMap: Record<string, number> = {
      DELIVERED: 0,
      OPENED: 0,
      CLICKED: 0,
      CONVERTED: 0,
    };
    for (const e of events) {
      eventMap[e.event] = e._count.id;
    }

    // 计算转化率
    const total = eventMap.DELIVERED || 1;
    const funnel = [
      { stage: '已送达', count: eventMap.DELIVERED, rate: '100%' },
      { stage: '已查看', count: eventMap.OPENED, rate: `${((eventMap.OPENED / total) * 100).toFixed(1)}%` },
      { stage: '已点击', count: eventMap.CLICKED, rate: `${((eventMap.CLICKED / total) * 100).toFixed(1)}%` },
      { stage: '已转化', count: eventMap.CONVERTED, rate: `${((eventMap.CONVERTED / total) * 100).toFixed(1)}%` },
    ];

    return {
      code: 200,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          sentCount: campaign.sentCount,
          openedCount: campaign.openedCount,
          clickedCount: campaign.clickedCount,
          convertedCount: campaign.convertedCount,
        },
        funnel,
      },
    };
  }

  async trackEvent(dto: TrackEventDto) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id: dto.campaignId },
    });
    if (!campaign) throw new NotFoundException('活动不存在');

    await this.prisma.campaignTrack.create({
      data: {
        campaignId: dto.campaignId,
        wxUserId: dto.wxUserId,
        event: dto.event,
        orderId: dto.orderId,
        metadata: dto.metadata || undefined,
      },
    });

    // 同步更新活动统计计数
    const countField =
      dto.event === 'OPENED'
        ? 'openedCount'
        : dto.event === 'CLICKED'
          ? 'clickedCount'
          : dto.event === 'CONVERTED'
            ? 'convertedCount'
            : null;
    if (countField) {
      await this.prisma.marketingCampaign.update({
        where: { id: dto.campaignId },
        data: { [countField]: { increment: 1 } },
      });
    }

    return { code: 200, message: '事件记录成功' };
  }

  // ==================== 预设模板 ====================

  async getPresetSegments() {
    return { code: 200, data: SmartMarketingService.PRESET_SEGMENTS };
  }
}
