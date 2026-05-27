import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueryTransactionDto, ManualAdjustDto } from './dto';

@Injectable()
export class StockTransactionService {
  private readonly logger = new Logger(StockTransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成库存流水号
   * 格式：TXN-YYYYMMDD-XXXXXX
   */
  private async generateTransactionNo(): Promise<string> {
    const now = new Date();
    // 使用本地日期格式
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // 使用当天开始和结束的时间戳（本地时区）
    const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const count = await this.prisma.stockTransaction.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const sequence = String(count + 1).padStart(6, '0');
    return `TXN-${dateStr}-${sequence}`;
  }

  /**
   * 查询库存流水列表
   */
  async findAll(queryDto: QueryTransactionDto) {
    const { 
      productId, 
      transactionType, 
      refType, 
      refId,
      startDate, 
      endDate,
      operatorId,
      page = 1, 
      limit = 20 
    } = queryDto;

    // 构建查询条件
    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (transactionType) {
      where.transactionType = transactionType;
    }

    if (refType) {
      where.refType = refType;
    }

    if (refId) {
      where.refId = refId;
    }

    if (operatorId) {
      where.operatorId = operatorId;
    }

    // 日期范围
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

    // 计算总数
    const total = await this.prisma.stockTransaction.count({ where });

    // 查询数据
    const items = await this.prisma.stockTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            productNo: true,
            name: true,
            unit: true
          }
        },
        operator: {
          select: {
            id: true,
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 查询单个流水详情
   */
  async findOne(id: string) {
    const transaction = await this.prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            productNo: true,
            name: true,
            unit: true,
            category: true
          }
        },
        operator: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    if (!transaction) {
      throw new NotFoundException('库存流水记录不存在');
    }

    return transaction;
  }

  /**
   * 查询商品流水记录
   */
  async findByProduct(productId: number, startDate?: string, endDate?: string) {
    // 验证商品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        productNo: true,
        name: true,
        stockQuantity: true
      }
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 构建查询条件
    const where: any = { productId };

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

