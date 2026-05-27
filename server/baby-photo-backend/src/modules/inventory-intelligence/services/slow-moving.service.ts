import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SlowMovingQueryDto } from '../dto/slow-moving.dto';

@Injectable()
export class SlowMovingService {
  private readonly logger = new Logger(SlowMovingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getList(query: SlowMovingQueryDto) {
    const thresholdDays = query.thresholdDays || 90;
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const where: any = { isActive: true, isTrackStock: true };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true, name: true, productNo: true, stockQuantity: true,
        costPrice: true, categoryId: true,
        category: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });

    const enriched = await Promise.all(
      products.map(async (product: any) => {
        const lastTxn = await this.prisma.stockTransaction.findFirst({
          where: { productId: product.id, transactionType: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });

        const lastSaleDate = lastTxn?.createdAt ?? null;
        const daysSinceLastSale = lastSaleDate
          ? Math.floor((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const stockValue = Number(product.costPrice) * product.stockQuantity;

        let status = 'NORMAL';
        if (daysSinceLastSale >= thresholdDays * 2) status = 'DEAD_STOCK';
        else if (daysSinceLastSale >= thresholdDays) status = 'SLOW_MOVING';

        return {
          productId: product.id,
          productName: product.name,
          productNo: product.productNo,
          categoryName: product.category?.name || '-',
          stockQuantity: product.stockQuantity,
          costPrice: Number(product.costPrice),
          stockValue,
          lastSaleDate,
          daysSinceLastSale,
          thresholdDays,
          status,
        };
      }),
    );

    const filtered = query.status
      ? enriched.filter((e: any) => e.status === query.status)
      : enriched;

    filtered.sort((a: any, b: any) => b.daysSinceLastSale - a.daysSinceLastSale);

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const slowMovingItems = filtered.filter((e: any) => e.status === 'SLOW_MOVING' || e.status === 'DEAD_STOCK');
    const summary = {
      totalSlowMoving: slowMovingItems.length,
      totalDeadStock: slowMovingItems.filter((e: any) => e.status === 'DEAD_STOCK').length,
      totalStockValue: slowMovingItems.reduce((s: number, e: any) => s + e.stockValue, 0),
    };

    return { items: paginated, summary, pagination: { current: page, pageSize, total } };
  }

  async checkSlowMoving(thresholdDays?: number) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, isTrackStock: true },
      select: { id: true, name: true, slowMovingDays: true, stockQuantity: true },
    });

    let slowMovingCount = 0;
    let alertsCreated = 0;

    for (const product of products) {
      const threshold = thresholdDays || product.slowMovingDays || 90;

      const lastTxn = await this.prisma.stockTransaction.findFirst({
        where: { productId: product.id, transactionType: 'OUTBOUND' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      const daysSinceLastSale = lastTxn?.createdAt
        ? Math.floor((Date.now() - lastTxn.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastSale >= threshold) {
        slowMovingCount++;

        // Check if alert already exists for this product
        const existingAlert = await this.prisma.stockAlert.findFirst({
          where: {
            productId: product.id,
            alertType: 'SLOW_MOVING',
            status: { in: ['PENDING', 'PROCESSING'] },
          },
        });

        if (!existingAlert) {
          const priority = daysSinceLastSale >= threshold * 2 ? 'HIGH' : 'MEDIUM';
          await this.prisma.stockAlert.create({
            data: {
              alertNo: `SLW-${Date.now()}-${product.id}`,
              productId: product.id,
              alertType: 'SLOW_MOVING',
              currentStock: product.stockQuantity,
              threshold,
              status: 'PENDING',
              priority,
              alertedAt: new Date(),
            },
          });
          alertsCreated++;
        }
      }
    }

    this.logger.log(`Slow-moving check: ${slowMovingCount} found, ${alertsCreated} new alerts`);
    return { checkedProducts: products.length, slowMovingCount, alertsCreated };
  }

  @Cron('0 2 * * *', { name: 'daily-slow-moving-check', timeZone: 'Asia/Shanghai' })
  async dailyCheck() {
    this.logger.log('Starting daily slow-moving check...');
    await this.checkSlowMoving();
    this.logger.log('Daily slow-moving check completed');
  }
}
