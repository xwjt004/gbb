import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCheckDto } from './dto/create-check.dto';
import { UpdateCheckDto } from './dto/update-check.dto';
import { QueryCheckDto } from './dto/query-check.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StockCheckService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成盘点单号
   * 格式：CHK-YYYYMMDD-XXXX
   */
  private async generateCheckNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 查询今天已有的盘点单数量
    const count = await this.prisma.stockCheck.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `CHK-${dateStr}-${sequence}`;
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
   * 计算盘点差异
   */
  private calculateDifference(systemQty: number, actualQty: number | undefined | null): number {
    if (actualQty === undefined || actualQty === null) {
      return 0; // 如果实际数量未填写，差异为0
    }
    return actualQty - systemQty;
  }

  /**
   * 创建盘点单
   */
  async create(userId: number, createCheckDto: CreateCheckDto) {
    const dto = createCheckDto as any;
    
    // 1. 验证或创建用户
    let validUserId = userId;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
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
    
    // 2. 验证盘点类型
    const validTypes = ['FULL', 'PARTIAL', 'SPOT'];
    if (!validTypes.includes(dto.checkType)) {
      throw new BadRequestException('无效的盘点类型');
    }

    // 3. 验证商品并准备明细数据
    const itemsData: any[] = [];
    let profitQuantity = 0;
    let lossQuantity = 0;
    let profitItems = 0;
    let lossItems = 0;
    let profitAmount = new Decimal(0);
    let lossAmount = new Decimal(0);
    
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

      // 计算差异
      const actualQty = item.actualQuantity !== undefined ? item.actualQuantity : item.systemQuantity;
      const difference = actualQty - item.systemQuantity;
      const unitPrice = product.costPrice;
      const differenceAmount = new Decimal(unitPrice).mul(Math.abs(difference));
      
      // 确定差异类型
      let differenceType = 'NORMAL';
      if (difference > 0) {
        differenceType = 'PROFIT';
        profitQuantity += difference;
        profitItems += 1;
        profitAmount = profitAmount.add(differenceAmount);
      } else if (difference < 0) {
        differenceType = 'LOSS';
        lossQuantity += Math.abs(difference);
        lossItems += 1;
        lossAmount = lossAmount.add(differenceAmount);
      }

      itemsData.push({
        productId: item.productId,
        systemQuantity: item.systemQuantity,
        actualQuantity: actualQty,
        differenceQty: difference,
        unitPrice,
        differenceAmount,
        differenceType,
        remark: item.remark
      });
    }

    // 4. 生成盘点单号
    const checkNo = await this.generateCheckNo();

    // 5. 创建盘点单
    const check = await this.prisma.stockCheck.create({
      data: {
        checkNo,
        checkType: dto.checkType,
        checkDate: new Date(dto.checkDate),
        status: 'PENDING',
        totalItems: itemsData.length,
        profitItems,
        lossItems,
        profitQuantity,
        lossQuantity,
        profitAmount,
        lossAmount,
        remark: dto.remark,
        creatorId: validUserId,
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
        creator: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    return {
      code: 200,
      message: '创建盘点单成功',
      data: check
    };
  }

  /**
   * 查询盘点单列表
   */
  async findAll(query: QueryCheckDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      checkType,
      startDate,
      endDate,
      checkNo,
    } = query;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 盘点类型筛选
    if (checkType) {
      where.checkType = checkType;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.checkDate = {};
      if (startDate) {
        where.checkDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.checkDate.lte = new Date(endDate);
      }
    }

    // 盘点单号模糊查询
    if (checkNo) {
      where.checkNo = {
        contains: checkNo
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.stockCheck.count({ where }),
      this.prisma.stockCheck.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          creator: {
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
      })
    ]);

    return {
      code: 200,
      message: '查询盘点单列表成功',
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
   * 查询盘点单详情
   */
  async findOne(id: string) {
    const check = await this.prisma.stockCheck.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        creator: {
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
        transactions: true
      }
    });

    if (!check) {
      throw new NotFoundException('盘点单不存在');
    }

    return {
      code: 200,
      message: '查询盘点单详情成功',
      data: check
    };
  }

  /**
   * 更新盘点单
   */
  async update(id: string, updateCheckDto: UpdateCheckDto) {
    const dto = updateCheckDto as any;
    
    // 1. 查询盘点单
    const check = await this.prisma.stockCheck.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!check) {
      throw new NotFoundException('盘点单不存在');
    }

    // 2. 检查状态
    if (check.status !== 'PENDING') {
      throw new BadRequestException('只能修改待审批状态的盘点单');
    }

    // 3. 准备更新数据
    const updateData: any = {};

    if (dto.remark !== undefined) {
      updateData.remark = dto.remark;
    }

    // 4. 如果更新明细项
    if (dto.items && dto.items.length > 0) {
      let newProfitQuantity = 0;
      let newLossQuantity = 0;
      let newProfitItems = 0;
      let newLossItems = 0;
      let newProfitAmount = new Decimal(0);
      let newLossAmount = new Decimal(0);
      
      const newItemsData: any[] = [];
      
      for (const item of dto.items) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId }
        });
        
        if (!product) {
          throw new NotFoundException(`商品ID ${item.productId} 不存在`);
        }
        
        const actualQty = item.actualQuantity !== undefined ? item.actualQuantity : item.systemQuantity || 0;
        const systemQty = item.systemQuantity || 0;
        const difference = actualQty - systemQty;
        const unitPrice = product.costPrice;
        const differenceAmount = new Decimal(unitPrice).mul(Math.abs(difference));
        
        let differenceType = 'NORMAL';
        if (difference > 0) {
          differenceType = 'PROFIT';
          newProfitQuantity += difference;
          newProfitItems += 1;
          newProfitAmount = newProfitAmount.add(differenceAmount);
        } else if (difference < 0) {
          differenceType = 'LOSS';
          newLossQuantity += Math.abs(difference);
          newLossItems += 1;
          newLossAmount = newLossAmount.add(differenceAmount);
        }
        
        newItemsData.push({
          productId: item.productId,
          systemQuantity: systemQty,
          actualQuantity: actualQty,
          differenceQty: difference,
          unitPrice,
          differenceAmount,
          differenceType,
          remark: item.remark
        });
      }

      updateData.profitQuantity = newProfitQuantity;
      updateData.lossQuantity = newLossQuantity;
      updateData.profitItems = newProfitItems;
      updateData.lossItems = newLossItems;
      updateData.profitAmount = newProfitAmount;
      updateData.lossAmount = newLossAmount;
      updateData.items = {
        deleteMany: {}, // 删除所有旧明细
        create: newItemsData
      };
    }

    // 5. 执行更新
    const updated = await this.prisma.stockCheck.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        },
        creator: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    return {
      code: 200,
      message: '更新盘点单成功',
      data: updated
    };
  }

  /**
   * 删除盘点单
   */
  async remove(id: string) {
    // 1. 查询盘点单
    const check = await this.prisma.stockCheck.findUnique({
      where: { id }
    });

    if (!check) {
      throw new NotFoundException('盘点单不存在');
    }

    // 2. 检查状态
    if (check.status !== 'PENDING') {
      throw new BadRequestException('只能删除待审批状态的盘点单');
    }

    // 3. 删除盘点单（明细会级联删除）
    await this.prisma.stockCheck.delete({
      where: { id }
    });

    return {
      code: 200,
      message: '删除盘点单成功',
      data: null
    };
  }

  /**
   * 审批盘点单
   */
  async approve(id: string, userId: number, approved: boolean, note?: string, autoAdjust: boolean = true) {
    // 验证或创建用户
    let validUserId = userId;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
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
      // 1. 锁定盘点单
      const check = await tx.stockCheck.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!check) {
        throw new NotFoundException('盘点单不存在');
      }

      // 2. 检查状态
      if (check.status !== 'PENDING') {
        throw new BadRequestException('盘点单已审批，不能重复审批');
      }

      // 3. 审批通过且自动调整库存
      if (approved && autoAdjust) {
        for (const item of check.items) {
          // 如果商品不追踪库存，跳过
          if (!item.product.isTrackStock) {
            continue;
          }

          // 如果没有差异，跳过
          if (item.differenceQty === 0) {
            continue;
          }

          // 更新商品库存
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: item.actualQuantity
            }
          });

          // 创建库存流水
          const transactionNo = await this.generateTransactionNo();
          await tx.stockTransaction.create({
            data: {
              transactionNo,
              transactionType: item.differenceQty > 0 ? 'CHECK_IN' : 'CHECK_OUT',
              productId: item.productId,
              quantity: item.differenceQty,
              beforeStock: item.systemQuantity,
              afterStock: item.actualQuantity,
              refType: 'CHECK',
              refId: check.id,
              checkId: check.id,
              remark: `盘点调整：${check.checkNo} - ${item.remark || '盘点差异调整'}`,
              operatorId: validUserId
            }
          });
        }

        // 更新盘点单状态为已完成
        return await tx.stockCheck.update({
          where: { id },
          data: {
            status: 'COMPLETED',
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
            creator: {
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
            transactions: true
          }
        });
      } else if (approved && !autoAdjust) {
        // 审批通过但不自动调整库存
        return await tx.stockCheck.update({
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
            creator: {
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
        return await tx.stockCheck.update({
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
            creator: {
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
   * 盘点统计
   */
  async statistics(startDate?: string, endDate?: string) {
    const where: any = {};

    // 只统计已完成的盘点单
    where.status = 'COMPLETED';

    // 日期范围
    if (startDate || endDate) {
      where.checkDate = {};
      if (startDate) {
        where.checkDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.checkDate.lte = new Date(endDate);
      }
    }

    const [totalCount, checks] = await Promise.all([
      this.prisma.stockCheck.count({ where }),
      this.prisma.stockCheck.findMany({
        where,
        select: {
          profitQuantity: true,
          lossQuantity: true,
          checkType: true
        }
      })
    ]);

    // 计算总差异数量
    const totalDifferenceQty = checks.reduce(
      (sum, check) => sum + check.profitQuantity + check.lossQuantity,
      0
    );

    // 按类型分组统计
    const byType = checks.reduce((acc: any, check) => {
      if (!acc[check.checkType]) {
        acc[check.checkType] = {
          count: 0,
          profitQuantity: 0,
          lossQuantity: 0
        };
      }
      acc[check.checkType].count += 1;
      acc[check.checkType].profitQuantity += check.profitQuantity;
      acc[check.checkType].lossQuantity += check.lossQuantity;
      return acc;
    }, {});

    return {
      code: 200,
      message: '查询盘点统计成功',
      data: {
        totalCount,
        totalDifferenceQty,
        byType
      }
    };
  }
}
