import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OperationLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OperationLogCreateInput) {
    return this.prisma.operationLog.create({ data });
  }

  async findAll(query: {
    module?: string;
    operatorName?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.OperationLogWhereInput = {};

    if (query.module) {
      where.module = query.module;
    }
    if (query.operatorName) {
      where.operatorName = { contains: query.operatorName };
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getModules(): Promise<string[]> {
    const result = await this.prisma.operationLog.findMany({
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });
    return result.map((r) => r.module);
  }
}
