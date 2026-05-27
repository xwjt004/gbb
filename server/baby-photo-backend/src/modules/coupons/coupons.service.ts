import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const data = await this.prisma.coupon.create({
      data: {
        couponCode: dto.couponCode,
        couponName: dto.couponName,
        couponType: dto.couponType as any,
        discountType: dto.discountType as any,
        discountValue: dto.discountValue,
        minAmount: dto.minAmount,
        maxDiscount: dto.maxDiscount,
        totalCount: dto.totalCount,
        perUserLimit: dto.perUserLimit || 1,
        applicableType: dto.applicableType || 'ALL',
        applicableIds: dto.applicableIds || [],
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        description: dto.description,
      },
    });
    return { code: 200, message: '创建成功', data };
  }

  async findAll(query: { page?: number; pageSize?: number; status?: string }) {
    const { page = 1, pageSize = 20, status } = query;
    const where: any = {};
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: { list, pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } },
    };
  }

  async findOne(id: string) {
    const data = await this.prisma.coupon.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('优惠券不存在');
    return { code: 200, message: '查询成功', data };
  }

  async update(id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('优惠券不存在');

    const updateData: any = {};
    if (dto.couponCode !== undefined) updateData.couponCode = dto.couponCode;
    if (dto.couponName !== undefined) updateData.couponName = dto.couponName;
    if (dto.couponType !== undefined) updateData.couponType = dto.couponType;
    if (dto.discountType !== undefined) updateData.discountType = dto.discountType;
    if (dto.discountValue !== undefined) updateData.discountValue = dto.discountValue;
    if (dto.minAmount !== undefined) updateData.minAmount = dto.minAmount;
    if (dto.maxDiscount !== undefined) updateData.maxDiscount = dto.maxDiscount;
    if (dto.totalCount !== undefined) updateData.totalCount = dto.totalCount;
    if (dto.perUserLimit !== undefined) updateData.perUserLimit = dto.perUserLimit;
    if (dto.applicableType !== undefined) updateData.applicableType = dto.applicableType;
    if (dto.applicableIds !== undefined) updateData.applicableIds = dto.applicableIds;
    if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = new Date(dto.endTime);
    if (dto.description !== undefined) updateData.description = dto.description;

    const data = await this.prisma.coupon.update({ where: { id }, data: updateData });
    return { code: 200, message: '更新成功', data };
  }

  async remove(id: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('优惠券不存在');
    await this.prisma.coupon.update({ where: { id }, data: { status: 'INACTIVE' } });
    return { code: 200, message: '删除成功' };
  }
}
