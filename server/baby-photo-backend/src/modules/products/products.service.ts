import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductBatchUpdateStatusDto } from './dto/batch-update-status.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateProductDto) {
    this.logger.log(`创建商品: ${createDto.name}`);

    // 检查商品编号是否已存在
    const existing = await this.prisma.product.findUnique({
      where: { productNo: createDto.productNo },
    });
    if (existing) {
      throw new ConflictException(`商品编号 "${createDto.productNo}" 已存在`);
    }

    // 检查分类是否存在
    const category = await this.prisma.productCategory.findUnique({
      where: { id: createDto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`分类 ID=${createDto.categoryId} 不存在`);
    }

    try {
      const product = await this.prisma.product.create({
        data: {
          productNo: createDto.productNo,
          name: createDto.name,
          categoryId: createDto.categoryId,
          brand: createDto.brand,
          model: createDto.model,
          specification: createDto.specification,
          unit: createDto.unit || '件',
          costPrice: createDto.costPrice || 0,
          salePrice: createDto.salePrice,
          marketPrice: createDto.marketPrice,
          stockQuantity: createDto.stockQuantity || 0,
          lowStock: createDto.lowStock || 10,
          minStock: createDto.minStock,
          maxStock: createDto.maxStock,
          reorderPoint: createDto.reorderPoint,
          isTrackStock: createDto.isTrackStock ?? true,
          description: createDto.description,
          images: createDto.images,
          attributes: createDto.attributes,
          status: createDto.status || 'ACTIVE',
          isActive: createDto.isActive ?? true,
          isFeatured: createDto.isFeatured ?? false,
        },
        include: {
          category: true,
        },
      });

      this.logger.log(`商品创建成功: ID=${product.id}`);
      return { code: 200, message: '创建成功', data: product };
    } catch (error) {
      this.logger.error(`创建商品失败: ${error.message}`);
      throw error;
    }
  }

  async findAll(query: QueryProductDto) {
    const { categoryId, status, isActive, isFeatured, keyword, stockStatus, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { productNo: { contains: keyword } },
      ];
    }

    // 库存状态筛选
    if (stockStatus) {
      if (stockStatus === 'OUT') {
        where.stockQuantity = 0;
      } else if (stockStatus === 'LOW') {
        where.AND = [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: { lte: this.prisma.product.fields.lowStock } },
        ];
      } else if (stockStatus === 'NORMAL') {
        where.stockQuantity = { gt: this.prisma.product.fields.lowStock };
      }
    }

    try {
      const [total, list] = await Promise.all([
        this.prisma.product.count({ where }),
        this.prisma.product.findMany({
          where,
          include: {
            category: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        code: 200,
        message: '查询成功',
        data: {
          list,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询商品列表失败: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!product) {
        throw new NotFoundException(`商品 ID=${id} 不存在`);
      }

      return { code: 200, message: '查询成功', data: product };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`查询商品详情失败: ${error.message}`);
      throw error;
    }
  }

  async update(id: number, updateDto: UpdateProductDto) {
    this.logger.log(`更新商品: ID=${id}`);
    this.logger.log(`更新数据: ${JSON.stringify(updateDto)}`);

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`商品 ID=${id} 不存在`);
    }

    // 检查商品编号是否重复
    if (updateDto.productNo && updateDto.productNo !== existing.productNo) {
      const duplicate = await this.prisma.product.findFirst({
        where: { productNo: updateDto.productNo, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException(`商品编号 "${updateDto.productNo}" 已存在`);
      }
    }

    // 检查分类是否存在
    if (updateDto.categoryId && updateDto.categoryId !== existing.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: updateDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`分类 ID=${updateDto.categoryId} 不存在`);
      }
    }

    try {
      // 记录价格变更
      if (updateDto.salePrice !== undefined && Number(updateDto.salePrice) !== Number(existing.salePrice)) {
        this.logger.log(`价格变更: ID=${id}, ${existing.salePrice} → ${updateDto.salePrice}`);
      }
      if (updateDto.costPrice !== undefined && Number(updateDto.costPrice) !== Number(existing.costPrice)) {
        this.logger.log(`成本价变更: ID=${id}, ${existing.costPrice} → ${updateDto.costPrice}`);
      }
      if (updateDto.marketPrice !== undefined && Number(updateDto.marketPrice) !== Number(existing.marketPrice)) {
        this.logger.log(`市场价变更: ID=${id}, ${existing.marketPrice} → ${updateDto.marketPrice}`);
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updateDto,
        include: { category: true },
      });

      this.logger.log(`商品更新成功: ID=${id}, isActive=${product.isActive}`);
      return { code: 200, message: '更新成功', data: product };
    } catch (error) {
      this.logger.error(`更新商品失败: ${error.message}`);
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`删除商品: ID=${id}`);

    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`商品 ID=${id} 不存在`);
    }

    try {
      await this.prisma.product.delete({ where: { id } });
      this.logger.log(`商品删除成功: ID=${id}`);
      return { code: 200, message: '删除成功' };
    } catch (error) {
      this.logger.error(`删除商品失败: ${error.message}`);
      throw error;
    }
  }

  async updateStock(id: number, updateDto: UpdateStockDto) {
    this.logger.log(`更新库存: ID=${id}, ${updateDto.operation} ${updateDto.quantity}`);

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`商品 ID=${id} 不存在`);
    }

    let newQuantity = product.stockQuantity;
    if (updateDto.operation === 'ADD') {
      newQuantity += updateDto.quantity;
    } else if (updateDto.operation === 'SUBTRACT') {
      newQuantity -= updateDto.quantity;
      if (newQuantity < 0) {
        throw new BadRequestException('库存不足');
      }
    } else if (updateDto.operation === 'SET') {
      newQuantity = updateDto.quantity;
    }

    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: { stockQuantity: newQuantity },
      });

      this.logger.log(`库存更新成功: ID=${id}, 新库存=${newQuantity}`);
      return { code: 200, message: '库存更新成功', data: updated };
    } catch (error) {
      this.logger.error(`更新库存失败: ${error.message}`);
      throw error;
    }
  }

  async batchUpdateStatus(batchDto: ProductBatchUpdateStatusDto) {
    this.logger.log(`批量更新状态: ${batchDto.productIds.length} 个商品`);

    try {
      await this.prisma.product.updateMany({
        where: { id: { in: batchDto.productIds } },
        data: { status: batchDto.status },
      });

      this.logger.log('批量更新状态成功');
      return { code: 200, message: '批量更新成功' };
    } catch (error) {
      this.logger.error(`批量更新状态失败: ${error.message}`);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const [total, active, lowStock, outOfStock] = await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({
          where: {
            AND: [
              { stockQuantity: { gt: 0 } },
              { stockQuantity: { lte: this.prisma.product.fields.lowStock } },
            ],
          },
        }),
        this.prisma.product.count({ where: { stockQuantity: 0 } }),
      ]);

      return {
        code: 200,
        message: '查询成功',
        data: {
          total,
          active,
          inactive: total - active,
          lowStock,
          outOfStock,
        },
      };
    } catch (error) {
      this.logger.error(`获取统计失败: ${error.message}`);
      throw error;
    }
  }
}
