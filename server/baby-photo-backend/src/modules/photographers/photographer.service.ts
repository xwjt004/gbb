import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePhotographerDto, QueryPhotographerDto } from './dto/create-photographer.dto';

@Injectable()
export class PhotographerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePhotographerDto) {
    const photographer = await this.prisma.photographer.create({ data: dto });
    return { code: 200, message: '创建成功', data: photographer };
  }

  async findAll(query: QueryPhotographerDto) {
    const { status, page = '1', limit = '20' } = query;
    const where: any = {};
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      this.prisma.photographer.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: parseInt(limit),
      }),
      this.prisma.photographer.count({ where }),
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
    const items = await this.prisma.photographer.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
    return { code: 200, message: '查询成功', data: items };
  }

  async findOne(id: number) {
    const photographer = await this.prisma.photographer.findUnique({ where: { id } });
    if (!photographer) throw new NotFoundException('摄影师不存在');
    return { code: 200, message: '查询成功', data: photographer };
  }

  async update(id: number, dto: Partial<CreatePhotographerDto>) {
    const existing = await this.prisma.photographer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('摄影师不存在');
    const updated = await this.prisma.photographer.update({ where: { id }, data: dto });
    return { code: 200, message: '更新成功', data: updated };
  }

  async remove(id: number) {
    const existing = await this.prisma.photographer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('摄影师不存在');
    await this.prisma.photographer.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }
}
