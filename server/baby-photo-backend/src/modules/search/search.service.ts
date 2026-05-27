import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  constructor(private readonly prisma: PrismaService) {}

  async global(params: { keyword: string; limit?: number; type?: string; page?: number }) {
    const { keyword, limit = 5, type, page = 1 } = params;
    if (!keyword) throw new BadRequestException('keyword 不能为空');
    const take = limit;
    const skip = (page - 1) * take;
    const userWhere = {
      OR: [
        { nickname: { contains: keyword, mode: 'insensitive' as const } },
        { phone: { contains: keyword } },
      ],
    };
    const orderWhere = {
      OR: [
        { orderNo: { contains: keyword, mode: 'insensitive' as const } },
        { user: { nickname: { contains: keyword, mode: 'insensitive' as const } } },
        { user: { phone: { contains: keyword } } },
      ],
    };
    const packageWhere = {
      name: { contains: keyword, mode: 'insensitive' as const },
    };
    const paymentWhere = {
      OR: [
        { id: { contains: keyword, mode: 'insensitive' as const } },
        { transactionId: { contains: keyword, mode: 'insensitive' as const } },
        { order: { orderNo: { contains: keyword, mode: 'insensitive' as const } } },
        { order: { user: { phone: { contains: keyword } } } },
        { order: { user: { nickname: { contains: keyword, mode: 'insensitive' as const } } } },
      ],
    };
    try {
      const doUsers = async () => {
        const [items, total] = await Promise.all([
          this.prisma.user.findMany({
            where: userWhere,
            take,
            skip,
            select: {
              openid: true,
              nickname: true,
              phone: true,
              avatar: true,
              status: true,
              createdAt: true,
              _count: { select: { orders: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.user.count({ where: userWhere }),
        ]);
        return { items, total };
      };
      const doOrders = async () => {
        const [items, total] = await Promise.all([
          this.prisma.order.findMany({
            where: orderWhere,
            take,
            skip,
            include: {
              user: { select: { nickname: true, phone: true, avatar: true, openid: true } },
              package: { select: { name: true, price: true, id: true } },
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.order.count({ where: orderWhere }),
        ]);
        return { items, total };
      };
      const doPackages = async () => {
        const [items, total] = await Promise.all([
          this.prisma.package.findMany({
            where: packageWhere,
            take,
            skip,
            select: {
              id: true,
              name: true,
              price: true,
              deposit: true,
              durationMinutes: true,
              includes: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.package.count({ where: packageWhere }),
        ]);
        return { items, total };
      };
      const doPayments = async () => {
        const [items, total] = await Promise.all([
          this.prisma.payment.findMany({
            where: paymentWhere,
            take,
            skip,
            include: {
              order: {
                select: {
                  orderNo: true,
                  user: { select: { nickname: true, phone: true, openid: true } },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.payment.count({ where: paymentWhere }),
        ]);
        return { items, total };
      };

      const needAll = !type;
      const [users, orders, packages, payments] = await Promise.all([
        needAll || type === 'user' ? doUsers() : Promise.resolve(undefined),
        needAll || type === 'order' ? doOrders() : Promise.resolve(undefined),
        needAll || type === 'package' ? doPackages() : Promise.resolve(undefined),
        needAll || type === 'payment' ? doPayments() : Promise.resolve(undefined),
      ]);

      return {
        code: 200,
        message: '搜索成功',
        data: {
          users: users?.items?.map(u => {
            const orderCount = u._count?.orders || 0;
            const isVip = orderCount >= 10;
            const vipLevel = orderCount >= 30 ? 3 : orderCount >= 20 ? 2 : orderCount >= 10 ? 1 : undefined;
            return { ...u, isVip, vipLevel };
          }) || [],
          orders: orders?.items || [],
            packages: packages?.items || [],
          payments: payments?.items || [],
          meta: {
            users: users ? { total: users.total, page, limit: take, totalPages: Math.ceil(users.total / take) } : undefined,
            orders: orders ? { total: orders.total, page, limit: take, totalPages: Math.ceil(orders.total / take) } : undefined,
            packages: packages ? { total: packages.total, page, limit: take, totalPages: Math.ceil(packages.total / take) } : undefined,
            payments: payments ? { total: payments.total, page, limit: take, totalPages: Math.ceil(payments.total / take) } : undefined,
          },
        },
      };
    } catch (e) {
      this.logger.error(`全局搜索失败: ${e.message}`, e.stack);
      throw new BadRequestException('搜索失败');
    }
  }
}
