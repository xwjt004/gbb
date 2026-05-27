import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SafetyStockQueryDto, BatchCalculateDto, UpdateSafetyStockDto } from '../dto/safety-stock.dto';

@Injectable()
export class SafetyStockService {
  private readonly logger = new Logger(SafetyStockService.name);

  private readonly Z_TABLE: Record<number, number> = {
    0.5: 0,
    0.6: 0.25,
    0.7: 0.52,
    0.8: 0.84,
    0.85: 1.04,
    0.9: 1.28,
    0.95: 1.65,
    0.975: 1.96,
    0.99: 2.33,
    0.995: 2.58,
    0.999: 3.09,
  };

  constructor(private readonly prisma: PrismaService) {}

  async getList(query: SafetyStockQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const where: any = { isActive: true, isTrackStock: true };
    if (query.productId) {
      where.id = query.productId;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true, name: true, productNo: true, stockQuantity: true,
          safetyStock: true, dailyConsumption: true, reorderPoint: true, costPrice: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: products, pagination: { current: page, pageSize, total } };
  }

  private getZScore(serviceLevel: number): number {
    const keys = Object.keys(this.Z_TABLE).map(Number).sort((a, b) => a - b);
    for (const key of keys) {
      if (serviceLevel <= key) return this.Z_TABLE[key];
    }
    return 3.09; // max
  }

  private async getLeadTimeDays(productId: number): Promise<number> {
    // Try to find supplier lead time from purchase order items
    const purchaseItem = await this.prisma.purchaseOrderItem.findFirst({
      where: { productId },
      include: { purchaseOrder: { include: { supplier: true } } },
      orderBy: { id: 'desc' },
    });
    if (purchaseItem?.purchaseOrder?.supplier?.deliveryDays) {
      return purchaseItem.purchaseOrder.supplier.deliveryDays;
    }
    return 7; // default lead time
  }

  async calculateAndUpdate(productId: number, dto: UpdateSafetyStockDto) {
    const serviceLevel = dto.serviceLevel || 0.95;
    const demandPeriodDays = dto.demandPeriodDays || 90;

    const result: any = await this.calculate(productId, serviceLevel, demandPeriodDays);
    if (result.safetyStock !== undefined) {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          safetyStock: result.safetyStock,
          reorderPoint: result.reorderPoint,
        },
      });
    }
    return result;
  }

  async calculate(
    productId: number,
    serviceLevel: number,
    demandPeriodDays: number,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, stockQuantity: true },
    });

    if (!product) {
      return { productId, error: 'Product not found' };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - demandPeriodDays);

    // Get daily outbound quantities for demand calculation
    const transactions = await this.prisma.stockTransaction.findMany({
      where: {
        productId,
        transactionType: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { quantity: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyMap: Record<string, number> = {};
    for (const txn of transactions) {
      const dateKey = txn.createdAt.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + txn.quantity;
    }

    const dailyValues = Object.values(dailyMap);
    const n = dailyValues.length;

    const demandMean = n > 0 ? dailyValues.reduce((s, v) => s + v, 0) / n : 0;
    const demandStdDev = n > 1
      ? Math.sqrt(dailyValues.reduce((s, v) => s + (v - demandMean) ** 2, 0) / n)
      : 0;

    const leadTimeDays = await this.getLeadTimeDays(productId);
    const zScore = this.getZScore(serviceLevel);

    const safetyStock = Math.round(zScore * demandStdDev * Math.sqrt(leadTimeDays));
    const reorderPoint = Math.round(demandMean * leadTimeDays + safetyStock);

    return {
      productId: product.id,
      productName: product.name,
      currentStock: product.stockQuantity,
      demandMean: Math.round(demandMean * 10) / 10,
      demandStdDev: Math.round(demandStdDev * 10) / 10,
      leadTimeDays,
      serviceLevel,
      zScore,
      safetyStock,
      reorderPoint,
      suggestedMaxStock: Math.round(reorderPoint * 2),
    };
  }

  async batchCalculate(dto: BatchCalculateDto) {
    const serviceLevel = dto.serviceLevel || 0.95;
    const demandPeriodDays = dto.demandPeriodDays || 90;

    const products = await this.prisma.product.findMany({
      where: { isActive: true, isTrackStock: true },
      select: { id: true },
    });

    let updated = 0;
    const errors: { productId: number; error: string }[] = [];

    // Process in batches of 10 to avoid overloading
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (product: any) => {
          try {
            const result = await this.calculate(product.id, serviceLevel, demandPeriodDays);
            await this.prisma.product.update({
              where: { id: product.id },
              data: {
                safetyStock: result.safetyStock,
                reorderPoint: result.reorderPoint,
              },
            });
            updated++;
          } catch (err: any) {
            errors.push({ productId: product.id, error: err.message });
          }
        }),
      );
    }

    this.logger.log(`Batch safety stock: ${updated} updated, ${errors.length} errors out of ${products.length} products`);
    return { total: products.length, updated, errors };
  }

  @Cron('0 3 * * 0', { name: 'weekly-safety-stock', timeZone: 'Asia/Shanghai' })
  async weeklyBatchCalculation() {
    this.logger.log('Starting weekly safety stock batch calculation...');
    await this.batchCalculate({ serviceLevel: 0.95, demandPeriodDays: 90 });
    this.logger.log('Weekly safety stock calculation completed');
  }
}
