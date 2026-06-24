import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { QueryServiceItemDto } from './dto/query-service-item.dto';

@Injectable()
export class ServiceItemsService {
  private readonly logger = new Logger(ServiceItemsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建服务项目
   */
  async create(createDto: CreateServiceItemDto) {
    this.logger.log(`创建服务项目: ${createDto.name}`);

    // 检查服务编号是否已存在
    const existing = await this.prisma.serviceItem.findUnique({
      where: { serviceNo: createDto.serviceNo },
    });
    if (existing) {
      throw new ConflictException(`服务编号 "${createDto.serviceNo}" 已存在`);
    }

    try {
      const serviceItem = await this.prisma.serviceItem.create({
        data: {
          serviceNo: createDto.serviceNo,
          name: createDto.name,
          category: createDto.category,
          basePrice: createDto.basePrice || 0,
          unitPrice: createDto.unitPrice,
          priceUnit: createDto.priceUnit,
          description: createDto.description,
          duration: createDto.duration,
          requirements: createDto.requirements,
          isActive: createDto.isActive ?? true,
          isRequired: createDto.isRequired ?? false,
        },
      });

      this.logger.log(`服务项目创建成功: ID=${serviceItem.id}`);
      return {
        code: 200,
        message: '创建成功',
        data: serviceItem,
      };
    } catch (error) {
      this.logger.error(`创建服务项目失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询服务项目列表（支持分页和筛选）
   */
  async findAll(query: QueryServiceItemDto) {
    const { category, isActive, isRequired, keyword, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;
    if (isRequired !== undefined) where.isRequired = isRequired;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { serviceNo: { contains: keyword } },
      ];
    }

    try {
      const [total, list] = await Promise.all([
        this.prisma.serviceItem.count({ where }),
        this.prisma.serviceItem.findMany({
          where,
          orderBy: [
            { category: 'asc' },
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
      this.logger.error(`查询服务项目列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 按分类查询服务项目
   */
  async findByCategory(category: string) {
    try {
      const services = await this.prisma.serviceItem.findMany({
        where: { 
          category,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      });

      return {
        code: 200,
        message: '查询成功',
        data: services,
      };
    } catch (error) {
      this.logger.error(`按分类查询服务项目失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取所有服务分类
   */
  async getCategories() {
    try {
      const categories = await this.prisma.serviceItem.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      const categoryList = categories.map(item => item.category).filter(Boolean);

      return {
        code: 200,
        message: '查询成功',
        data: categoryList,
      };
    } catch (error) {
      this.logger.error(`获取服务分类失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 创建服务分类
   */
  async createCategory(name: string) {
    this.logger.log(`创建服务分类: ${name}`);

    if (!name || !name.trim()) {
      throw new ConflictException('分类名称不能为空');
    }

    return {
      code: 200,
      message: '创建成功',
      data: { name: name.trim() },
    };
  }

  /**
   * 重命名服务分类（更新所有服务项目中的分类名称）
   */
  async renameCategory(oldName: string, newName: string) {
    this.logger.log(`重命名服务分类: ${oldName} -> ${newName}`);

    if (!oldName || !newName) {
      throw new NotFoundException('分类名称不能为空');
    }

    const count = await this.prisma.serviceItem.count({
      where: { category: oldName },
    });

    if (count === 0) {
      throw new NotFoundException(`服务分类 "${oldName}" 不存在`);
    }

    await this.prisma.serviceItem.updateMany({
      where: { category: oldName },
      data: { category: newName },
    });

    this.logger.log(`服务分类重命名成功，已更新 ${count} 个服务项目`);
    return {
      code: 200,
      message: `重命名成功，已更新 ${count} 个服务项目`,
      data: { name: newName, updatedCount: count },
    };
  }

  /**
   * 删除服务分类（清空所有服务项目中的该分类）
   */
  async deleteCategory(name: string) {
    this.logger.log(`删除服务分类: ${name}`);

    const count = await this.prisma.serviceItem.count({
      where: { category: name },
    });

    if (count === 0) {
      throw new NotFoundException(`服务分类 "${name}" 不存在`);
    }

    await this.prisma.serviceItem.updateMany({
      where: { category: name },
      data: { category: '' },
    });

    this.logger.log(`服务分类删除成功，已清空 ${count} 个服务项目的分类`);
    return {
      code: 200,
      message: `删除成功，已清空 ${count} 个服务项目的分类归属`,
    };
  }

  /**
   * 查询单个服务项目详情
   */
  async findOne(id: number) {
    try {
      const serviceItem = await this.prisma.serviceItem.findUnique({
        where: { id },
      });

      if (!serviceItem) {
        throw new NotFoundException(`服务项目 ID=${id} 不存在`);
      }

      return {
        code: 200,
        message: '查询成功',
        data: serviceItem,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询服务项目详情失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新服务项目
   */
  async update(id: number, updateDto: UpdateServiceItemDto) {
    this.logger.log(`更新服务项目: ID=${id}`);

    // 检查服务项目是否存在
    const existing = await this.prisma.serviceItem.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`服务项目 ID=${id} 不存在`);
    }

    // 如果更新服务编号，检查是否重复
    if (updateDto.serviceNo && updateDto.serviceNo !== existing.serviceNo) {
      const duplicate = await this.prisma.serviceItem.findFirst({
        where: { 
          serviceNo: updateDto.serviceNo,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`服务编号 "${updateDto.serviceNo}" 已存在`);
      }
    }

    try {
      const serviceItem = await this.prisma.serviceItem.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(`服务项目更新成功: ID=${id}`);
      return {
        code: 200,
        message: '更新成功',
        data: serviceItem,
      };
    } catch (error) {
      this.logger.error(`更新服务项目失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除服务项目
   */
  async remove(id: number) {
    this.logger.log(`删除服务项目: ID=${id}`);

    // 检查服务项目是否存在
    const existing = await this.prisma.serviceItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`服务项目 ID=${id} 不存在`);
    }

    try {
      await this.prisma.serviceItem.delete({
        where: { id },
      });

      this.logger.log(`服务项目删除成功: ID=${id}`);
      return {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      this.logger.error(`删除服务项目失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取服务统计
   */
  async getStatistics() {
    try {
      const [total, active, byCategory] = await Promise.all([
        this.prisma.serviceItem.count(),
        this.prisma.serviceItem.count({ where: { isActive: true } }),
        this.prisma.serviceItem.groupBy({
          by: ['category'],
          _count: true,
        }),
      ]);

      const categoryStats = byCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {} as Record<string, number>);

      return {
        code: 200,
        message: '查询成功',
        data: {
          total,
          active,
          inactive: total - active,
          byCategory: categoryStats,
        },
      };
    } catch (error) {
      this.logger.error(`获取服务统计失败: ${error.message}`);
      throw error;
    }
  }
}
