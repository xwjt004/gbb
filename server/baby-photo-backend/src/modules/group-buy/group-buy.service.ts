import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PaymentStatus } from '../../shared/enums/status.enum';
import { StartGroupBuyDto } from './dto/start-group-buy.dto';
import { AdminCreateGroupBuyDto } from './dto/admin-create-group-buy.dto';
import { UpdateGroupBuyDto } from './dto/update-group-buy.dto';
import { QueryGroupBuyDto } from './dto/query-group-buy.dto';

@Injectable()
export class GroupBuyService {
  private readonly logger = new Logger(GroupBuyService.name);
  // 团购有效期：48小时
  private readonly GROUP_BUY_EXPIRY_HOURS = 48;

  constructor(private readonly prisma: PrismaService) {}

  /** 开团 */
  async start(wxUserId: string, dto: StartGroupBuyDto) {
    const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('套餐不存在');

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
        packageId: dto.packageId,
        creatorUserId: wxUserId,
        minCount,
        expiredAt,
        participants: {
          create: { userId: wxUserId, status: 'JOINED' },
        },
      },
      include: {
        package: true,
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

    // 参团：已成团的直接设为 SUCCESS 状态，未成团的设为 JOINED
    const participantStatus = activity.status === 'SUCCESS' ? 'SUCCESS' : 'JOINED';
    await this.prisma.groupBuyParticipant.create({
      data: { activityId, userId: wxUserId, status: participantStatus },
    });

    // 未成团时检查是否达到成团条件（2人即可成团）
    if (activity.status === 'ACTIVE') {
      const updatedCount = await this.prisma.groupBuyParticipant.count({ where: { activityId } });
      if (updatedCount >= activity.minCount) {
        await this.completeGroupBuy(activityId);
      }
    }

    return { code: 200, message: '参团成功' };
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

    // 为每位参团者生成9折优惠券
    const pkg = await this.prisma.package.findUnique({ where: { id: activity.packageId } });
    if (!pkg) return;

    // 查找或创建团购9折券模板
    let coupon = await this.prisma.coupon.findFirst({
      where: { couponType: 'GROUP_BUY', applicableIds: { has: activity.packageId } },
    });

    if (!coupon) {
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
          applicableIds: [activity.packageId],
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

    this.logger.log(`团购 ${activityId} 已成团，已发放 ${activity.participants.length} 张优惠券`);
  }

  /** 获取团购详情（含参团者） */
  async getDetail(activityId: string) {
    const activity = await this.prisma.groupBuyActivity.findUnique({
      where: { id: activityId },
      include: {
        package: true,
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

    const [items, total] = await Promise.all([
      this.prisma.groupBuyActivity.findMany({
        where,
        include: {
          package: { select: { id: true, name: true, price: true, groupPrice: true, images: true } },
          creator: { select: { id: true, nickname: true, avatar: true, phone: true } },
          orders: {
            select: { paymentStatus: true },
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
        paidCount: totalPaid,
        unpaidCount: item._count.participants - totalPaid,
      };
    });

    return { code: 200, message: '查询成功', data: { items: enrichedItems, pagination: { page, limit, total } } };
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
    const pkg = await this.prisma.package.findUnique({ where: { id: dto.packageId } });
    if (!pkg) throw new NotFoundException('套餐不存在');

    const user = await this.prisma.wxUser.findUnique({ where: { id: dto.creatorUserId } });
    if (!user) throw new NotFoundException('用户不存在');

    const minCount = dto.minCount || 2;
    const expiredAt = new Date(Date.now() + this.GROUP_BUY_EXPIRY_HOURS * 60 * 60 * 1000);

    const activity = await this.prisma.groupBuyActivity.create({
      data: {
        packageId: dto.packageId,
        creatorUserId: dto.creatorUserId,
        minCount,
        expiredAt,
      },
      include: { package: true },
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
    if (dto.expiredAt !== undefined) data.expiredAt = new Date(dto.expiredAt);

    await this.prisma.groupBuyActivity.update({
      where: { id: activityId },
      data,
    });
    return { code: 200, message: '已更新' };
  }

  /** 定时检查过期团购 */
  async expireStaleActivities() {
    const result = await this.prisma.groupBuyActivity.updateMany({
      where: {
        status: 'ACTIVE',
        expiredAt: { lte: new Date() },
      },
      data: { status: 'FAILED' },
    });
    if (result.count > 0) {
      this.logger.log(`已过期 ${result.count} 个未成团团购`);
    }
  }
}
