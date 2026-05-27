import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { RateSupplierDto } from './dto/rate-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成供应商编号
   * 格式: SUP-YYYYMMDD-XXXXXX
   */
  private async generateSupplierNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // 查询今日最大序号
    const prefix = `SUP-${dateStr}`;
    const lastSupplier = await this.prisma.supplier.findFirst({
      where: {
        supplierNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        supplierNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastSupplier) {
      const lastSequence = parseInt(lastSupplier.supplierNo.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 创建供应商
   */
  async create(createSupplierDto: CreateSupplierDto) {
    const supplierNo = await this.generateSupplierNo();

    const supplier = await this.prisma.supplier.create({
      data: {
        supplierNo,
        ...createSupplierDto,
      },
    });

    return {
      code: 200,
      message: '供应商创建成功',
      data: supplier,
    };
  }

  /**
   * 查询供应商列表
   */
  async findAll(queryDto: QuerySupplierDto) {
    const {
      supplierNo,
      name,
      contactPerson,
      contactPhone,
      supplierType,
      category,
      status,
      creditLevel,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    // 构建查询条件
    const where: any = {};

    if (supplierNo) {
      where.supplierNo = supplierNo;
    }
    if (name) {
      where.name = { contains: name };
    }
    if (contactPerson) {
      where.contactPerson = { contains: contactPerson };
    }
    if (contactPhone) {
      where.contactPhone = { contains: contactPhone };
    }
    if (supplierType) {
      where.supplierType = supplierType;
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (creditLevel) {
      where.creditLevel = creditLevel;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // 分页参数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 排序
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // 查询数据
    const [list, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: {
              purchaseOrders: true,
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
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
  }

  /**
   * 查询供应商详情
   */
  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            purchaseNo: true,
            purchaseDate: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: supplier,
    };
  }

  /**
   * 更新供应商
   */
  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    // 检查供应商是否存在
    const exists = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException('供应商不存在');
    }

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto,
    });

    return {
      code: 200,
      message: '供应商更新成功',
      data: supplier,
    };
  }

  /**
   * 删除供应商
   */
  async remove(id: string) {
    // 检查供应商是否存在
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    // 检查是否有关联的采购订单
    if (supplier._count?.purchaseOrders > 0) {
      throw new BadRequestException('该供应商存在采购订单，无法删除');
    }

    await this.prisma.supplier.delete({
      where: { id },
    });

    return {
      code: 200,
      message: '供应商删除成功',
    };
  }

  /**
   * 评价供应商
   */
  async rateSupplier(rateDto: RateSupplierDto) {
    const { supplierId, rating, remark } = rateDto;

    // 检查供应商是否存在
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    // 更新供应商评分：累计平均 = (历史总评分 + 新评分) / 评分次数
  // FIXME: TS 类型暂未刷新，使用 any 访问生成的表；生成 client 后移除
  // FIXME: prisma generate 后 TS 未刷新 supplierRatingHistory 类型，临时 any 断言，后续删除
  const historyAgg = await (this.prisma as any).supplierRatingHistory.aggregate({
      where: { supplierId },
      _sum: { rating: true },
      _count: { rating: true },
    });
    const sum = Number(historyAgg?._sum?.rating || 0);
    const count = Number(historyAgg?._count?.rating || 0);
    const newAverage = (sum + rating) / (count + 1 || 1);

    const updated = await this.prisma.supplier.update({
      where: { id: supplierId },
      data: {
  rating: newAverage,
        remark: remark || supplier.remark,
      },
    });

    // 写入评分历史
  // 评分历史写入 (等待 prisma generate 后类型出现，临时 any 断言)
  // FIXME: 临时 any 断言，待类型刷新
  await (this.prisma as any).supplierRatingHistory.create({
      data: {
        supplierId,
        rating,
        remark: remark || supplier.remark || undefined,
      },
    });

    return {
      code: 200,
      message: '评价成功',
      data: updated,
    };
  }

  /**
   * 获取供应商评分历史
   */
  async getRatingHistory(supplierId: string, query?: { startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    // 验证存在
    const exists = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!exists) {
      throw new NotFoundException('供应商不存在');
    }

    const where: any = { supplierId };
    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) { const end = new Date(query.endDate); end.setHours(23,59,59,999); where.createdAt.lte = end; }
    }
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [list, total] = await Promise.all([
  // FIXME: 临时 any 断言，待类型刷新
  (this.prisma as any).supplierRatingHistory.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
  (this.prisma as any).supplierRatingHistory.count({ where }),
    ]);
    return {
      code: 200,
      message: '查询成功',
      data: { list, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
    };
  }

  /**
   * 获取供应商统计数据
   */
  async getStatistics() {
    const [total, active, inactive, blacklist, byType, byCredit] = await Promise.all([
      // 总数
      this.prisma.supplier.count(),

      // 启用中
      this.prisma.supplier.count({
        where: { status: 'ACTIVE' },
      }),

      // 已停用
      this.prisma.supplier.count({
        where: { status: 'INACTIVE' },
      }),

      // 黑名单
      this.prisma.supplier.count({
        where: { status: 'BLACKLIST' },
      }),

      // 按类型统计
      this.prisma.supplier.groupBy({
        by: ['supplierType'],
        _count: {
          id: true,
        },
      }),

      // 按信用等级统计
      this.prisma.supplier.groupBy({
        by: ['creditLevel'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        total,
        byStatus: {
          active,
          inactive,
          blacklist,
        },
        byType: byType.map((item) => ({
          type: item.supplierType,
          count: item._count?.id,
        })),
        byCredit: byCredit.map((item) => ({
          level: item.creditLevel,
          count: item._count?.id,
        })),
      },
    };
  }

  /**
   * 更新供应商状态
   */
  async updateStatus(id: string, status: string) {
    if (!['ACTIVE', 'INACTIVE', 'BLACKLIST'].includes(status)) {
      throw new BadRequestException('无效的状态值');
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { status },
    });

    return {
      code: 200,
      message: '状态更新成功',
      data: updated,
    };
  }

  /**
   * 切换供应商状态 (启用/停用)
   */
  async toggleStatus(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    const newStatus = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { status: newStatus },
    });

    return {
      code: 200,
      message: `供应商已${newStatus === 'ACTIVE' ? '启用' : '停用'}`,
      data: updated,
    };
  }

  /**
   * 按名称搜索供应商
   */
  async searchByName(name: string) {
    if (!name || name.trim() === '') {
      throw new BadRequestException('搜索关键词不能为空');
    }

    const suppliers = await this.prisma.supplier.findMany({
      where: {
        name: {
          contains: name,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        supplierNo: true,
        name: true,
        contactPerson: true,
        contactPhone: true,
        supplierType: true,
        category: true,
        creditLevel: true,
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
    });

    return {
      code: 200,
      message: '查询成功',
      data: suppliers,
    };
  }
}
