import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductBatchUpdateStatusDto } from './dto/batch-update-status.dto';
import { utils as XLSXUtils, write as XLSXWrite, WorkBook } from 'xlsx';

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
      // 先清理套餐关联
      await this.prisma.packageProduct.deleteMany({
        where: { productId: id },
      });

      // 清理购物车引用
      await this.prisma.cartItem.deleteMany({
        where: { productId: id },
      });

      // 解除订单引用（置空 productId 但保留订单记录中的商品名称）
      await this.prisma.orderItem.updateMany({
        where: { productId: id },
        data: { productId: null },
      });

      // 清理库存预警
      await this.prisma.stockAlert.deleteMany({
        where: { productId: id },
      });

      // 清理库存盘点记录
      await this.prisma.stockCheckItem.deleteMany({
        where: { productId: id },
      });

      // 清理库存交易记录
      await this.prisma.stockTransaction.deleteMany({
        where: { productId: id },
      });

      // 清理库存转移记录
      await this.prisma.stockTransfer.deleteMany({
        where: { productId: id },
      });

      // 清理出库单明细
      await this.prisma.stockOutboundItem.deleteMany({
        where: { productId: id },
      });

      // 清理自动采购建议
      await this.prisma.autoPurchaseSuggestion.deleteMany({
        where: { productId: id },
      });

      // 解除采购订单引用
      await this.prisma.purchaseOrderItem.updateMany({
        where: { productId: id },
        data: { productId: null },
      });

      // 解除收藏引用
      await this.prisma.userFavorite.deleteMany({
        where: { productId: id },
      });

      // 解除团购活动引用
      await this.prisma.groupBuyTier.updateMany({
        where: { productId: id },
        data: { productId: null },
      });
      await this.prisma.groupBuyActivity.updateMany({
        where: { productId: id },
        data: { productId: null },
      });

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

  /**
   * 检查商品是否关联了套餐
   */
  async getBindings(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`商品 ID=${id} 不存在`);
    }

    const bindings = await this.prisma.packageProduct.findMany({
      where: { productId: id },
      include: {
        package: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      code: 200,
      message: '查询成功',
      data: {
        bound: bindings.length > 0,
        count: bindings.length,
        packages: bindings.map((b) => ({
          packageId: b.packageId,
          packageName: b.package.name,
          quantity: b.quantity,
        })),
      },
    };
  }

  /**
   * 解除商品与所有套餐的关联
   */
  async unbindPackageProducts(id: number) {
    this.logger.log(`解除商品套餐关联: ID=${id}`);

    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`商品 ID=${id} 不存在`);
    }

    try {
      const result = await this.prisma.packageProduct.deleteMany({
        where: { productId: id },
      });

      this.logger.log(`商品套餐解除成功: ID=${id}, 移除了 ${result.count} 条关联`);
      return { code: 200, message: `已解除 ${result.count} 条套餐关联`, count: result.count };
    } catch (error) {
      this.logger.error(`解除商品套餐关联失败: ${error.message}`);
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

  /**
   * 获取导出数据
   */
  private async getExportData(query: QueryProductDto) {
    const { categoryId, status, isActive, keyword, stockStatus } = query;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (isActive !== undefined) where.isActive = isActive;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { productNo: { contains: keyword } },
      ];
    }
    if (stockStatus) {
      if (stockStatus === 'OUT') {
        where.stockQuantity = 0;
      } else if (stockStatus === 'LOW') {
        where.AND = [
          { stockQuantity: { gt: 0 } },
          { stockQuantity: { lte: this.prisma.product.fields.lowStock } },
        ];
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { id: 'desc' },
    });

    return products.map((p: any) => ({
      ID: p.id,
      '商品编号': p.productNo,
      '商品名称': p.name,
      '分类': p.category?.name || '',
      '规格': p.specification || '',
      '描述': p.description || '',
      '单位': p.unit,
      '采购价(元)': Number(p.costPrice).toFixed(2),
      '销售价(元)': Number(p.salePrice).toFixed(2),
      '市场价(元)': p.marketPrice ? Number(p.marketPrice).toFixed(2) : '',
      '库存': p.stockQuantity,
      '最低库存': p.lowStock,
      '品牌': p.brand || '',
      '型号': p.model || '',
      '状态': p.isActive ? '启用' : '禁用',
      '销量': p.salesVolume || 0,
      '创建时间': new Date(p.createdAt).toLocaleString('zh-CN'),
    }));
  }

  /**
   * 导出到Excel
   */
  async exportToExcel(searchDto: QueryProductDto, res: Response) {
    try {
      this.logger.log('开始导出商品数据到Excel');

      const data = await this.getExportData(searchDto);

      const workbook: WorkBook = XLSXUtils.book_new();
      const worksheet = data.length === 0
        ? XLSXUtils.json_to_sheet([])
        : XLSXUtils.json_to_sheet(data);

      const wscols = [
        { wch: 8 },   // ID
        { wch: 16 },  // 商品编号
        { wch: 24 },  // 商品名称
        { wch: 12 },  // 分类
        { wch: 16 },  // 规格
        { wch: 30 },  // 描述
        { wch: 8 },   // 单位
        { wch: 12 },  // 采购价
        { wch: 12 },  // 销售价
        { wch: 12 },  // 市场价
        { wch: 10 },  // 库存
        { wch: 10 },  // 最低库存
        { wch: 14 },  // 品牌
        { wch: 14 },  // 型号
        { wch: 8 },   // 状态
        { wch: 10 },  // 销量
        { wch: 20 },  // 创建时间
      ];
      worksheet['!cols'] = wscols;

      XLSXUtils.book_append_sheet(workbook, worksheet, '商品数据');

      const now = new Date();
      const filename = `商品数据_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      const buffer = XLSXWrite(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);

      this.logger.log(`Excel导出成功，文件名: ${filename}`);
    } catch (error) {
      this.logger.error('Excel导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }

  /**
   * 导出到CSV
   */
  async exportToCSV(searchDto: QueryProductDto, res: Response) {
    try {
      this.logger.log('开始导出商品数据到CSV');

      const data = await this.getExportData(searchDto);

      const headers = ['ID', '商品编号', '商品名称', '分类', '规格', '描述', '单位', '采购价(元)', '销售价(元)', '市场价(元)', '库存', '最低库存', '品牌', '型号', '状态', '销量', '创建时间'];
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) =>
          headers.map(header => {
            const value = row[header] || '';
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const now = new Date();
      const filename = `商品数据_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      res.send('﻿' + csvContent);

      this.logger.log(`CSV导出成功，文件名: ${filename}`);
    } catch (error) {
      this.logger.error('CSV导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }

  /**
   * 导出到JSON
   */
  async exportToJSON(searchDto: QueryProductDto) {
    try {
      this.logger.log('开始导出商品数据到JSON');

      const data = await this.getExportData(searchDto);

      return {
        code: 200,
        message: '导出成功',
        data: {
          exportTime: new Date().toISOString(),
          totalCount: data.length,
          products: data,
        },
      };
    } catch (error) {
      this.logger.error('JSON导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }
}
