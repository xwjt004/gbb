import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  CreateInboundDto,
  StartQualityCheckDto,
  CompleteQualityCheckDto,
  ConfirmInboundDto,
  CancelInboundDto,
  QueryInboundDto,
  UpdateInboundDto,
} from './dto/create-inbound.dto';

interface Response {
  code: number;
  message: string;
  data?: any;
  updated?: boolean;
}

interface ListResponse {
  code: number;
  message: string;
  data: {
    list: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class InboundService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成入库单号
   * 格式: INB-YYYYMMDD-XXXXXX
   */
  private async generateInboundNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = `INB-${dateStr}`;
    const lastInbound = await this.prisma.inboundRecord.findFirst({
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

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 创建入库记录
   */
  async create(createDto: CreateInboundDto, creatorId?: number): Promise<Response> {
    // 检查在途记录是否存在
    const inTransit = await this.prisma.inTransitGoods.findUnique({
      where: { id: createDto.inTransitId },
      include: {
        purchaseOrder: true,
      },
    });

    if (!inTransit) {
      throw new NotFoundException('在途记录不存在');
    }

    // 检查在途商品是否已到货
    if (inTransit.shippingStatus !== 'DELIVERED') {
      throw new BadRequestException('只能为已到货的在途商品创建入库记录');
    }

    // 检查是否已创建入库记录
    const existingInbound = await this.prisma.inboundRecord.findFirst({
      where: { inTransitId: createDto.inTransitId },
    });

    if (existingInbound) {
      throw new BadRequestException('该在途商品已创建入库记录');
    }

    // 生成入库单号
    const inboundNo = await this.generateInboundNo();

    // 创建入库记录
    const inbound = await this.prisma.inboundRecord.create({
      data: {
        inboundNo,
        inTransitId: createDto.inTransitId,
        purchaseOrderId: inTransit.purchaseOrderId,
        expectedQuantity: createDto.totalQuantity,
        actualQuantity: createDto.totalQuantity,
        inboundDate: createDto.receivedDate ? new Date(createDto.receivedDate) : new Date(),
        warehouseId: createDto.warehouseLocation,
        locationId: createDto.warehouseLocation,
        remark: createDto.remark,
        createdBy: creatorId,
      },
      include: {
        inTransit: {
          select: {
            id: true,
            transitNo: true,
            shippingCompany: true,
          },
        },
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

    return {
      code: 200,
      message: '入库记录创建成功',
      data: inbound,
    };
  }

  /**
   * 开始质检
   */
  async startQualityCheck(id: string, startDto: StartQualityCheckDto): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.inboundStatus !== 'PENDING' && inbound.inboundStatus !== 'IN_PROGRESS') {
      throw new BadRequestException('只能对待入库或入库中的记录开始质检');
    }

    if (inbound.qualityCheckStatus !== 'PENDING') {
      throw new BadRequestException('该记录已开始质检');
    }

    const updated = await this.prisma.inboundRecord.update({
      where: { id },
      data: {
        qualityCheckStatus: 'IN_PROGRESS',
        qualityCheckBy: startDto.inspectorName,
        qualityCheckAt: startDto.checkStartTime ? new Date(startDto.checkStartTime) : new Date(),
        inboundStatus: 'IN_PROGRESS',
        remark: startDto.remark || inbound.remark,
      },
    });

    return {
      code: 200,
      message: '质检已开始',
      data: updated,
    };
  }

  /**
   * 完成质检
   */
  async completeQualityCheck(id: string, completeDto: CompleteQualityCheckDto): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.qualityCheckStatus !== 'IN_PROGRESS') {
      throw new BadRequestException('该记录未在质检中');
    }

    // 验证数量
    const totalChecked = completeDto.qualifiedQuantity + (completeDto.rejectedQuantity || 0);
    if (totalChecked > inbound.expectedQuantity) {
      throw new BadRequestException('质检数量超过总数量');
    }

    const updated = await this.prisma.inboundRecord.update({
      where: { id },
      data: {
        qualityCheckStatus: completeDto.qualityStatus,
        qualifiedQuantity: completeDto.qualifiedQuantity,
        defectiveQuantity: completeDto.rejectedQuantity || 0,
        qualityCheckResult: completeDto.checkResult,
        defectTypes: completeDto.checkDetails ? JSON.parse(JSON.stringify(completeDto.checkDetails)) : null,
        remark: completeDto.remark || inbound.remark,
      },
    });

    return {
      code: 200,
      message: '质检已完成',
      data: updated,
    };
  }

  /**
   * 确认入库
   */
  async confirmInbound(id: string, confirmDto: ConfirmInboundDto): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
      },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.inboundStatus === 'COMPLETED') {
      throw new BadRequestException('该入库记录已完成');
    }

    if (inbound.qualityCheckStatus !== 'PASSED' && inbound.qualityCheckStatus !== 'PARTIAL') {
      throw new BadRequestException('只能确认质检通过或部分通过的记录');
    }

    // 验证入库数量
    if (confirmDto.inboundQuantity > inbound.qualifiedQuantity) {
      throw new BadRequestException('入库数量不能超过合格数量');
    }

