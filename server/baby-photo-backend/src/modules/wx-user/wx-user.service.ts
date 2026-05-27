import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueryWxUserDto } from './dto/query-wx-user.dto';
import { UpdateWxUserDto } from './dto/update-wx-user.dto';

@Injectable()
export class WxUserService {
  private readonly logger = new Logger(WxUserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWxUserDto) {
    const { page = 1, limit = 20, keyword, nickname, phone, memberLevel, churnStatus, status, startDate, endDate, sort = 'created_at_desc' } = query;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
        { realName: { contains: keyword, mode: 'insensitive' } },
      ];
    } else {
      if (nickname) where.nickname = { contains: nickname, mode: 'insensitive' };
      if (phone) where.phone = { contains: phone };
    }

    if (memberLevel) where.memberLevel = memberLevel;
    if (churnStatus) where.churnStatus = churnStatus;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orderMap: Record<string, any> = {
      'created_at_desc': { createdAt: 'desc' },
      'created_at_asc': { createdAt: 'asc' },
      'total_orders_desc': { totalOrders: 'desc' },
      'total_orders_asc': { totalOrders: 'asc' },
      'total_amount_desc': { totalAmount: 'desc' },
      'total_amount_asc': { totalAmount: 'asc' },
      'last_order_desc': { lastOrderAt: 'desc' },
      'last_order_asc': { lastOrderAt: 'asc' },
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.wxUser.findMany({
        where,
        orderBy: orderMap[sort] || { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wxUser.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.wxUser.findUnique({
      where: { id },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            package: { select: { name: true } },
            timeSlot: { select: { date: true, startTime: true, endTime: true } },
          },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('客户不存在');
    }

    return { code: 200, message: '查询成功', data: user };
  }

  async update(id: string, dto: UpdateWxUserDto) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('客户不存在');
    }

    const updated = await this.prisma.wxUser.update({
      where: { id },
      data: dto as any,
    });

    return { code: 200, message: '更新成功', data: updated };
  }

  async getOrders(id: string, page = 1, limit = 10) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('客户不存在');
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { wxUserId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          package: { select: { name: true } },
          timeSlot: { select: { date: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.order.count({ where: { wxUserId: id } }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async getStats() {
    const [total, levelDist] = await Promise.all([
      this.prisma.wxUser.count(),
      this.prisma.wxUser.groupBy({
        by: ['memberLevel'],
        _count: { id: true },
      }),
    ]);

    const levelDistribution = levelDist.map(l => ({
      level: l.memberLevel,
      count: l._count.id,
    }));

    return { code: 200, message: '查询成功', data: { total, levelDistribution } };
  }
}
