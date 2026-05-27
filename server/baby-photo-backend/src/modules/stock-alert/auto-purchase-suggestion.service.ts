import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PurchaseOrderService } from '../../supplier/purchase-order.service';

interface CreateSuggestionDto {
  productId: number;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
}

@Injectable()
export class AutoPurchaseSuggestionService {
  private readonly logger = new Logger(AutoPurchaseSuggestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseOrderService: PurchaseOrderService,
  ) {}

  async createIfNotExists(dto: CreateSuggestionDto) {
    const existing = await this.prisma.autoPurchaseSuggestion.findFirst({
      where: { productId: dto.productId, status: 'PENDING' },
    });
    if (existing) return existing;

    return this.prisma.autoPurchaseSuggestion.create({ data: dto });
  }

  async findAll(page = 1, pageSize = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.autoPurchaseSuggestion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { id: true, name: true, unit: true } } },
      }),
      this.prisma.autoPurchaseSuggestion.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  }

  async markIgnored(id: string) {
    const suggestion = await this.prisma.autoPurchaseSuggestion.findUnique({ where: { id } });
    if (!suggestion) throw new NotFoundException('采购建议不存在');
    if (suggestion.status !== 'PENDING') throw new BadRequestException('只能忽略待处理的建议');

    return this.prisma.autoPurchaseSuggestion.update({
      where: { id },
      data: { status: 'IGNORED' },
    });
  }

  async convertToPurchaseOrder(id: string, supplierId: string) {
    const suggestion = await this.prisma.autoPurchaseSuggestion.findUnique({
      where: { id },
      include: { product: true },
    });
    if (!suggestion) throw new NotFoundException('采购建议不存在');
    if (suggestion.status !== 'PENDING') throw new BadRequestException('只能转换待处理的建议');

    const today = new Date().toISOString().slice(0, 10);
    const result = await this.purchaseOrderService.create({
      supplierId,
      purchaseDate: today,
      items: [
        {
          productId: suggestion.productId,
          quantity: suggestion.suggestedQty,
          unitPrice: Number(suggestion.product.costPrice) || 0,
        },
      ],
      remark: `系统自动生成：库存低于预警值 (当前:${suggestion.currentStock}, 预警:${suggestion.minStock})`,
    });

    await this.prisma.autoPurchaseSuggestion.update({
      where: { id },
      data: { status: 'CONVERTED' },
    });

    return result;
  }
}
