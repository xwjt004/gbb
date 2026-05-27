import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { QueryProductCategoryDto } from './dto/query-product-category.dto';
import { UpdateSortOrderDto } from './dto/update-sort-order.dto';

@Injectable()
export class ProductCategoriesService {
  private readonly logger = new Logger(ProductCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建商品分类
   */
  async create(createDto: CreateProductCategoryDto) {
    this.logger.log(`创建商品分类: ${createDto.name}`);

    // 检查分类名称是否已存在
    const existingByName = await this.prisma.productCategory.findFirst({
      where: { name: createDto.name },
    });
    if (existingByName) {
      throw new ConflictException(`分类名称 "${createDto.name}" 已存在`);
    }

    // 检查分类编码是否已存在
    const existingByCode = await this.prisma.productCategory.findFirst({
      where: { code: createDto.code },
    });
    if (existingByCode) {
      throw new ConflictException(`分类编码 "${createDto.code}" 已存在`);
    }

    try {
      const category = await this.prisma.productCategory.create({
        data: {
          name: createDto.name,
          code: createDto.code,
          description: createDto.description,
          sortOrder: createDto.sortOrder ?? 0,
          isActive: createDto.isActive ?? true,
        },
      });

      this.logger.log(`商品分类创建成功: ID=${category.id}`);
      return {
        code: 200,
        message: '创建成功',
        data: category,
      };
    } catch (error) {
      this.logger.error(`创建商品分类失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询商品分类列表（支持分页和筛选）
   */
  async findAll(query: QueryProductCategoryDto) {
    const { isActive, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    try {
      const [total, list] = await Promise.all([
        this.prisma.productCategory.count({ where }),
        this.prisma.productCategory.findMany({
          where,
          include: {
            _count: {
              select: { products: true },
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        code: 200,
        message: '查询成功',
        data: {
          list: list.map(item => ({
            ...item,
            productCount: item._count?.products,
          })),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询商品分类列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有启用的分类（用于选择器）
   */
  async findAllActive() {
    try {
      const categories = await this.prisma.productCategory.findMany({
        where: { isActive: true },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          code: true,
          sortOrder: true,
        },
      });

      return {
        code: 200,
        message: '查询成功',
        data: categories,
      };
    } catch (error) {
      this.logger.error(`查询启用分类失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询单个分类详情
   */
  async findOne(id: number) {
    try {
      const category = await this.prisma.productCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundException(`分类 ID=${id} 不存在`);
      }

      return {
        code: 200,
        message: '查询成功',
        data: {
          ...category,
          productCount: category._count?.products,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询分类详情失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新分类
   */
  async update(id: number, updateDto: UpdateProductCategoryDto) {
    this.logger.log(`更新商品分类: ID=${id}`);

    // 检查分类是否存在
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`分类 ID=${id} 不存在`);
    }

    // 如果更新名称，检查是否重复
    if (updateDto.name && updateDto.name !== existing.name) {
      const duplicateName = await this.prisma.productCategory.findFirst({
        where: { 
          name: updateDto.name,
          id: { not: id },
        },
      });
      if (duplicateName) {
        throw new ConflictException(`分类名称 "${updateDto.name}" 已存在`);
      }
    }

    // 如果更新编码，检查是否重复
    if (updateDto.code && updateDto.code !== existing.code) {
      const duplicateCode = await this.prisma.productCategory.findFirst({
        where: { 
          code: updateDto.code,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        throw new ConflictException(`分类编码 "${updateDto.code}" 已存在`);
      }
    }

    try {
      const category = await this.prisma.productCategory.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(`分类更新成功: ID=${id}`);
      return {
        code: 200,
        message: '更新成功',
        data: category,
      };
    } catch (error) {
      this.logger.error(`更新分类失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async remove(id: number) {
    this.logger.log(`删除商品分类: ID=${id}`);

    // 检查分类是否存在
    const existing = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`分类 ID=${id} 不存在`);
    }

    // 检查是否有关联商品
    if (existing._count?.products > 0) {
      throw new BadRequestException(
        `该分类下有 ${existing._count?.products} 个商品，无法删除`
      );
    }

    try {
      await this.prisma.productCategory.delete({
        where: { id },
      });

      this.logger.log(`分类删除成功: ID=${id}`);
      return {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      this.logger.error(`删除分类失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(updateDto: UpdateSortOrderDto) {
    this.logger.log(`批量更新分类排序: ${updateDto.items.length} 个`);

    try {
      // 使用事务批量更新
      await this.prisma.$transaction(
        updateDto.items.map(item =>
          this.prisma.productCategory.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          })
        )
      );

      this.logger.log('分类排序更新成功');
      return {
        code: 200,
        message: '排序更新成功',
      };
    } catch (error) {
      this.logger.error(`更新排序失败: ${error.message}`);
      throw new BadRequestException('更新排序失败，请检查分类ID是否正确');
    }
  }
}
