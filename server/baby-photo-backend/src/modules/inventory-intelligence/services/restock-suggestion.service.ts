import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RestockSuggestionQueryDto } from '../dto/restock-suggestion.dto';

@Injectable()
export class RestockSuggestionService {
  private readonly logger = new Logger(RestockSuggestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(query: RestockSuggestionQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const where: any = {};
    if (query.urgency) {
      // urgency is computed, not stored — filter in-memory after fetch
    }

    // Fetch existing auto-purchase suggestions
    const [items, total] = await Promise.all([
      this.prisma.autoPurchaseSuggestion.findMany({
        where,
        include: { product: { select: { id: true, name: true, unit: true, stockQuantity: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.autoPurchaseSuggestion.count({ where }),
    ]);

    // Enrich with urgency computation
    const enriched = items.map((item: any) => {
      const avgConsumption = item.product?.stockQuantity
        ? Math.max(1, Math.round(item.product.stockQuantity / 30))
        : 1;
      const daysUntilStockout = avgConsumption > 0
        ? Math.round(item.currentStock / avgConsumption)
        : 999;
      const urgency = daysUntilStockout <= 3 ? 'HIGH' : daysUntilStockout <= 7 ? 'MEDIUM' : 'LOW';

      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        currentStock: item.currentStock,
        minStock: item.minStock,
        suggestedQty: item.suggestedQty,
        status: item.status,
        daysUntilStockout,
        urgency,
        createdAt: item.createdAt,
      };
    });

    const filtered = query.urgency
      ? enriched.filter((e: any) => e.urgency === query.urgency)
      : enriched;

    return { items: filtered, pagination: { current: page, pageSize, total } };
  }

  async generateBatch() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, isTrackStock: true },
      select: {
        id: true, name: true, stockQuantity: true, minStock: true,
        safetyStock: true, dailyConsumption: true, reorderPoint: true,
      },
    });

    let generated = 0;
    const suggestions: any[] = [];

    for (const product of products) {
      const reorderPoint = product.reorderPoint ?? product.minStock ?? 10;
      const safetyStock = product.safetyStock || 0;
      const dailyConsumption = product.dailyConsumption || 1;

      if (product.stockQuantity <= reorderPoint) {
        // Calculate suggested qty: enough to cover lead time + safety stock
        const suggestedQty = Math.max(
          safetyStock * 2,
          dailyConsumption * 7 + safetyStock - product.stockQuantity,
        );

        // Create suggestion if not already exists in PENDING status
        try {
          await this.prisma.autoPurchaseSuggestion.create({
            data: {
              productId: product.id,
              productName: product.name,
              currentStock: product.stockQuantity,
              minStock: reorderPoint,
              suggestedQty: Math.max(1, Math.round(suggestedQty)),
              status: 'PENDING',
            },
          });
          generated++;
          suggestions.push({
            productId: product.id,
            productName: product.name,
            suggestedQty: Math.max(1, Math.round(suggestedQty)),
          });
        } catch (err: any) {
          // Duplicate or constraint error — skip
          this.logger.debug(`Skipping duplicate suggestion for product ${product.id}`);
        }
      }
    }

    this.logger.log(`Generated ${generated} restock suggestions`);
    return { generated, suggestions };
  }

  async convertToPurchaseOrder(suggestionId: string, supplierId?: string) {
    const suggestion = await this.prisma.autoPurchaseSuggestion.findUnique({
      where: { id: suggestionId },
    });
    if (!suggestion) {
      return { error: 'Suggestion not found' };
    }
    if (suggestion.status !== 'PENDING') {
      return { error: `Suggestion already ${suggestion.status}` };
    }

    // Get product info for productNo
    const product = await this.prisma.product.findUnique({
      where: { id: suggestion.productId },
      select: { productNo: true, salePrice: true },
    });

    // Find or use provided supplier
    let supplier: any = null;
    if (supplierId) {
      supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    }
    if (!supplier) {
      supplier = await this.prisma.supplier.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { totalOrders: 'desc' },
      });
    }

    if (!supplier) {
      return { error: 'No active supplier found' };
    }

    // Create purchase order
    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        purchaseNo: `PO-${Date.now()}`,
        purchaseDate: new Date(),
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        supplier: { connect: { id: supplier.id } },
        totalQuantity: suggestion.suggestedQty,
        totalAmount: 0,
        status: 'DRAFT',
        items: {
          create: {
            productId: suggestion.productId,
            productName: suggestion.productName,
            productNo: product?.productNo || '',
            quantity: suggestion.suggestedQty,
            unitPrice: 0,
            totalPrice: 0,
            unit: '件',
          },
        },
      },
    });

    // Mark suggestion as converted
    await this.prisma.autoPurchaseSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'CONVERTED' },
    });

    return { purchaseOrderId: purchaseOrder.id, purchaseNo: purchaseOrder.purchaseNo };
  }
}
