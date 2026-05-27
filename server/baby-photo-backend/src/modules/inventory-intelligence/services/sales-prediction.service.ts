import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { PredictionQueryDto, ProductPredictionQueryDto } from '../dto/sales-prediction.dto';

@Injectable()
export class SalesPredictionService {
  private readonly logger = new Logger(SalesPredictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBatchForecasts(query: PredictionQueryDto) {
    const method = query.method || 'MA';
    const periods = query.periods || 30;
    const alpha = query.alpha || 0.3;
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const where: any = { isActive: true, isTrackStock: true };
    if (query.productIds?.length) {
      where.id = { in: query.productIds };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: { id: true, name: true, productNo: true, stockQuantity: true, salesVolume: true, costPrice: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periods * 2);

    const items = await Promise.all(
      products.map(async (product: any) => {
        const dailyMap = await this.getDailyOutboundQty(product.id, startDate, endDate);
        const dailyValues = Object.values(dailyMap);
        const last30dSales = dailyValues.slice(-30).reduce((s: number, v: number) => s + v, 0);

        let forecastDaily = 0;
        let confidence = 0;

        if (dailyValues.length >= 7) {
          if (method === 'ES') {
            forecastDaily = this.calcExponentialSmoothing(dailyValues, alpha);
            confidence = this.calcConfidence(dailyValues, forecastDaily);
          } else {
            forecastDaily = this.calcMovingAverage(dailyValues, Math.min(periods, dailyValues.length));
            confidence = this.calcConfidence(dailyValues, forecastDaily);
          }
        }

        // Update estimated daily consumption
        if (forecastDaily > 0) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { dailyConsumption: Math.round(forecastDaily) },
          }).catch(() => {}); // non-critical
        }

        return {
          productId: product.id,
          productName: product.name,
          productNo: product.productNo,
          currentStock: product.stockQuantity,
          method,
          forecastDaily: Math.round(forecastDaily * 10) / 10,
          forecastMonthly: Math.round(forecastDaily * 30),
          confidence: Math.round(confidence * 100) / 100,
          last30dSales,
        };
      }),
    );

    return { items, pagination: { current: page, pageSize, total } };
  }

  async getProductForecast(productId: number, query: ProductPredictionQueryDto) {
    const method = query.method || 'MA';
    const periods = query.periods || 30;
    const alpha = query.alpha || 0.3;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, productNo: true, stockQuantity: true, costPrice: true },
    });
    if (!product) {
      return { productId, forecastDaily: 0, forecastMonthly: 0, historicalData: [], smoothedValues: [] };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periods * 2);

    const dailyMap = await this.getDailyOutboundQty(productId, startDate, endDate);
    const historicalData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, qty]) => ({ date, qty }));

    const dailyValues = historicalData.map((d) => d.qty);
    let forecastDaily = 0;
    let smoothedValues: { date: string; actual: number; smoothed: number }[] = [];

    if (dailyValues.length >= 7) {
      if (method === 'ES') {
        forecastDaily = this.calcExponentialSmoothing(dailyValues, alpha);
        smoothedValues = this.getSmoothingSeries(historicalData, dailyValues, alpha);
      } else {
        forecastDaily = this.calcMovingAverage(dailyValues, Math.min(periods, dailyValues.length));
      }
    }

    return {
      productId: product.id,
      productName: product.name,
      productNo: product.productNo,
      currentStock: product.stockQuantity,
      method,
      forecastDaily: Math.round(forecastDaily * 10) / 10,
      forecastMonthly: Math.round(forecastDaily * 30),
      historicalData: historicalData.slice(-periods),
      smoothedValues: method === 'ES' ? smoothedValues.slice(-periods) : undefined,
    };
  }

  private async getDailyOutboundQty(productId: number, startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const transactions = await this.prisma.stockTransaction.findMany({
      where: {
        productId,
        transactionType: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, quantity: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap: Record<string, number> = {};
    for (const txn of transactions) {
      const dateKey = txn.createdAt.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + txn.quantity;
    }
    return dailyMap;
  }

  private calcMovingAverage(dailyValues: number[], window: number): number {
    if (dailyValues.length < window) return 0;
    const recent = dailyValues.slice(-window);
    return recent.reduce((s, v) => s + v, 0) / window;
  }

  private calcExponentialSmoothing(dailyValues: number[], alpha: number): number {
    if (dailyValues.length === 0) return 0;
    let smoothed = dailyValues[0];
    for (let i = 1; i < dailyValues.length; i++) {
      smoothed = alpha * dailyValues[i] + (1 - alpha) * smoothed;
    }
    return smoothed;
  }

  private getSmoothingSeries(
    historicalData: { date: string; qty: number }[],
    dailyValues: number[],
    alpha: number,
  ): { date: string; actual: number; smoothed: number }[] {
    if (dailyValues.length === 0) return [];
    let smoothed = dailyValues[0];
    const result = [{ date: historicalData[0].date, actual: dailyValues[0], smoothed }];
    for (let i = 1; i < dailyValues.length; i++) {
      smoothed = alpha * dailyValues[i] + (1 - alpha) * smoothed;
      result.push({ date: historicalData[i].date, actual: dailyValues[i], smoothed: Math.round(smoothed * 10) / 10 });
    }
    return result;
  }

  private calcConfidence(dailyValues: number[], forecast: number): number {
    if (forecast <= 0 || dailyValues.length < 7) return 0;
    const mean = dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length;
    if (mean <= 0) return 0.5;
    const variance = dailyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    // Confidence = 1 - min(cv, 1), clamped to [0.1, 0.95]
    return Math.max(0.1, Math.min(0.95, 1 - cv));
  }
}
