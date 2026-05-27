import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSeasonalPriceDto } from './dto/create-seasonal-price.dto';
import { UpdateSeasonalPriceDto } from './dto/update-seasonal-price.dto';
import { QuerySeasonalPriceDto } from './dto/query-seasonal-price.dto';

@Injectable()
export class SeasonalPricesService {
  private readonly logger = new Logger(SeasonalPricesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSeasonalPriceDto) {
    const data = await this.prisma.seasonalPrice.create({
      data: {
        packageId: dto.packageId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        price: dto.price,
        label: dto.label,
      },
    });
    return { code: 200, message: '创建成功', data };
  }

  async findAll(query: QuerySeasonalPriceDto) {
    const where: any = {};
    if (query.packageId) where.packageId = query.packageId;

    const list = await this.prisma.seasonalPrice.findMany({
      where,
      orderBy: [{ packageId: 'asc' }, { startDate: 'asc' }],
    });
    return { code: 200, message: '查询成功', data: list };
  }

  async findOne(id: number) {
    const data = await this.prisma.seasonalPrice.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('季节性价格不存在');
    return { code: 200, message: '查询成功', data };
  }

  async update(id: number, dto: UpdateSeasonalPriceDto) {
    const existing = await this.prisma.seasonalPrice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('季节性价格不存在');

    const updateData: any = {};
    if (dto.packageId !== undefined) updateData.packageId = dto.packageId;
    if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.label !== undefined) updateData.label = dto.label;

    const data = await this.prisma.seasonalPrice.update({ where: { id }, data: updateData });
    return { code: 200, message: '更新成功', data };
  }

  async remove(id: number) {
    const existing = await this.prisma.seasonalPrice.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('季节性价格不存在');

    await this.prisma.seasonalPrice.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }
}
