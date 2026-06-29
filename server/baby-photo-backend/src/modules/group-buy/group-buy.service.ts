import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaymentStatus } from '../../shared/enums/status.enum';
import { StartGroupBuyDto } from './dto/start-group-buy.dto';
import { AdminCreateGroupBuyDto } from './dto/admin-create-group-buy.dto';
import { UpdateGroupBuyDto } from './dto/update-group-buy.dto';
import { CreateGroupBuyTierDto, UpdateGroupBuyTierDto } from './dto/group-buy-tier.dto';
import { QueryGroupBuyDto } from './dto/query-group-buy.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GroupBuyService {
  private readonly logger = new Logger(GroupBuyService.name);
  // 团购有效期：48小时
  private readonly GROUP_BUY_EXPIRY_HOURS = 48;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** 开团 */
  async start(wxUserId: string, dto: StartGroupBuyDto) {
    if (!dto.packageId && !dto.productId) {
      throw new BadRequestException('请指定套餐或商品');
    }

    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
      if (!pkg) throw new NotFoundException('套餐不存在');
    }
    if (dto.productId) {
      const prod = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!prod) throw new NotFoundException('商品不存在');
    }

    // 检查该用户是否有进行中的团购
    const active = await this.prisma.groupBuyActivity.findFirst({
      where: { creatorUserId: wxUserId, status: 'ACTIVE' },
    });
    if (active) throw new BadRequestException('您已有进行中的团购，请先完成或等待过期');

    const minCount = dto.minCount || 2;
    const expiredAt = new Date(Date.now() + this.GROUP_BUY_EXPIRY_HOURS * 60 * 60 * 1000);

    // 创建团购活动 + 开团人自动成为第一个参团者
    const activity = await this.prisma.groupBuyActivity.create({
      data: {
        packageId: dto.packageId || null,
        productId: dto.productId || null,
        creatorUserId: wxUserId,
        minCount,
        expiredAt,
        participants: {
          create: { userId: wxUserId, status: 'JOINED' },
        },
      },
      include: {
        package: true,
        product: true,
        participants: { include: { user: { select: { id: true, nickname: true, avatar: true } } } },
      },
    });

    return { code: 200, message: '开团成功', data: activity };
  }

  /** 参团 */
  async join(activityId: string, wxUserId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      include: { participants: true },
    });
    if (!activity) throw new NotFoundException('团购活动不存在');

    // FAILED 和后台取消(CANCELLED)的活动不可参团
    if (activity.status === 'FAILED' || activity.status === 'CANCELLED') {
      throw new BadRequestException('团购已结束');
    }

    // 检查是否已参团
    const alreadyJoined = activity.participants.some((p) => p.userId === wxUserId);
    if (alreadyJoined) throw new BadRequestException('您已参与该团购');

    // 检查参团人数上限
    if (activity.maxCount && activity.participants.length >= activity.maxCount) {
      throw new BadRequestException('该团购已达到参团人数上限');
    }

    // 参团：已成团的直接设为 SUCCESS 状态，未成团的设为 JOINED
    const participantStatus = activity.status === 'SUCCESS' ? 'SUCCESS' : 'JOINED';
    await this.prisma.groupBuyParticipant.create({
      data: { activityId, userId: wxUserId, status: participantStatus },
    });

    // 未成团时检查是否达到成团条件
    if (activity.status === 'ACTIVE') {
      const updatedCount = await this.prisma.groupBuyParticipant.count({ where: { activityId } });
      if (updatedCount >= activity.minCount) {
        await this.completeGroupBuy(activityId);
      }
    }

    // 获取当前阶梯价格
    const tierPrice = await this.getCurrentTierPrice(activityId);

    return { code: 200, message: '参团成功', data: { tierPrice } };
  }

  /** 成团逻辑 */
  private async completeGroupBuy(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      include: { participants: true },
    });
    if (!activity) return;

    // 已是成团状态则不重复处理
    if (activity.status === 'SUCCESS') return;

    // 更新活动状态
    await this.prisma.groupBuyActivity.update({
      where: { id: activityId },
      data: { status: 'SUCCESS' },
    });

    // 更新所有参团者状态
    await this.prisma.groupBuyParticipant.updateMany({
      where: { activityId },
      data: { status: 'SUCCESS' },
    });

    // 为每位参团者生成9折优惠券（仅套餐团购）
    if (!activity.packageId) return;

    const pkg = await this.prisma.package.findUnique({ where: { id: activity.packageId! } });

    // 查找或创建团购9折券模板
    let coupon = await this.prisma.coupon.findFirst({
      where: { couponType: 'GROUP_BUY', applicableIds: { has: activity.packageId! } },
    });

    if (!coupon) {
      if (!pkg) return;
      coupon = await this.prisma.coupon.create({
        data: {
          couponCode: `GROUP_${activity.packageId}_${Date.now()}`,
          couponName: `团购9折券（${pkg.name}）`,
          couponType: 'GROUP_BUY',
          discountType: 'PERCENT',
          discountValue: 10, // 9折
          minAmount: 0,
          maxDiscount: null,
          totalCount: activity.minCount,
          usedCount: 0,
          perUserLimit: 1,
          applicableType: 'PACKAGE',
          applicableIds: [activity.packageId!],
          startTime: new Date(),
          endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天有效期
          status: 'ACTIVE',
          description: `团购成功自动发放 - ${pkg.name} 9折优惠券，有效期30天`,
        },
      });
    }

    // 为每个参团者发放UserCoupon
    for (const participant of activity.participants) {
      const existing = await this.prisma.userCoupon.findFirst({
        where: { wxUserId: participant.userId, couponId: coupon.id },
      });
      if (!existing) {
        await this.prisma.userCoupon.create({
          data: {
            wxUserId: participant.userId,
            couponId: coupon.id,
            status: 'UNUSED',
            expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    // 发送开团成功通知（给团长）
    try {
      await this.notificationsService.create({
        type: 'WECHAT',
        title: '开团成功通知',
        content: JSON.stringify({
          templateId: 'GROUP_BUY_SUCCESS',
          data: {
            thing1: { value: pkg!.name },
            number2: { value: String(activity.participants.length) },
            thing3: { value: '您的团购已成功，优惠券已发放到账户' },
          },
          page: `pages/group-buy/detail/detail?id=${activityId}`,
        }),
        recipient: activity.creatorUserId,
      });
    } catch {
      // 通知失败不影响成团流程
    }

    this.logger.log(`团购 ${activityId} 已成团，已发放 ${activity.participants.length} 张优惠券`);
  }
  async getCurrentTierPrice(activityId: string): Promise<number | null> {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      select: { packageId: true, productId: true },
    });
    if (!activity) return null;

    const participantCount = await this.prisma.groupBuyParticipant.count({
      where: { activityId },
    });

    const tierWhere = activity.packageId
      ? { packageId: activity.packageId }
      : { productId: activity.productId! };
    const tiers = await this.prisma.groupBuyTier.findMany({
      where: tierWhere,
      orderBy: { minCount: 'desc' },
    });

    // 找到当前人数可用的最高阶梯（人数最多的满足条件的阶梯）
    for (const tier of tiers) {
      if (participantCount >= tier.minCount) {
        return Number(tier.price);
      }
    }
    return null;
  }

  /** 获取团购详情（含参团者） */
  async getDetail(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      include: {
        package: true,
        product: true,
        creator: { select: { id: true, nickname: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, nickname: true, avatar: true } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!activity) throw new NotFoundException('团购活动不存在');

    return { code: 200, message: '查询成功', data: activity };
  }

  /** 分页查询团购列表（后台用） */
  async getList(query: QueryGroupBuyDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    }
    if (query.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(`${query.endDate}T23:59:59.999Z`) };
    }
    if (query.keyword) {
      where.package = { name: { contains: query.keyword } };
    }

    const [items, total] = await Promise.all([
      this.prisma.groupBuyActivity.findMany({
        where,
        include: {
          package: { select: { id: true, name: true, price: true, groupPrice: true, images: true } },
          product: { select: { id: true, name: true, salePrice: true, images: true } },
          creator: { select: { id: true, nickname: true, avatar: true, phone: true } },
          orders: {
            select: { orderNo: true, paymentStatus: true },
          },
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.groupBuyActivity.count({ where }),
    ]);

    const enrichedItems = items.map((item) => {
      const totalPaid = item.orders.filter(
        (o) => o.paymentStatus === PaymentStatus.FULLY_PAID || o.paymentStatus === PaymentStatus.PARTIAL_PAID,
      ).length;
      return {
        ...item,
        paidCount: Math.min(totalPaid, item._count.participants),
        unpaidCount: Math.max(0, item._count.participants - totalPaid),
      };
    });

    return { code: 200, message: '查询成功', data: { items: enrichedItems, pagination: { page, limit, total } } };
  }

  /**
   * 获取正在组团的活动列表（小程序端公开）
   */
  async getActiveList(query: QueryGroupBuyDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const now = new Date();
    const where = {
      status: 'ACTIVE' as const,
      expiredAt: { gt: now },
    };

    const [items, total] = await Promise.all([
      this.prisma.groupBuyActivity.findMany({
        where,
        include: {
          package: { select: { id: true, name: true, price: true, groupPrice: true, images: true } },
          product: { select: { id: true, name: true, salePrice: true, images: true } },
          creator: { select: { id: true, nickname: true, avatar: true } },
          _count: { select: { participants: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.groupBuyActivity.count({ where }),
    ]);

    return {
      data: {
        items,
        pagination: { page, limit, total },
      },
    };
  }

  // ==================== 阶梯价格管理 ====================

  /** 获取阶梯价列表（按套餐或商品） */
  async getTiers(targetType: 'package' | 'product', targetId: number) {
    const where = targetType === 'package' ? { packageId: targetId } : { productId: targetId };
    const tiers = await this.prisma.groupBuyTier.findMany({
      where,
      orderBy: { minCount: 'asc' },
    });
    return { code: 200, data: tiers };
  }

  /** 添加阶梯价 */
  async addTier(targetType: 'package' | 'product', targetId: number, dto: CreateGroupBuyTierDto) {
    if (targetType === 'package') {
      const pkg = await this.prisma.package.findUnique({ where: { id: targetId } });
      if (!pkg) throw new NotFoundException('套餐不存在');
    } else {
      const prod = await this.prisma.product.findUnique({ where: { id: targetId } });
      if (!prod) throw new NotFoundException('商品不存在');
    }

    const where = targetType === 'package' ? { packageId: targetId } : { productId: targetId };

    // 检查 minCount 是否已存在
    const existing = await this.prisma.groupBuyTier.findFirst({
      where: { ...where, minCount: dto.minCount },
    });
    if (existing) throw new BadRequestException('该人数阶梯已存在');

    const data = targetType === 'package'
      ? { packageId: targetId, minCount: dto.minCount, price: dto.price }
      : { productId: targetId, minCount: dto.minCount, price: dto.price };

    const tier = await this.prisma.groupBuyTier.create({ data });
    return { code: 200, message: '添加成功', data: tier };
  }

  /** 更新阶梯价 */
  async updateTier(tierId: number, dto: UpdateGroupBuyTierDto) {
    const tier = await this.prisma.groupBuyTier.findUnique({ where: { id: tierId } });
    if (!tier) throw new NotFoundException('阶梯不存在');

    const data: any = {};
    if (dto.minCount !== undefined) data.minCount = dto.minCount;
    if (dto.price !== undefined) data.price = dto.price;

    const updated = await this.prisma.groupBuyTier.update({
      where: { id: tierId },
      data,
    });
    return { code: 200, message: '已更新', data: updated };
  }

  /** 删除阶梯价 */
  async deleteTier(tierId: number) {
    const tier = await this.prisma.groupBuyTier.findUnique({ where: { id: tierId } });
    if (!tier) throw new NotFoundException('阶梯不存在');

    await this.prisma.groupBuyTier.delete({ where: { id: tierId } });
    return { code: 200, message: '已删除' };
  }

  /** 团购数据统计 */
  async getStats() {
    const [total, active, success, failed, totalParticipants] = await Promise.all([
      this.prisma.groupBuyActivity.count(),
      this.prisma.groupBuyActivity.count({ where: { status: 'ACTIVE' } }),
      this.prisma.groupBuyActivity.count({ where: { status: 'SUCCESS' } }),
      this.prisma.groupBuyActivity.count({ where: { status: 'FAILED' } }),
      this.prisma.groupBuyParticipant.count(),
    ]);

    const successRate = total > 0 ? Number(((success / total) * 100).toFixed(1)) : 0;
    const avgParticipants = success > 0
      ? Number((totalParticipants / total).toFixed(1))
      : 0;

    return {
      code: 200,
      message: '查询成功',
      data: { total, active, success, failed, successRate, avgParticipants, totalParticipants },
    };
  }

  /** 退团（小程序端，仅限非团长在活动进行中退出） */
  async leave(activityId: string, wxUserId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      include: { participants: true },
    });
    if (!activity) throw new NotFoundException('团购活动不存在');

    if (activity.status !== 'ACTIVE') {
      throw new BadRequestException('只能在进行中的团购中退团');
    }

    // 团长不能退团，只能取消整个团购
    if (activity.creatorUserId === wxUserId) {
      throw new BadRequestException('团长不能退团，如需关闭请取消团购');
    }

    const participant = activity.participants.find((p) => p.userId === wxUserId);
    if (!participant) throw new BadRequestException('您未参与该团购');

    await this.prisma.groupBuyParticipant.delete({ where: { id: participant.id } });

    return { code: 200, message: '退团成功' };
  }

  /** 查询用户参与的团购（小程序用） */
  async getUserActivities(wxUserId: string) {
    const activities = await this.prisma.groupBuyActivity.findMany({
      where: {
        participants: { some: { userId: wxUserId } },
      },
      include: {
        package: { select: { id: true, name: true, images: true, price: true, groupPrice: true } },
        product: { select: { id: true, name: true, images: true, salePrice: true } },
        creator: { select: { id: true, nickname: true, avatar: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { code: 200, message: '查询成功', data: activities };
  }

  /** 后台取消团购 */
  async cancel(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('团购活动不存在');
    if (activity.status !== 'ACTIVE') throw new BadRequestException('只能取消进行中的团购');

    await this.prisma.groupBuyActivity.update({
      where: { id: activityId },
      data: { status: 'FAILED' },
    });

    return { code: 200, message: '已取消该团购' };
  }

  /** 后台删除团购（删除参与者 + 活动本身） */
  async adminDelete(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('团购活动不存在');

    await this.prisma.groupBuyParticipant.deleteMany({ where: { activityId } });
    await this.prisma.groupBuyActivity.delete({ where: { id: activityId } });

    return { code: 200, message: '已删除团购' };
  }

  /** 后台手动创建团购 */
  async adminCreate(dto: AdminCreateGroupBuyDto) {
    if (!dto.packageId && !dto.productId) {
      throw new BadRequestException('请指定套餐或商品');
    }

    if (dto.packageId) {
      const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
      if (!pkg) throw new NotFoundException('套餐不存在');
    }
    if (dto.productId) {
      const prod = await this.prisma.product.findUnique({ where: { id: dto.productId } });
      if (!prod) throw new NotFoundException('商品不存在');
    }

    const user = await this.prisma.wxUser.findUnique({ where: { id: dto.creatorUserId } });
    if (!user) throw new NotFoundException('用户不存在');

    const minCount = dto.minCount || 2;
    const expiredAt = new Date(Date.now() + this.GROUP_BUY_EXPIRY_HOURS * 60 * 60 * 1000);

    const activity = await this.prisma.groupBuyActivity.create({
      data: {
        packageId: dto.packageId || null,
        productId: dto.productId || null,
        creatorUserId: dto.creatorUserId,
        minCount,
        maxCount: dto.maxCount,
        expiredAt,
      },
      include: { package: true, product: true },
    });

    return { code: 200, message: '创建成功', data: activity };
  }

  /** 后台恢复已撤销的团购（FAILED → ACTIVE） */
  async adminRestore(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('团购活动不存在');
    if (activity.status !== 'FAILED') throw new BadRequestException('只能恢复已失败的团购');

    const expiredAt = new Date(Date.now() + this.GROUP_BUY_EXPIRY_HOURS * 60 * 60 * 1000);

    await this.prisma.groupBuyActivity.update({
      where: { id: activityId },
      data: { status: 'ACTIVE', expiredAt },
    });

    return { code: 200, message: '已恢复' };
  }

  /** 后台编辑团购 */
  async adminUpdate(activityId: string, dto: UpdateGroupBuyDto) {
    const activity = await this.prisma.groupBuyActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('团购活动不存在');

    const data: any = {};
    if (dto.minCount !== undefined) data.minCount = dto.minCount;
    if (dto.maxCount !== undefined) data.maxCount = dto.maxCount;
    if (dto.expiredAt !== undefined) data.expiredAt = new Date(dto.expiredAt);

    await this.prisma.groupBuyActivity.update({
      where: { id: activityId },
      data,
    });
    return { code: 200, message: '已更新' };
  }

  /** 定时检查过期团购：标记为 FAILED，参与者按团购价成交（不退款） */
  async expireStaleActivities() {
    const expired = await this.prisma.groupBuyActivity.findMany({
      where: { status: 'ACTIVE', expiredAt: { lte: new Date() } },
    });

    if (expired.length === 0) return;

    const expiredIds = expired.map(a => a.id);

    // 标记活动为 FAILED
    await this.prisma.groupBuyActivity.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: 'FAILED' },
    });

    // 参与者标记为 SUCCESS（按团购价成交，不退款）
    await this.prisma.groupBuyParticipant.updateMany({
      where: { activityId: { in: expiredIds }, status: 'JOINED' },
      data: { status: 'SUCCESS' },
    });

    this.logger.log(`已处理 ${expired.length} 个过期团购，参与者按团购价成交`);
  }
}