    // 如果需要同时更新库存，则在事务中完成：更新 inboundRecord、更新 product.stockQuantity 并创建 stockTransaction
    if (confirmDto.updateInventory) {
      const transactionNoPrefixDate = new Date();

      const result = await this.prisma.$transaction(async (tx) => {
        // 检查是否有有效的操作人用户
        const systemUser = await tx.user.findFirst({ where: { id: 1 } });
        let defaultOperatorId = 1;
        
        // 如果系统用户不存在，创建一个
        if (!systemUser) {
          const createdUser = await tx.user.create({
            data: {
              id: 1,
              openid: 'system-admin',
              nickname: '系统管理员',
            },
          });
          defaultOperatorId = createdUser.id;
        }

        // 1. 锁定并更新入库记录为 COMPLETED
        const updatedInbound = await tx.inboundRecord.update({
          where: { id },
          data: {
            inboundStatus: 'COMPLETED',
            actualQuantity: confirmDto.inboundQuantity,
            warehouseId: confirmDto.warehouseLocation,
            locationId: confirmDto.warehouseLocation,
            confirmedBy: confirmDto.confirmedBy,
            confirmedAt: confirmDto.confirmedDate ? new Date(confirmDto.confirmedDate) : new Date(),
            inventoryUpdated: true,
            inventoryUpdateAt: new Date(),
            remark: confirmDto.remark || inbound.remark,
          },
        });

        // 2. 如果 inbound 关联的 purchaseOrder 有 items 或 inTransit 有明细，需要根据业务映射到商品并增加库存
        // 简化处理：如果有 purchaseOrder.items 且 product.isTrackStock=true，则按确认数量平均分配到相关商品的库存
        // 更精确的分配规则应根据入库明细实现，这里做最小可行实现以保证库存一致性

        // 获取关联采购单项（可为空）
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: inbound.purchaseOrderId },
          include: { product: true },
        });

        // 如果没有采购项，则不更新库存，只返回已更新标志
        if (!poItems || poItems.length === 0) {
          return { updatedInbound, inventoryUpdated: true };
        }

        // 将确认入库数量按比例或均分分配到采购项上
        const totalPoQty = poItems.reduce((s, it) => s + (it.quantity || 0), 0) || poItems.length;
        // 生成流水号基础
        const dateStr = transactionNoPrefixDate.getFullYear().toString() +
          String(transactionNoPrefixDate.getMonth() + 1).padStart(2, '0') +
          String(transactionNoPrefixDate.getDate()).padStart(2, '0');
        let txnSeq = await tx.stockTransaction.count({
          where: {
            createdAt: {
              gte: new Date(transactionNoPrefixDate.setHours(0, 0, 0, 0)),
              lte: new Date(transactionNoPrefixDate.setHours(23, 59, 59, 999)),
            },
          },
        });

