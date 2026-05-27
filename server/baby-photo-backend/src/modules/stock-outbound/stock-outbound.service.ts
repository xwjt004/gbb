import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateOutboundDto } from './dto/create-outbound.dto';
import { UpdateOutboundDto } from './dto/update-outbound.dto';
import { QueryOutboundDto } from './dto/query-outbound.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StockOutboundService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成出库单号
   * 格式：OUT-YYYYMMDD-XXXX
   */
  private async generateOutboundNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 查询今天已有的出库单数量
    const count = await this.prisma.stockOutbound.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `OUT-${dateStr}-${sequence}`;
  }

  /**
   * 生成库存流水号
   * 格式：TXN-YYYYMMDD-XXXXXX
   */
  private async generateTransactionNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await this.prisma.stockTransaction.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    const sequence = String(count + 1).padStart(6, '0');
    return `TXN-${dateStr}-${sequence}`;
  }

  /**
   * 创建出库单
   */
  async create(userId: number, createOutboundDto: CreateOutboundDto) {
    const dto = createOutboundDto as any;
    
    // 1. 验证或创建用户
    let validUserId = userId;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        // 如果用户不存在，创建一个临时用户
        const tempUser = await this.prisma.user.create({
          data: {
            openid: 'admin_temp_' + Date.now(),
            nickname: '系统管理员',
            phone: '13800138000',
            status: 'ACTIVE'
          }
        });
        validUserId = tempUser.id;
      }
    }
    
    // 2. 验证出库类型
    const validTypes = ['ORDER', 'DAMAGE', 'TRANSFER', 'OTHER'];
    if (!validTypes.includes(dto.outboundType)) {
      throw new BadRequestException('无效的出库类型');
    }

    // 2. 如果是订单出库，验证订单是否存在
    if (dto.outboundType === 'ORDER' && dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId }
      });
      if (!order) {
        throw new NotFoundException('订单不存在');
      }
    }

    // 3. 验证商品并计算总计
    let totalQuantity = 0;
    let totalAmount = new Decimal(0);
    const itemsData: any[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        throw new NotFoundException(`商品ID ${item.productId} 不存在`);
      }

      if (!product.isActive) {
        throw new BadRequestException(`商品 ${product.name} 已停用`);
      }

      const unitPrice = product.costPrice;
      const amount = new Decimal(unitPrice).mul(item.quantity);

      totalQuantity += item.quantity;
      totalAmount = totalAmount.add(amount);

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        amount,
        remark: item.remark
      });
    }

    // 4. 生成出库单号
    const outboundNo = await this.generateOutboundNo();

    // 5. 创建出库单
    const outbound = await this.prisma.stockOutbound.create({
      data: {
        outboundNo,
        outboundType: dto.outboundType,
        outboundDate: new Date(dto.outboundDate),
        status: 'PENDING',
        totalQuantity,
        totalAmount,
        remark: dto.remark,
        submitterId: validUserId,
        orderId: dto.orderId,
        items: {
          create: itemsData
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        submitter: {
          select: {
            id: true,
            nickname: true
          }
        },
        order: true
      }
    });

    return {
      code: 200,
      message: '创建出库单成功',
      data: outbound
    };
  }

  /**
   * 查询出库单列表
   */
  async findAll(query: QueryOutboundDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      outboundType,
      startDate,
      endDate,
      keyword
    } = query;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 出库类型筛选
    if (outboundType) {
      where.outboundType = outboundType;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.outboundDate = {};
      if (startDate) {
        where.outboundDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.outboundDate.lte = new Date(endDate);
      }
    }

    // 关键词搜索（出库单号或备注）
    if (keyword) {
      where.OR = [
        { outboundNo: { contains: keyword } },
        { remark: { contains: keyword } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.stockOutbound.count({ where }),
      this.prisma.stockOutbound.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          items: {
            include: {
              product: true
            }
          },
          submitter: {
            select: {
              id: true,
              nickname: true
            }
          },
          approver: {
            select: {
              id: true,
              nickname: true
            }
          },
          order: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 查询出库单详情
   */
  async findOne(id: string) {
    const outbound = await this.prisma.stockOutbound.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        submitter: {
          select: {
            id: true,
            nickname: true
          }
        },
        approver: {
          select: {
            id: true,
            nickname: true
          }
        },
        order: true,
        transactions: true
      }
    });

    if (!outbound) {
      throw new NotFoundException('出库单不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: outbound
    };
  }

  /**
   * 更新出库单
   */
  async update(id: string, updateOutboundDto: UpdateOutboundDto) {
    const dto = updateOutboundDto as any;
    
    // 1. 检查出库单是否存在
    const existingOutbound = await this.prisma.stockOutbound.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!existingOutbound) {
      throw new NotFoundException('出库单不存在');
    }

    // 2. 只有待审批状态的出库单可以修改
    if (existingOutbound.status !== 'PENDING') {
      throw new BadRequestException('只有待审批状态的出库单可以修改');
    }

    // 3. 如果更新了明细，重新计算总计
    let totalQuantity = existingOutbound.totalQuantity;
    let totalAmount = existingOutbound.totalAmount;
    const itemsData: any[] = [];

    if (dto.items && dto.items.length > 0) {
      totalQuantity = 0;
      totalAmount = new Decimal(0);

      for (const item of dto.items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new NotFoundException(`商品ID ${item.productId} 不存在`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`商品 ${product.name} 已停用`);
        }

        const unitPrice = product.costPrice;
        const amount = new Decimal(unitPrice).mul(item.quantity);

        totalQuantity += item.quantity;
        totalAmount = totalAmount.add(amount);

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          amount,
          remark: item.remark
        });
      }

      // 使用事务删除旧明细并创建新明细
      const outbound = await this.prisma.$transaction(async (tx) => {
        // 删除旧明细
        await tx.stockOutboundItem.deleteMany({
          where: { outboundId: id }
        });

        // 更新出库单并创建新明细
        return await tx.stockOutbound.update({
          where: { id },
          data: {
            outboundType: dto.outboundType,
            outboundDate: dto.outboundDate ? new Date(dto.outboundDate) : undefined,
            totalQuantity,
            totalAmount,
            remark: dto.remark,
            orderId: dto.orderId,
            items: {
              create: itemsData
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            submitter: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        });
      });

      return {
        code: 200,
        message: '更新出库单成功',
        data: outbound
      };
    } else {
      // 只更新基本信息
      const outbound = await this.prisma.stockOutbound.update({
        where: { id },
        data: {
          outboundType: dto.outboundType,
          outboundDate: dto.outboundDate ? new Date(dto.outboundDate) : undefined,
          remark: dto.remark,
          orderId: dto.orderId
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          submitter: {
            select: {
              id: true,
              nickname: true
            }
          }
        }
      });

      return {
        code: 200,
        message: '更新出库单成功',
        data: outbound
      };
    }
  }

  /**
   * 删除出库单
   */
  async remove(id: string) {
    // 1. 检查出库单是否存在
    const outbound = await this.prisma.stockOutbound.findUnique({
      where: { id }
    });

    if (!outbound) {
      throw new NotFoundException('出库单不存在');
    }

    // 2. 只有待审批状态的出库单可以删除
    if (outbound.status !== 'PENDING') {
      throw new BadRequestException('只有待审批状态的出库单可以删除');
    }

    // 3. 删除出库单（级联删除明细）
    await this.prisma.stockOutbound.delete({
      where: { id }
    });

    return {
      code: 200,
      message: '删除出库单成功'
    };
  }

  /**
   * 审批出库单
   */
  async approve(id: string, userId: number, approved: boolean, note?: string) {
    // 验证或创建用户
    let validUserId = userId;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        // 如果用户不存在，创建一个临时用户
        const tempUser = await this.prisma.user.create({
          data: {
            openid: 'admin_temp_' + Date.now(),
            nickname: '系统管理员',
            phone: '13800138000',
            status: 'ACTIVE'
          }
        });
        validUserId = tempUser.id;
      }
    }
    
    return await this.prisma.$transaction(async (tx) => {
      // 1. 锁定出库单
      const outbound = await tx.stockOutbound.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!outbound) {
        throw new NotFoundException('出库单不存在');
      }

      // 2. 检查状态
      if (outbound.status !== 'PENDING') {
        throw new BadRequestException('出库单已审批，不能重复审批');
      }

      // 3. 审批通过
      if (approved) {
        // 检查库存并扣减
        for (const item of outbound.items) {
          // 如果商品不追踪库存，跳过
          if (!item.product.isTrackStock) {
            continue;
          }

          // 检查库存是否足够
          if (item.product.stockQuantity < item.quantity) {
            throw new BadRequestException(
              `商品 ${item.product.name} 库存不足，当前库存：${item.product.stockQuantity}，需要：${item.quantity}`
            );
          }

          // 扣减库存
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          });

          // 创建库存流水
          const transactionNo = await this.generateTransactionNo();
          await tx.stockTransaction.create({
            data: {
              transactionNo,
              transactionType: 'OUTBOUND',
              productId: item.productId,
              quantity: -item.quantity, // 负数表示出库
              beforeStock: item.product.stockQuantity,
              afterStock: item.product.stockQuantity - item.quantity,
              refType: 'OUTBOUND',
              refId: outbound.id,
              outboundId: outbound.id,
              remark: `出库单：${outbound.outboundNo} - ${item.remark || ''}`,
              operatorId: validUserId
            }
          });
        }

        // 更新出库单状态
        return await tx.stockOutbound.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approverId: validUserId,
            approvedAt: new Date(),
            approvalNote: note
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            submitter: {
              select: {
                id: true,
                nickname: true
              }
            },
            approver: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        });
      } else {
        // 审批驳回
        return await tx.stockOutbound.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approverId: validUserId,
            approvedAt: new Date(),
            approvalNote: note
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            submitter: {
              select: {
                id: true,
                nickname: true
              }
            },
            approver: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        });
      }
    });
  }

  /**
   * 出库统计
   */
  async statistics(startDate?: string, endDate?: string, groupBy?: string) {
    const where: any = {};

    // 日期范围筛选
    if (startDate || endDate) {
      where.outboundDate = {};
      if (startDate) {
        where.outboundDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.outboundDate.lte = new Date(endDate);
      }
    }

    // 只统计已审批的出库单
    where.status = 'APPROVED';

    // 总体统计
    const aggregation = await this.prisma.stockOutbound.aggregate({
      where,
      _sum: {
        totalQuantity: true,
        totalAmount: true
      },
      _count: {
        id: true
      }
    });

    const result: any = {
      totalCount: aggregation._count?.id || 0,
      totalQuantity: aggregation._sum?.totalQuantity || 0,
      totalAmount: aggregation._sum?.totalAmount || 0,
      groups: []
    };

    // 按类型分组统计
    if (groupBy === 'type') {
      const byType: any[] = await Promise.all(
        ['ORDER', 'DAMAGE', 'TRANSFER', 'OTHER'].map(async (type) => {
          const agg = await this.prisma.stockOutbound.aggregate({
            where: {
              ...where,
              outboundType: type
            },
            _sum: {
              totalQuantity: true,
              totalAmount: true
            },
            _count: {
              id: true
            }
          });

          return {
            type,
            count: agg._count?.id || 0,
            quantity: agg._sum?.totalQuantity || 0,
            amount: agg._sum?.totalAmount || 0
          };
        })
      );

      result.groups = byType;
    }

    return {
      code: 200,
      message: '统计成功',
      data: result
    };
  }
}