    // 查询流水记录
    const transactions = await this.prisma.stockTransaction.findMany({
      where,
      include: {
        operator: {
          select: {
            id: true,
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      product,
      transactions,
      total: transactions.length
    };
  }

  /**
   * 库存流水统计
   */
  async statistics(productId?: number, startDate?: string, endDate?: string) {
    // 构建查询条件
    const where: any = {};

    if (productId) {
      where.productId = productId;
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

    // 查询所有流水
    const transactions = await this.prisma.stockTransaction.findMany({
      where,
      select: {
        transactionType: true,
        quantity: true
      }
    });

    // 统计数据
    let totalInbound = 0;  // 总入库
    let totalOutbound = 0; // 总出库
    const byType: Record<string, number> = {};

    transactions.forEach(txn => {
      // 按类型统计
      if (!byType[txn.transactionType]) {
        byType[txn.transactionType] = 0;
      }
      byType[txn.transactionType] += txn.quantity;

      // 入库/出库统计
      if (txn.quantity > 0) {
        totalInbound += txn.quantity;
      } else {
        totalOutbound += Math.abs(txn.quantity);
      }
    });

    // 净变化
    const netChange = totalInbound - totalOutbound;

    // 转换为数组格式
    const typeStats = Object.keys(byType).map(type => ({
      type,
      quantity: byType[type]
    }));

    return {
      totalInbound,
      totalOutbound,
      netChange,
      totalRecords: transactions.length,
      byType: typeStats
    };
  }

  /**
   * 手工调整库存
   */
  async manualAdjust(adjustDto: ManualAdjustDto) {
    this.logger.log(`[manualAdjust] 开始手工调整库存: ${JSON.stringify(adjustDto)}`);
    
    const { productId, quantity, remark, operatorId } = adjustDto;

    // 验证商品是否存在
    this.logger.log(`[manualAdjust] 查询商品 ID=${productId}`);
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      this.logger.error(`[manualAdjust] 商品不存在: ID=${productId}`);
      throw new NotFoundException('商品不存在');
    }
    
    this.logger.log(`[manualAdjust] 商品找到: ${product.name}, 当前库存=${product.stockQuantity}`);

    this.logger.log(`[manualAdjust] 商品找到: ${product.name}, 当前库存=${product.stockQuantity}`);

    // 计算调整后库存
    const beforeStock = product.stockQuantity;
    const afterStock = beforeStock + quantity;
    
    this.logger.log(`[manualAdjust] 库存计算: 调整前=${beforeStock}, 调整数量=${quantity}, 调整后=${afterStock}`);

    // 验证库存不能为负数
    if (afterStock < 0) {
      this.logger.error(`[manualAdjust] 库存不足: 当前=${beforeStock}, 调整=${quantity}, 结果=${afterStock}`);
      throw new BadRequestException(
        `调整后库存不能为负数。当前库存: ${beforeStock}，调整数量: ${quantity}`
      );
    }

    // 生成流水号（在事务外部）
    this.logger.log(`[manualAdjust] 开始生成流水号...`);
    const transactionNo = await this.generateTransactionNo();
    this.logger.log(`[manualAdjust] 流水号生成成功: ${transactionNo}`);

    this.logger.log(`[manualAdjust] 流水号生成成功: ${transactionNo}`);

    // 使用事务处理
    this.logger.log(`[manualAdjust] 开始执行数据库事务...`);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log(`[manualAdjust] 事务内: 创建库存流水记录...`);

        // 2. 创建库存流水记录
        const transaction = await tx.stockTransaction.create({
          data: {
            transactionNo,
            productId,
            transactionType: 'MANUAL_ADJUST',
            quantity,
            beforeStock,
            afterStock,
            operatorId,
            remark: remark || '手工调整库存'
          },
          include: {
            product: {
              select: {
                id: true,
                productNo: true,
                name: true
              }
            },
            operator: {
              select: {
                id: true,
                nickname: true
              }
            }
          }
        });
        
        this.logger.log(`[manualAdjust] 事务内: 流水记录创建成功 ID=${transaction.id}`);

        // 3. 更新商品库存
        this.logger.log(`[manualAdjust] 事务内: 更新商品库存 productId=${productId}, newStock=${afterStock}`);
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: afterStock
          }
        });
        
        this.logger.log(`[manualAdjust] 事务内: 商品库存更新成功`);

        return transaction;
      });
      
      this.logger.log(
        `[manualAdjust] 手工调整库存成功: 商品ID=${productId}, 调整数量=${quantity}, ` +
        `变动前=${beforeStock}, 变动后=${afterStock}, 流水号=${transactionNo}`
      );

      return result;
    } catch (error) {
      this.logger.error(`[manualAdjust] 事务执行失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 导出库存流水（返回数据，实际导出由前端或其他服务处理）
   */
  async exportTransactions(queryDto: QueryTransactionDto) {
    const { 
      productId, 
      transactionType, 
      refType, 
      refId,
      startDate, 
      endDate,
      operatorId
    } = queryDto;

    // 构建查询条件（不分页，导出全部）
    const where: any = {};

    if (productId) where.productId = productId;
    if (transactionType) where.transactionType = transactionType;
    if (refType) where.refType = refType;
    if (refId) where.refId = refId;
    if (operatorId) where.operatorId = operatorId;

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

    // 查询所有匹配的流水记录
    const transactions = await this.prisma.stockTransaction.findMany({
      where,
      include: {
        product: {
          select: {
            productNo: true,
            name: true,
            unit: true
          }
        },
        operator: {
          select: {
            nickname: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 格式化导出数据
    const exportData = transactions.map(txn => ({
      流水号: txn.transactionNo,
      商品编号: txn.product.productNo,
      商品名称: txn.product.name,
      单位: txn.product.unit,
      变动类型: this.getTransactionTypeLabel(txn.transactionType),
      变动数量: txn.quantity,
      变动前库存: txn.beforeStock,
      变动后库存: txn.afterStock,
      关联类型: txn.refType || '-',
      关联单号: txn.refId || '-',
      操作人: txn.operator.nickname,
      备注: txn.remark || '-',
      操作时间: txn.createdAt.toISOString()
    }));

    return {
      data: exportData,
      total: exportData.length,
      exportTime: new Date().toISOString()
    };
  }

  /**
   * 获取变动类型中文标签
   */
  private getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'INBOUND': '入库',
      'OUTBOUND': '出库',
      'CHECK_IN': '盘盈',
      'CHECK_OUT': '盘亏',
      'TRANSFER_IN': '调拨入库',
      'TRANSFER_OUT': '调拨出库',
      'MANUAL_ADJUST': '手工调整'
    };
    return labels[type] || type;
  }
}
