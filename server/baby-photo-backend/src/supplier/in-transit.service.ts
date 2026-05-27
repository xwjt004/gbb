import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  CreateInTransitDto,
  UpdateLogisticsDto,
  UpdateShippingStatusDto,
  UpdateExpectedDateDto,
  MarkDelayDto,
  ReportExceptionDto,
  HandleExceptionDto,
  ConfirmArrivalDto,
  QueryInTransitDto,
  ShippingStatus,
} from './dto/create-in-transit.dto';

@Injectable()
export class InTransitService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成在途单号
   * 格式: TRN-YYYYMMDD-XXXXXX
   */
  private async generateTransitNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = `TRN-${dateStr}`;
    const lastTransit = await this.prisma.inTransitGoods.findFirst({
      where: {
        transitNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        transitNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastTransit) {
      const lastSequence = parseInt(lastTransit.transitNo.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 创建在途商品记录
   */
  async create(createDto: CreateInTransitDto, creatorId?: number) {
    // 检查采购订单是否存在
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: createDto.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('采购订单不存在');
    }

    // 检查订单状态
    if (purchaseOrder.status !== 'APPROVED' && purchaseOrder.status !== 'SHIPPING') {
      throw new BadRequestException('只能为已审核或发货中的采购订单创建在途记录');
    }

    // 生成在途单号
    const transitNo = await this.generateTransitNo();

    // 使用事务：创建在途记录 + 更新采购订单状态为在途
    const inTransit = await this.prisma.$transaction(async (tx) => {
      const record = await tx.inTransitGoods.create({
        data: {
          transitNo,
          purchaseOrderId: createDto.purchaseOrderId,
          totalQuantity: createDto.totalQuantity,
          totalAmount: createDto.totalAmount || purchaseOrder.finalAmount,
          shippedDate: createDto.shippedDate ? new Date(createDto.shippedDate) : null,
          shippedBy: createDto.shippedBy,
          shippedFrom: createDto.shippedFrom,
          shippingCompany: createDto.shippingCompany,
          trackingNo: createDto.trackingNo,
          shippingMethod: createDto.shippingMethod || 'LAND',
          expectedDate: new Date(createDto.expectedDate),
          estimatedDays: createDto.estimatedDays,
          remark: createDto.remark,
          createdBy: creatorId,
        },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              purchaseNo: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // 联动更新采购订单状态为在途
      await tx.purchaseOrder.update({
        where: { id: createDto.purchaseOrderId },
        data: { status: 'IN_TRANSIT' },
      });

      return record;
    });

    return {
      code: 200,
      message: '在途记录创建成功',
      data: inTransit,
    };
  }

  /**
   * 更新物流信息
   */
  async updateLogistics(id: string, updateDto: UpdateLogisticsDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    // 创建物流跟踪历史记录
    const trackingHistory = inTransit.trackingHistory as any[] || [];
    if (updateDto.currentLocation || updateDto.shippingStatus) {
      trackingHistory.push({
        timestamp: new Date().toISOString(),
        location: updateDto.currentLocation || inTransit.currentLocation,
        status: updateDto.shippingStatus || inTransit.shippingStatus,
        remark: updateDto.remark,
      });
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        shippingCompany: updateDto.shippingCompany,
        trackingNo: updateDto.trackingNo,
        shippingStatus: updateDto.shippingStatus,
        currentLocation: updateDto.currentLocation,
        lastUpdateTime: new Date(),
        trackingHistory: trackingHistory,
        remark: updateDto.remark || inTransit.remark,
      },
    });

    return {
      code: 200,
      message: '物流信息更新成功',
      data: updated,
    };
  }

  /**
   * 更新物流状态
   */
  async updateShippingStatus(id: string, updateDto: UpdateShippingStatusDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    // 创建物流跟踪历史记录
    const trackingHistory = inTransit.trackingHistory as any[] || [];
    trackingHistory.push({
      timestamp: new Date().toISOString(),
      location: updateDto.currentLocation || inTransit.currentLocation,
      status: updateDto.shippingStatus,
      remark: updateDto.remark,
    });

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        shippingStatus: updateDto.shippingStatus,
        currentLocation: updateDto.currentLocation || inTransit.currentLocation,
        lastUpdateTime: new Date(),
        trackingHistory: trackingHistory,
        remark: updateDto.remark || inTransit.remark,
      },
    });

    return {
      code: 200,
      message: '物流状态更新成功',
      data: updated,
    };
  }

  /**
   * 更新预计到货时间
   */
  async updateExpectedDate(id: string, updateDto: UpdateExpectedDateDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        expectedDate: new Date(updateDto.expectedDate),
        estimatedDays: updateDto.estimatedDays,
        remark: updateDto.remark || inTransit.remark,
      },
    });

    return {
      code: 200,
      message: '预计到货时间更新成功',
      data: updated,
    };
  }

  /**
   * 标记延迟
   */
  async markDelay(id: string, markDto: MarkDelayDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        isDelayed: true,
        delayDays: markDto.delayDays,
        delayReason: markDto.delayReason,
        shippingStatus: 'DELAYED',
      },
    });

    return {
      code: 200,
      message: '延迟标记成功',
      data: updated,
    };
  }

  /**
   * 报告异常
   */
  async reportException(id: string, reportDto: ReportExceptionDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        hasException: true,
        exceptionType: reportDto.exceptionType,
        exceptionDesc: reportDto.exceptionDesc,
        exceptionHandled: false,
        shippingStatus: 'EXCEPTION',
      },
    });

    return {
      code: 200,
      message: '异常报告成功',
      data: updated,
    };
  }

  /**
   * 处理异常
   */
  async handleException(id: string, handleDto: HandleExceptionDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    if (!inTransit.hasException) {
      throw new BadRequestException('该记录没有异常');
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: {
        exceptionHandled: handleDto.exceptionHandled,
        shippingStatus: handleDto.exceptionHandled ? 'IN_TRANSIT' : 'EXCEPTION',
        remark: handleDto.remark || inTransit.remark,
      },
    });

    return {
      code: 200,
      message: '异常处理成功',
      data: updated,
    };
  }

  /**
   * 确认到货
   */
  /**
   * 确认到货（同时自动创建入库记录）
   */
  async confirmArrival(id: string, confirmDto: ConfirmArrivalDto) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
      },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    // 计算实际天数
    const actualDate = new Date(confirmDto.actualDate);
    const shippedDate = inTransit.shippedDate || inTransit.createdAt;
    const actualDays = Math.ceil(
      (actualDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 使用事务：更新在途记录 + 自动创建入库记录
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 更新在途记录状态为已交付
      const updated = await tx.inTransitGoods.update({
        where: { id },
        data: {
          actualDate: actualDate,
          actualDays,
          receivedBy: confirmDto.receivedBy,
          receivedAt: new Date(),
          receivedQuantity: confirmDto.receivedQuantity,
          shippingStatus: 'DELIVERED',
          remark: confirmDto.remark || inTransit.remark,
        },
      });

      // 2. 检查是否已创建入库记录
      const existingInbound = await tx.inboundRecord.findFirst({
        where: { inTransitId: id },
      });

      if (existingInbound) {
        return { inTransit: updated, inbound: existingInbound, created: false };
      }

      // 3. 生成入库单号
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const prefix = `INB-${dateStr}`;
      
      const lastInbound = await tx.inboundRecord.findFirst({
        where: {
          inboundNo: {
            startsWith: prefix,
          },
        },
        orderBy: {
          inboundNo: 'desc',
        },
      });

      let sequence = 1;
      if (lastInbound) {
        const lastSequence = parseInt(lastInbound.inboundNo.slice(-6));
        sequence = lastSequence + 1;
      }
      const inboundNo = `${prefix}-${String(sequence).padStart(6, '0')}`;

      // 4. 自动创建入库记录（待质检状态）
      const inbound = await tx.inboundRecord.create({
        data: {
          inboundNo,
          inTransitId: id,
          purchaseOrderId: inTransit.purchaseOrderId,
          expectedQuantity: confirmDto.receivedQuantity,
          actualQuantity: confirmDto.receivedQuantity,
          inboundDate: actualDate,
          inboundStatus: 'PENDING', // 待质检
          qualityCheckStatus: 'PENDING',
          remark: `自动创建 - 在途单号：${inTransit.transitNo}`,
        },
      });

      return { inTransit: updated, inbound, created: true };
    });

    return {
      code: 200,
      message: result.created 
        ? `到货确认成功，已自动创建入库单：${result.inbound.inboundNo}` 
        : '到货确认成功',
      data: {
        inTransit: result.inTransit,
        inbound: result.inbound,
        autoCreated: result.created,
      },
    };
  }

  /**
   * 查询在途商品列表
   */
  async findAll(queryDto: QueryInTransitDto) {
    const {
      purchaseOrderId,
      trackingNo,
      shippingStatus,
      isDelayed,
      hasException,
      expectedStartDate,
      expectedEndDate,
      page = 1,
      pageSize = 20,
    } = queryDto;

    const where: any = {};

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }
    if (trackingNo) {
      where.trackingNo = {
        contains: trackingNo,
      };
    }
    if (shippingStatus) {
      where.shippingStatus = shippingStatus;
    }
    if (isDelayed !== undefined) {
      where.isDelayed = isDelayed;
    }
    if (hasException !== undefined) {
      where.hasException = hasException;
    }

    if (expectedStartDate || expectedEndDate) {
      where.expectedDate = {};
      if (expectedStartDate) {
        where.expectedDate.gte = new Date(expectedStartDate);
      }
      if (expectedEndDate) {
        const end = new Date(expectedEndDate);
        end.setHours(23, 59, 59, 999);
        where.expectedDate.lte = end;
      }
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [list, total] = await Promise.all([
      this.prisma.inTransitGoods.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              purchaseNo: true,
              finalAmount: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.inTransitGoods.count({ where }),
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
   * 查询在途商品详情
   */
  async findOne(id: string) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: true,
          },
        },
      },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: inTransit,
    };
  }

  /**
   * 通用更新在途记录
   */
  async update(id: string, updateDto: any) {
    const record = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('在途记录不存在');
    }

    const updated = await this.prisma.inTransitGoods.update({
      where: { id },
      data: updateDto,
    });

    return {
      code: 200,
      message: '更新成功',
      data: updated,
    };
  }

  /**
   * 删除在途记录
   */
  async remove(id: string) {
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    if (inTransit.shippingStatus === 'DELIVERED') {
      throw new BadRequestException('已交付的在途记录不能删除');
    }

    await this.prisma.inTransitGoods.delete({
      where: { id },
    });

    return {
      code: 200,
      message: '在途记录删除成功',
      data: null,
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const [
      total,
      byStatus,
      delayedCount,
      exceptionCount,
      avgActualDays,
    ] = await Promise.all([
      this.prisma.inTransitGoods.count(),

      this.prisma.inTransitGoods.groupBy({
        by: ['shippingStatus'],
        _count: {
          id: true,
        },
      }),

      this.prisma.inTransitGoods.count({
        where: { isDelayed: true },
      }),

      this.prisma.inTransitGoods.count({
        where: { hasException: true },
      }),

      this.prisma.inTransitGoods.aggregate({
        where: {
          actualDays: {
            not: null,
          },
        },
        _avg: {
          actualDays: true,
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.shippingStatus] = item._count?.id;
          return acc;
        }, {} as Record<string, number>),
        delayedCount,
        exceptionCount,
        avgActualDays: avgActualDays._avg.actualDays || 0,
      },
    };
  }

  /**
   * 根据采购订单ID查询在途商品
   */
  async getByPurchaseOrderId(purchaseOrderId: string) {
    const list = await this.prisma.inTransitGoods.findMany({
      where: {
        purchaseOrderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            purchaseNo: true,
            finalAmount: true,
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      code: 200,
      message: '查询成功',
      data: list,
    };
  }
}
