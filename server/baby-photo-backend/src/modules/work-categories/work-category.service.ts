import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWorkCategoryDto, QueryWorkCategoryDto } from './dto/create-work-category.dto';

@Injectable()
export class WorkCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkCategoryDto) {
    const category = await this.prisma.workCategory.create({ data: dto });
    return { code: 200, message: '创建成功', data: category };
  }

  async findAll(query: QueryWorkCategoryDto) {
    const { page = '1', limit = '50' } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      this.prisma.workCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.workCategory.count(),
    ]);
    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      },
    };
  }

  async findAllSimple() {
    const items = await this.prisma.workCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return { code: 200, message: '查询成功', data: items };
  }

  async findOne(id: number) {
    const category = await this.prisma.workCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return { code: 200, message: '查询成功', data: category };
  }

  async update(id: number, dto: Partial<CreateWorkCategoryDto>) {
    const existing = await this.prisma.workCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('分类不存在');
    const updated = await this.prisma.workCategory.update({ where: { id }, data: dto });
    return { code: 200, message: '更新成功', data: updated };
  }

  async remove(id: number) {
    const existing = await this.prisma.workCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('分类不存在');
    await this.prisma.workCategory.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }
}