        // 分配并更新每个商品库存
        for (const item of poItems) {
          if (!item.product || !item.product.isTrackStock) continue;

          // 计算分配数量（按比例），确保整数
          const alloc = Math.floor((item.quantity / totalPoQty) * confirmDto.inboundQuantity);
          const addQty = alloc > 0 ? alloc : 0;

          if (addQty <= 0 || !item.productId) continue;

          // 读取当前库存
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          const beforeStock = product ? product.stockQuantity : 0;
          const afterStock = beforeStock + addQty;

          // 更新商品库存
          await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: afterStock } });

          // 生成流水号
          txnSeq += 1;
          const seqStr = String(txnSeq).padStart(6, '0');
          const transactionNo = `TXN-${dateStr}-${seqStr}`;

          // 创建库存流水 - 使用确认的操作人ID
          const operatorUserId = updatedInbound.createdBy || defaultOperatorId;
          
          await tx.stockTransaction.create({
            data: {
              transactionNo,
              transactionType: 'INBOUND',
              productId: item.productId,
              quantity: addQty,
              beforeStock,
              afterStock,
              refType: 'INBOUND',
              refId: updatedInbound.id,
              remark: `入库单：${updatedInbound.inboundNo} - 确认入库`,
              operatorId: operatorUserId,
            },
          });
        }

        // 联动更新采购订单状态为已收货
        if (inbound.purchaseOrderId) {
          await tx.purchaseOrder.update({
            where: { id: inbound.purchaseOrderId },
            data: { status: 'RECEIVED' },
          });
        }

        return { updatedInbound, inventoryUpdated: true };
      });

      return {
        code: 200,
        message: '入库确认成功',
        data: result.updatedInbound,
        updated: true,
      } as Response;
    }

    // 不更新库存的路径，仅标记为已完成并返回
    const updated = await this.prisma.inboundRecord.update({
      where: { id },
      data: {
        inboundStatus: 'COMPLETED',
        actualQuantity: confirmDto.inboundQuantity,
        warehouseId: confirmDto.warehouseLocation,
        locationId: confirmDto.warehouseLocation,
        confirmedBy: confirmDto.confirmedBy,
        confirmedAt: confirmDto.confirmedDate ? new Date(confirmDto.confirmedDate) : new Date(),
        inventoryUpdated: false,
        inventoryUpdateAt: null,
        remark: confirmDto.remark || inbound.remark,
      },
    });

    // 联动更新采购订单状态为已收货
    if (inbound.purchaseOrderId) {
      await this.prisma.purchaseOrder.update({
        where: { id: inbound.purchaseOrderId },
        data: { status: 'RECEIVED' },
      });
    }

    return {
      code: 200,
      message: '入库确认成功',
      data: updated,
      updated: false,
    };
  }

  /**
   * 取消入库
   */
  async cancelInbound(id: string, cancelDto: CancelInboundDto): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.inboundStatus === 'COMPLETED') {
      throw new BadRequestException('已完成的入库记录不能取消');
    }

    if (inbound.inboundStatus === 'CANCELLED') {
      throw new BadRequestException('该入库记录已取消');
    }

    const updated = await this.prisma.inboundRecord.update({
      where: { id },
      data: {
        inboundStatus: 'CANCELLED',
        rejectionReason: cancelDto.cancelReason,
        remark: cancelDto.remark || inbound.remark,
      },
    });

    return {
      code: 200,
      message: '入库已取消',
      data: updated,
    };
  }

  /**
   * 查询入库记录列表
   */
  async findAll(query: QueryInboundDto): Promise<ListResponse> {
    const { page = 1, pageSize = 10, ...filters } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {};

    if (filters.inboundNo) {
      where.inboundNo = { contains: filters.inboundNo };
    }

    if (filters.inTransitId) {
      where.inTransitId = filters.inTransitId;
    }

    if (filters.purchaseOrderId) {
      where.purchaseOrderId = filters.purchaseOrderId;
    }

    if (filters.status) {
      where.inboundStatus = filters.status;
    }

    if (filters.qualityStatus) {
      where.qualityCheckStatus = filters.qualityStatus;
    }

    if (filters.startDate || filters.endDate) {
      where.inboundDate = {};
      if (filters.startDate) {
        where.inboundDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.inboundDate.lte = new Date(filters.endDate);
      }
    }

    // 查询数据
    const [list, total] = await Promise.all([
      this.prisma.inboundRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          inTransit: {
            select: {
              id: true,
              transitNo: true,
              shippingCompany: true,
            },
          },
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
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.inboundRecord.count({ where }),
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
   * 查询入库记录详情
   */
  async findOne(id: string): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
      include: {
        inTransit: {
          include: {
            purchaseOrder: {
              include: {
                supplier: true,
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: inbound,
    };
  }

  /**
   * 更新入库记录
   */
  async update(id: string, updateDto: UpdateInboundDto): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.inboundStatus === 'COMPLETED') {
      throw new BadRequestException('已完成的入库记录不能修改');
    }

    const updated = await this.prisma.inboundRecord.update({
      where: { id },
      data: {
        warehouseId: updateDto.warehouseLocation,
        locationId: updateDto.warehouseLocation,
        remark: updateDto.remark,
      },
    });

    return {
      code: 200,
      message: '更新成功',
      data: updated,
    };
  }

  /**
   * 删除入库记录
   */
  async remove(id: string): Promise<Response> {
    const inbound = await this.prisma.inboundRecord.findUnique({
      where: { id },
    });

    if (!inbound) {
      throw new NotFoundException('入库记录不存在');
    }

    if (inbound.inboundStatus === 'COMPLETED') {
      throw new BadRequestException('已完成的入库记录不能删除');
    }

    await this.prisma.inboundRecord.delete({
      where: { id },
    });

    return {
      code: 200,
      message: '删除成功',
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics(): Promise<Response> {
    const [
      total,
      byStatus,
      byQualityStatus,
      avgQualified,
    ] = await Promise.all([
      // 总数
      this.prisma.inboundRecord.count(),
      
      // 按状态统计
      this.prisma.inboundRecord.groupBy({
        by: ['inboundStatus'],
        _count: true,
      }),
      
      // 按质检状态统计
      this.prisma.inboundRecord.groupBy({
        by: ['qualityCheckStatus'],
        _count: true,
      }),
      
      // 平均合格率
      this.prisma.inboundRecord.aggregate({
        _avg: {
          qualifiedQuantity: true,
          expectedQuantity: true,
        },
        where: {
          qualifiedQuantity: {
            gt: 0,
          },
        },
      }),
    ]);

    // 转换为对象格式
    const statusStats = byStatus.reduce((acc: Record<string, number>, item) => {
      acc[item.inboundStatus] = item._count;
      return acc;
    }, {});

    const qualityStats = byQualityStatus.reduce((acc: Record<string, number>, item) => {
      acc[item.qualityCheckStatus] = item._count;
      return acc;
    }, {});

    // 计算合格率
    const avgQualifiedRate = avgQualified._avg.qualifiedQuantity && avgQualified._avg.expectedQuantity
      ? (avgQualified._avg.qualifiedQuantity / avgQualified._avg.expectedQuantity) * 100
      : 0;

    return {
      code: 200,
      message: '统计查询成功',
      data: {
        total,
        byStatus: statusStats,
        byQualityStatus: qualityStats,
        avgQualifiedRate: Number(avgQualifiedRate.toFixed(2)),
      },
    };
  }
}
