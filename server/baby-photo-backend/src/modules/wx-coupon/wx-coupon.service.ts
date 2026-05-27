import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  QueryCouponsDto,
  QueryMyCouponsDto,
  QueryAvailableCouponsDto,
  CouponStatusQuery,
} from './dto/query-coupons.dto';
import { ClaimCouponDto } from './dto/claim-coupon.dto';

@Injectable()
export class WxCouponService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取可领取的优惠券列表
   */
  async getAvailableCoupons(wxUserId: string, query: QueryCouponsDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    // 构建查询条件
    const where: any = {
      status: 'ACTIVE',
    };

    // 根据状态筛选
    if (status === CouponStatusQuery.AVAILABLE) {
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    } else if (status === CouponStatusQuery.EXPIRED) {
      where.endTime = { lt: now };
    }

    // 查询优惠券列表
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    // 检查用户是否已领取
    const couponIds = coupons.map((c) => c.id);
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        wxUserId,
        couponId: { in: couponIds },
      },
      select: { couponId: true, usedAt: true },
    });

    const userCouponMap = new Map(
      userCoupons.map((uc) => [uc.couponId, uc]),
    );

    // 添加领取和使用状态
    const items = coupons.map((coupon) => {
      const userCoupon = userCouponMap.get(coupon.id);
      const isExpired = now > coupon.endTime;
      const isAvailable = !isExpired && coupon.usedCount < coupon.totalCount;

      return {
        id: coupon.id,
        code: coupon.couponCode,
        name: coupon.couponName,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minAmount: coupon.minAmount ? Number(coupon.minAmount) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
        startTime: coupon.startTime,
        endTime: coupon.endTime,
        totalCount: coupon.totalCount,
        usedCount: coupon.usedCount,
        status: coupon.status,
        isClaimed: !!userCoupon,
        isUsed: !!userCoupon?.usedAt,
        isExpired,
        isAvailable,
        createdAt: coupon.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 领取优惠券
   */
  async claimCoupon(wxUserId: string, dto: ClaimCouponDto) {
    const { code } = dto;

    // 查找优惠券
    const coupon = await this.prisma.coupon.findUnique({
      where: { couponCode: code },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    // 检查优惠券状态
    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException('优惠券已失效');
    }

    // 检查是否在有效期内
    const now = new Date();
    if (now < coupon.startTime || now > coupon.endTime) {
      throw new BadRequestException('优惠券不在有效期内');
    }

    // 检查是否达到总量上限
    if (coupon.usedCount >= coupon.totalCount) {
      throw new BadRequestException('优惠券已被领完');
    }

    // 检查用户是否已领取
    const existingClaim = await this.prisma.userCoupon.findFirst({
      where: {
        wxUserId,
        couponId: coupon.id,
      },
    });

    if (existingClaim) {
      throw new ConflictException('您已领取过该优惠券');
    }

    // 创建用户优惠券记录
    const userCoupon = await this.prisma.userCoupon.create({
      data: {
        wxUserId,
        couponId: coupon.id,
        status: 'UNUSED',
        expiredAt: coupon.endTime,
      },
    });

    // 更新优惠券使用数量
    await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    return {
      id: coupon.id,
      code: coupon.couponCode,
      name: coupon.couponName,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minAmount: coupon.minAmount ? Number(coupon.minAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      startTime: coupon.startTime,
      endTime: coupon.endTime,
      totalCount: coupon.totalCount,
      usedCount: coupon.usedCount,
      status: coupon.status,
      receivedAt: userCoupon.receivedAt,
      usedAt: userCoupon.usedAt,
      isClaimed: true,
      isUsed: false,
      isExpired: false,
      isAvailable: true,
      createdAt: coupon.createdAt,
    };
  }

  /**
   * 获取我的优惠券列表
   */
  async getMyCoupons(wxUserId: string, query: QueryMyCouponsDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const now = new Date();

    // 构建查询条件
    const where: any = {
      wxUserId,
    };

    // 根据状态筛选
    if (status) {
      if (status === CouponStatusQuery.AVAILABLE) {
        where.status = 'UNUSED';
        where.expiredAt = { gte: now };
      } else if (status === CouponStatusQuery.USED) {
        where.status = 'USED';
      } else if (status === CouponStatusQuery.EXPIRED) {
        where.OR = [
          { status: 'EXPIRED' },
          { expiredAt: { lt: now }, status: 'UNUSED' },
        ];
      }
    }

    // 查询用户优惠券列表
    const [userCoupons, total] = await Promise.all([
      this.prisma.userCoupon.findMany({
        where,
        include: {
          coupon: true,
        },
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.userCoupon.count({ where }),
    ]);

    // 转换为响应格式
    const items = userCoupons.map((uc) => {
      const isExpired = now > uc.expiredAt || uc.status === 'EXPIRED';
      const isUsed = uc.status === 'USED';

      return {
        id: uc.coupon.id,
        code: uc.coupon.couponCode,
        name: uc.coupon.couponName,
        description: uc.coupon.description,
        discountType: uc.coupon.discountType,
        discountValue: Number(uc.coupon.discountValue),
        minAmount: uc.coupon.minAmount ? Number(uc.coupon.minAmount) : null,
        maxDiscount: uc.coupon.maxDiscount
          ? Number(uc.coupon.maxDiscount)
          : null,
        startTime: uc.coupon.startTime,
        endTime: uc.coupon.endTime,
        totalCount: uc.coupon.totalCount,
        usedCount: uc.coupon.usedCount,
        status: uc.coupon.status,
        receivedAt: uc.receivedAt,
        usedAt: uc.usedAt,
        isClaimed: true,
        isUsed,
        isExpired,
        isAvailable: !isExpired && !isUsed,
        createdAt: uc.coupon.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取订单可用的优惠券列表
   */
  async getAvailableCouponsForOrder(
    wxUserId: string,
    query: QueryAvailableCouponsDto,
  ) {
    const { amount } = query;
    const now = new Date();

    // 查询用户的所有未使用优惠券
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        wxUserId,
        status: 'UNUSED',
        expiredAt: { gte: now },
      },
      include: {
        coupon: true,
      },
    });

    // 筛选可用的优惠券
    const availableCoupons = userCoupons
      .filter((uc) => {
        const coupon = uc.coupon;
        // 检查优惠券状态和有效期
        if (coupon.status !== 'ACTIVE') return false;
        if (now < coupon.startTime || now > coupon.endTime) return false;
        // 检查最小金额
        const minAmount = coupon.minAmount ? Number(coupon.minAmount) : 0;
        return amount >= minAmount;
      })
      .map((uc) => {
        const coupon = uc.coupon;
        const discountValue = Number(coupon.discountValue);
        const maxDiscount = coupon.maxDiscount
          ? Number(coupon.maxDiscount)
          : null;

        // 计算可节省金额
        let savedAmount = 0;
        if (coupon.discountType === 'PERCENT') {
          savedAmount = (amount * discountValue) / 100;
          if (maxDiscount && savedAmount > maxDiscount) {
            savedAmount = maxDiscount;
          }
        } else {
          savedAmount = discountValue;
        }

        return {
          id: coupon.id,
          code: coupon.couponCode,
          name: coupon.couponName,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue,
          minAmount: coupon.minAmount ? Number(coupon.minAmount) : null,
          maxDiscount,
          startTime: coupon.startTime,
          endTime: coupon.endTime,
          totalCount: coupon.totalCount,
          usedCount: coupon.usedCount,
          status: coupon.status,
          receivedAt: uc.receivedAt,
          usedAt: uc.usedAt,
          savedAmount,
          isClaimed: true,
          isUsed: false,
          isExpired: false,
          isAvailable: true,
          createdAt: coupon.createdAt,
        };
      })
      .sort((a, b) => b.savedAmount - a.savedAmount);

    return availableCoupons;
  }

  /**
   * 获取优惠券详情
   */
  async getCouponDetail(couponId: string, wxUserId?: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    const now = new Date();
    const isExpired = now > coupon.endTime;
    const isAvailable = !isExpired && coupon.usedCount < coupon.totalCount;

    // 检查用户领取和使用状态
    let isClaimed = false;
    let isUsed = false;
    let receivedAt: Date | null = null;
    let usedAt: Date | null = null;

    if (wxUserId) {
      const userCoupon = await this.prisma.userCoupon.findFirst({
        where: {
          wxUserId,
          couponId,
        },
      });

      if (userCoupon) {
        isClaimed = true;
        isUsed = userCoupon.status === 'USED';
        receivedAt = userCoupon.receivedAt;
        usedAt = userCoupon.usedAt;
      }
    }

    return {
      id: coupon.id,
      code: coupon.couponCode,
      name: coupon.couponName,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minAmount: coupon.minAmount ? Number(coupon.minAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      startTime: coupon.startTime,
      endTime: coupon.endTime,
      totalCount: coupon.totalCount,
      usedCount: coupon.usedCount,
      status: coupon.status,
      receivedAt,
      usedAt,
      isClaimed,
      isUsed,
      isExpired,
      isAvailable,
      createdAt: coupon.createdAt,
    };
  }
}
