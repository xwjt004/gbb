import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePackageCategoryDto } from './dto/create-package-category.dto';
import { UpdatePackageCategoryDto } from './dto/update-package-category.dto';
import { PackageCategoryQueryDto } from './dto/package-category-query.dto';

@Injectable()
export class PackageCategoriesService {
  private readonly logger = new Logger(PackageCategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建套餐分类
   */
  async create(createDto: CreatePackageCategoryDto) {
    try {
      // 检查分类名称是否已存在
      const existing = await this.prisma.packageCategory.findUnique({
        where: { name: createDto.name },
      });

      if (existing) {
        throw new ConflictException('分类名称已存在');
      }

      const category = await this.prisma.packageCategory.create({
        data: {
          name: createDto.name,
          description: createDto.description,
          icon: createDto.icon,
          color: createDto.color,
          sortOrder: createDto.sortOrder ?? 0,
          status: createDto.status ?? 'ACTIVE',
        },
        include: {
          _count: {
            select: { packages: true },
          },
        },
      });

      this.logger.log(`套餐分类创建成功: ${category.id} - ${category.name}`);

      return {
        code: 200,
        message: '分类创建成功',
        data: category,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`创建分类失败: ${error.message}`, error.stack);
      throw new BadRequestException('创建分类失败');
    }
  }

  /**
   * 获取所有分类（支持查询和分页）
   */
  async findAll(query: PackageCategoryQueryDto) {
    const { page = 1, limit = 20, name, status } = query;

    try {
      const where: any = {};

      // 名称模糊搜索
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }

      // 状态筛选
      if (status) {
        where.status = status;
      }

      const [categories, total] = await Promise.all([
        this.prisma.packageCategory.findMany({
          where,
          include: {
            _count: {
              select: { packages: true },
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.packageCategory.count({ where }),
      ]);

      return {
        code: 200,
        message: '获取分类列表成功',
        data: {
          items: categories,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`获取分类列表失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取分类列表失败');
    }
  }

  /**
   * 获取所有启用的分类（用于选择器）
   */
  async findAllActive() {
    try {
      const categories = await this.prisma.packageCategory.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          color: true,
          sortOrder: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
      });

      return {
        code: 200,
        message: '获取启用分类成功',
        data: categories,
      };
    } catch (error) {
      this.logger.error(`获取启用分类失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取启用分类失败');
    }
  }

  /**
   * 获取单个分类详情
   */
  async findOne(id: number) {
    try {
      const category = await this.prisma.packageCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { packages: true },
          },
          packages: {
            select: {
              id: true,
              name: true,
              price: true,
              status: true,
            },
            take: 10, // 只返回前10个套餐
          },
        },
      });

      if (!category) {
        throw new NotFoundException('分类不存在');
      }

      return {
        code: 200,
        message: '获取分类详情成功',
        data: category,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`获取分类详情失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取分类详情失败');
    }
  }

  /**
   * 更新分类
   */
  async update(id: number, updateDto: UpdatePackageCategoryDto) {
    try {
      // 检查分类是否存在
      const existing = await this.prisma.packageCategory.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('分类不存在');
      }

      // 如果修改了名称，检查新名称是否与其他分类冲突
      if (updateDto.name && updateDto.name !== existing.name) {
        const nameConflict = await this.prisma.packageCategory.findUnique({
          where: { name: updateDto.name },
        });

        if (nameConflict) {
          throw new ConflictException('分类名称已存在');
        }
      }

      const category = await this.prisma.packageCategory.update({
        where: { id },
        data: updateDto,
        include: {
          _count: {
            select: { packages: true },
          },
        },
      });

      this.logger.log(`分类更新成功: ${id} - ${category.name}`);

      return {
        code: 200,
        message: '分类更新成功',
        data: category,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`更新分类失败: ${error.message}`, error.stack);
      throw new BadRequestException('更新分类失败');
    }
  }

  /**
   * 删除分类
   */
  async remove(id: number) {
    try {
      // 检查分类是否存在
      const category = await this.prisma.packageCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { packages: true },
          },
        },
      });

      if (!category) {
        throw new NotFoundException('分类不存在');
      }

      // 检查是否有套餐使用此分类
      if (category._count?.packages > 0) {
        throw new BadRequestException(
          `该分类下有 ${category._count?.packages} 个套餐，无法删除。请先将套餐移至其他分类或删除套餐。`,
        );
      }

      await this.prisma.packageCategory.delete({
        where: { id },
      });

      this.logger.log(`分类删除成功: ${id} - ${category.name}`);

      return {
        code: 200,
        message: '分类删除成功',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`删除分类失败: ${error.message}`, error.stack);
      throw new BadRequestException('删除分类失败');
    }
  }

  /**
   * 批量更新分类排序
   */
  async updateSortOrder(sortData: { id: number; sortOrder: number }[]) {
    try {
      // 使用事务批量更新
      await this.prisma.$transaction(
        sortData.map((item) =>
          this.prisma.packageCategory.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );

      this.logger.log(`批量更新排序成功，共 ${sortData.length} 条`);

      return {
        code: 200,
        message: '排序更新成功',
      };
    } catch (error) {
      this.logger.error(`更新排序失败: ${error.message}`, error.stack);
      throw new BadRequestException('更新排序失败');
    }
  }
}
