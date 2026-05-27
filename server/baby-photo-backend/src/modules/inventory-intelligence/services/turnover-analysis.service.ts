import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TurnoverQueryDto } from '../dto/turnover-analysis.dto';

@Injectable()
export class TurnoverAnalysisService {
  private readonly logger = new Logger(TurnoverAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAnalysis(query: TurnoverQueryDto) {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Get all active products
    const productWhere: any = { isActive: true, isTrackStock: true };
    if (query.categoryId) productWhere.categoryId = query.categoryId;

    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true, name: true, stockQuantity: true, costPrice: true, categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });

    // Current total stock value
    const currentStockValue = products.reduce((s: number, p: any) => s + Number(p.costPrice) * p.stockQuantity, 0);

    // Get inbound transactions (COGS approximation)
    const inboundTxns = await this.prisma.stockTransaction.findMany({
      where: {
        transactionType: 'INBOUND',
        createdAt: { gte: startDate, lte: endDate },
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}),
      },
      select: { quantity: true, product: { select: { costPrice: true, categoryId: true } } },
    });

    const cogs = inboundTxns.reduce((s: number, t: any) => s + t.quantity * Number(t.product?.costPrice || 0), 0);

    // Estimate average inventory (current + beginning) / 2
    // Beginning stock approximated as current stock - total inbound + total outbound in period
    const { _sum: outboundSum } = await this.prisma.stockTransaction.aggregate({
      _sum: { quantity: true },
      where: {
        transactionType: 'OUTBOUND',
        createdAt: { gte: startDate, lte: endDate },
        ...(query.productId ? { productId: query.productId } : {}),
      },
    });
    const { _sum: inboundSum } = await this.prisma.stockTransaction.aggregate({
      _sum: { quantity: true },
      where: {
        transactionType: 'INBOUND',
        createdAt: { gte: startDate, lte: endDate },
        ...(query.productId ? { productId: query.productId } : {}),
      },
    });

    const totalOutboundQty = outboundSum?.quantity || 0;
    const totalInboundQty = inboundSum?.quantity || 0;
    const totalStockQty = products.reduce((s: number, p: any) => s + p.stockQuantity, 0);

    // Beginning stock = ending stock - net change
    const beginningStockQty = Math.max(0, totalStockQty - totalInboundQty + totalOutboundQty);

    // Average inventory in value terms
    const avgCostPrice = products.length > 0
      ? products.reduce((s: number, p: any) => s + Number(p.costPrice), 0) / products.length
      : 0;
    const averageInventory = ((beginningStockQty + totalStockQty) / 2) * avgCostPrice;

    const turnoverRatio = averageInventory > 0
      ? Math.round((cogs / averageInventory) * 100) / 100
      : 0;
    const dio = turnoverRatio > 0
      ? Math.round(365 / turnoverRatio)
      : null;

    // By category breakdown
    const categoryMap = new Map<number, { name: string; cogs: number; avgInventory: number; stockValue: number }>();
    for (const p of products) {
      if (!p.category) continue;
      const catId = p.category.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { name: p.category.name, cogs: 0, avgInventory: 0, stockValue: 0 });
      }
      const cat = categoryMap.get(catId)!;
      cat.stockValue += Number(p.costPrice) * p.stockQuantity;
    }
    for (const txn of inboundTxns) {
      const catId = txn.product?.categoryId;
      if (catId && categoryMap.has(catId)) {
        categoryMap.get(catId)!.cogs += txn.quantity * Number(txn.product?.costPrice || 0);
      }
    }

    const byCategory = Array.from(categoryMap.entries()).map(([id, cat]: any) => {
      const catAvgInv = cat.stockValue; // simplified
      const catRatio = catAvgInv > 0 ? Math.round((cat.cogs / catAvgInv) * 100) / 100 : 0;
      const catDio = catRatio > 0 ? Math.round(365 / catRatio) : null;
      return {
        categoryId: id,
        categoryName: cat.name,
        turnoverRatio: catRatio,
        dio: catDio,
        stockValue: Math.round(cat.stockValue),
        suggestion: this.getCategorySuggestion(catRatio, catDio),
      };
    });

    // Top slowest products
    const productTurnovers = products.map((p: any) => {
      const pCogs = inboundTxns
        .filter((t: any) => t.product?.categoryId === p.categoryId)
        .reduce((s: number, t: any) => s + t.quantity * Number(t.product?.costPrice || 0), 0);
      const pAvgInv = Number(p.costPrice) * p.stockQuantity;
      const pRatio = pAvgInv > 0 ? Math.round((pCogs / pAvgInv) * 100) / 100 : 0;
      const pDio = pRatio > 0 ? Math.round(365 / pRatio) : null;
      return {
        productId: p.id,
        productName: p.name,
        turnoverRatio: pRatio,
        dio: pDio,
        stockQuantity: p.stockQuantity,
        stockValue: Math.round(Number(p.costPrice) * p.stockQuantity),
        suggestion: this.getProductSuggestion(pDio),
      };
    });

    productTurnovers.sort((a: any, b: any) => (b.dio ?? 999) - (a.dio ?? 999));
    const topSlowest = productTurnovers.filter((p: any) => p.dio !== null).slice(0, 10);

    return {
      overall: {
        turnoverRatio,
        daysInventoryOutstanding: dio,
        averageInventory: Math.round(averageInventory),
        cogs: Math.round(cogs),
        currentStockValue: Math.round(currentStockValue),
      },
      byCategory,
      topSlowest,
    };
  }

  async getReport(query: TurnoverQueryDto) {
    const analysis = await this.getAnalysis(query);

    // Per-product detailed report
    const where: any = { isActive: true, isTrackStock: true };
    if (query.productId) where.id = query.productId;
    if (query.categoryId) where.categoryId = query.categoryId;

    const products = await this.prisma.product.findMany({
      where,
      select: { id: true, name: true, stockQuantity: true, costPrice: true, safetyStock: true, dailyConsumption: true },
    });

    const details = products.map((p: any) => {
      const stockValue = Number(p.costPrice) * p.stockQuantity;
      const consumption = p.dailyConsumption || 1;
      const daysOfStock = consumption > 0 ? Math.round(p.stockQuantity / consumption) : 999;
      const dio = daysOfStock; // rough DIO from consumption rate
      const evaluation = !dio || dio >= 90 ? 'POOR' : dio >= 60 ? 'FAIR' : dio >= 30 ? 'GOOD' : 'EXCELLENT';

      return {
        productId: p.id,
        productName: p.name,
        stockQuantity: p.stockQuantity,
        costPrice: Number(p.costPrice),
        stockValue,
        dailyConsumption: p.dailyConsumption,
        daysOfStock,
        evaluation,
        suggestion: this.getProductSuggestion(dio),
      };
    });

    // Optimization suggestions
    const overstocked = details.filter((d: any) => d.daysOfStock >= 90).map((d: any) => ({
      productName: d.productName,
      stockValue: d.stockValue,
      suggestion: 'Consider promotional pricing or bundle deals to reduce excess inventory',
    }));
    const understocked = details.filter((d: any) => d.daysOfStock < 7 && d.stockQuantity > 0).map((d: any) => ({
      productName: d.productName,
      suggestion: 'Increase stock to avoid stockouts; consider expedited reorder',
    }));
    const fastMoving = details.filter((d: any) => d.evaluation === 'EXCELLENT' || d.evaluation === 'GOOD').map((d: any) => ({
      productName: d.productName,
      suggestion: 'Maintain current stocking level; consider bulk purchasing for cost savings',
    })).slice(0, 10);

    return {
      overview: analysis.overall,
      details,
      optimizationSuggestions: { overstocked, understocked, fastMoving },
    };
  }

  async refresh() {
    // Force refresh by re-running the analysis (data is always live from DB queries)
    const result = await this.getAnalysis({});
    this.logger.log('Turnover analysis data refreshed');
    return result;
  }

  private getCategorySuggestion(ratio: number, dio: number | null): string {
    if (dio === null) return 'No transaction data available for this category';
    if (dio >= 90) return 'High days inventory outstanding — consider discounting slow items';
    if (dio >= 60) return 'Moderate turnover — review stock levels for optimization';
    return 'Healthy turnover rate — maintain current inventory practices';
  }

  private getProductSuggestion(dio: number | null): string {
    if (dio === null) return 'Insufficient data for analysis';
    if (dio >= 180) return 'Dead stock — consider clearance sale or discontinuing';
    if (dio >= 90) return 'Slow moving — reduce reorder quantity and consider promotions';
    if (dio >= 60) return 'Average turnover — monitor regularly';
    if (dio >= 30) return 'Good turnover — maintain current strategy';
    return 'Fast moving — ensure adequate stock levels';
  }
}
