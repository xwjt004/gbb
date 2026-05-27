import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';
import { AutoPurchaseSuggestionService } from './auto-purchase-suggestion.service';

@Injectable()
export class StockAlertService {
  private readonly logger = new Logger(StockAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly autoPurchaseSuggestionService: AutoPurchaseSuggestionService,
  ) {}

  /**
   * 生成预警编号
   * 格式：ALT-YYYYMMDD-XXXX
   */
  private async generateAlertNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 查询今天已有的预警数量
    const count = await this.prisma.stockAlert.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `ALT-${dateStr}-${sequence}`;
  }

  /**
   * 确定预警优先级
   * 根据库存情况和阈值自动判断优先级
   */
  private determinePriority(alertType: string, currentStock: number, threshold: number): string {
    if (alertType === 'OUT_OF_STOCK') {
      return 'HIGH'; // 缺货最高优先级
    }
    
    if (alertType === 'LOW_STOCK') {
      const ratio = currentStock / threshold;
      if (ratio <= 0.3) {
        return 'HIGH'; // 库存低于阈值30%
      } else if (ratio <= 0.7) {
        return 'MEDIUM'; // 库存在阈值30-70%之间
      } else {
        return 'LOW'; // 库存在阈值70-100%之间
      }
    }
    
    if (alertType === 'HIGH_STOCK') {
      const ratio = currentStock / threshold;
      if (ratio >= 2.0) {
        return 'HIGH'; // 库存超过阈值2倍
      } else if (ratio >= 1.5) {
        return 'MEDIUM'; // 库存超过阈值1.5倍
      } else {
        return 'LOW'; // 库存刚超过阈值
      }
    }
    
    return 'MEDIUM';
  }

  /**
   * 自动检测库存预警
   * 定时任务调用，检查所有商品的库存情况
   * 注意：暂时禁用@Cron装饰器，可通过API手动触发
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoCheckStockAlerts() {
    this.logger.log('开始自动检测库存预警...');
    
    try {
      // 查询所有追踪库存的活跃商品
      const products = await this.prisma.product.findMany({
        where: {
          isActive: true,
          isTrackStock: true
        }
      });

      let alertCount = 0;

      for (const product of products) {
        // 1. 检查缺货预警
        if (product.stockQuantity === 0) {
          const exists = await this.checkAlertExists(product.id, 'OUT_OF_STOCK');
          if (!exists) {
            await this.createAlert({
              productId: product.id,
              alertType: 'OUT_OF_STOCK',
              currentStock: 0,
              threshold: product.lowStock,
              priority: 'HIGH'
            });
            alertCount++;
            this.logger.warn(`商品 ${product.name} (ID: ${product.id}) 已缺货`);
          }
        }
        // 2. 检查低库存预警
        else if (product.stockQuantity <= product.lowStock) {
          const exists = await this.checkAlertExists(product.id, 'LOW_STOCK');
          if (!exists) {
            const priority = this.determinePriority(
              'LOW_STOCK',
              product.stockQuantity,
              product.lowStock
            );
            await this.createAlert({
              productId: product.id,
              alertType: 'LOW_STOCK',
              currentStock: product.stockQuantity,
              threshold: product.lowStock,
              priority
            });
            alertCount++;
            this.logger.warn(`商品 ${product.name} (ID: ${product.id}) 库存低于预警值`);

            // 自动生成采购建议
            await this.autoPurchaseSuggestionService.createIfNotExists({
              productId: product.id,
              productName: product.name,
              currentStock: product.stockQuantity,
              minStock: product.lowStock,
              suggestedQty: product.reorderPoint || product.lowStock * 2,
            });
          }
        }
        // 3. 检查高库存预警
        else if (product.maxStock && product.stockQuantity >= product.maxStock) {
          const exists = await this.checkAlertExists(product.id, 'HIGH_STOCK');
          if (!exists) {
            const priority = this.determinePriority(
              'HIGH_STOCK',
              product.stockQuantity,
              product.maxStock
            );
            await this.createAlert({
              productId: product.id,
              alertType: 'HIGH_STOCK',
              currentStock: product.stockQuantity,
              threshold: product.maxStock,
              priority
            });
            alertCount++;
            this.logger.warn(`商品 ${product.name} (ID: ${product.id}) 库存超过最大值`);
          }
        } else {
          // 库存正常，自动解决之前的预警
          await this.autoResolveAlerts(product.id);
        }
      }

      this.logger.log(`库存预警检测完成，新增 ${alertCount} 条预警`);
      return { alertCount, totalProducts: products.length };
    } catch (error) {
      this.logger.error('自动检测库存预警失败', error);
      throw error;
    }
  }

  /**
   * 检查预警是否已存在
   * 避免重复创建相同类型的预警
   */
  private async checkAlertExists(productId: number, alertType: string): Promise<boolean> {
    const count = await this.prisma.stockAlert.count({
      where: {
        productId,
        alertType,
        status: {
          in: ['PENDING', 'PROCESSING'] // 只检查未解决的预警
        }
      }
    });
    return count > 0;
  }

  /**
   * 自动解决预警
   * 当库存恢复正常时，自动将相关预警标记为已解决
   */
  private async autoResolveAlerts(productId: number) {
    await this.prisma.stockAlert.updateMany({
      where: {
        productId,
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      },
      data: {
        status: 'RESOLVED',
        handleNote: '库存已恢复正常（系统自动解决）',
        handledAt: new Date()
      }
    });
  }

  /**
   * 创建预警记录
   */
  async createAlert(createAlertDto: CreateAlertDto) {
    const dto = createAlertDto as any;
    
    // 1. 验证商品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId }
    });

    if (!product) {
      throw new NotFoundException(`商品ID ${dto.productId} 不存在`);
    }

    // 2. 验证预警类型
    const validTypes = ['LOW_STOCK', 'HIGH_STOCK', 'OUT_OF_STOCK'];
    if (!validTypes.includes(dto.alertType)) {
      throw new Error('无效的预警类型');
    }

    // 3. 自动确定优先级（如果未提供）
    const priority = dto.priority || this.determinePriority(
      dto.alertType,
      dto.currentStock,
      dto.threshold
    );

    // 4. 生成预警编号
    const alertNo = await this.generateAlertNo();

    // 5. 创建预警记录
    const alert = await this.prisma.stockAlert.create({
      data: {
        alertNo,
        productId: dto.productId,
        alertType: dto.alertType,
        currentStock: dto.currentStock,
        threshold: dto.threshold,
        status: 'PENDING',
        priority,
        alertedAt: new Date()
      },
      include: {
        product: true
      }
    });

    return {
      code: 200,
      message: '创建预警记录成功',
      data: alert
    };
  }

  /**
   * 查询预警列表
   */
  async findAll(query: QueryAlertDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      alertType,
      priority,
      startDate,
      endDate,
      productId,
      alertNo,
    } = query;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 预警类型筛选
    if (alertType) {
      where.alertType = alertType;
    }

    // 优先级筛选
    if (priority) {
      where.priority = priority;
    }

    // 日期范围筛选
    if (startDate || endDate) {
      where.alertedAt = {};
      if (startDate) {
        where.alertedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.alertedAt.lte = new Date(endDate);
      }
    }

    // 商品筛选
    if (productId) {
      where.productId = productId;
    }

    // 预警编号模糊查询
    if (alertNo) {
      where.alertNo = {
        contains: alertNo
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.stockAlert.count({ where }),
      this.prisma.stockAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { priority: 'desc' }, // 优先级高的在前
          { alertedAt: 'desc' } // 预警时间新的在前
        ],
        include: {
          product: true,
          handler: {
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
      message: '查询预警列表成功',
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
   * 查询预警详情
   */
  async findOne(id: string) {
    const alert = await this.prisma.stockAlert.findUnique({
      where: { id },
      include: {
        product: true,
        handler: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    if (!alert) {
      throw new NotFoundException('预警记录不存在');
    }

    return {
      code: 200,
      message: '查询预警详情成功',
      data: alert
    };
  }

  /**
   * 处理预警
   */
  async handle(id: string, userId: number, updateAlertDto: UpdateAlertDto) {
    const dto = updateAlertDto as any;
    
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
    
    // 2. 查询预警记录
    const alert = await this.prisma.stockAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      throw new NotFoundException('预警记录不存在');
    }

    // 3. 准备更新数据
    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;
      updateData.handlerId = validUserId;
      updateData.handledAt = new Date();
    }

    if (dto.priority) {
      updateData.priority = dto.priority;
    }

    if (dto.handleNote) {
      updateData.handleNote = dto.handleNote;
    }

    // 4. 更新预警记录
    const updated = await this.prisma.stockAlert.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        handler: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    return {
      code: 200,
      message: '处理预警成功',
      data: updated
    };
  }

  /**
   * 删除预警记录
   */
  async remove(id: string) {
    // 查询预警记录
    const alert = await this.prisma.stockAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      throw new NotFoundException('预警记录不存在');
    }

    // 删除预警记录
    await this.prisma.stockAlert.delete({
      where: { id }
    });

    return {
      code: 200,
      message: '删除预警记录成功',
      data: null
    };
  }

  /**
   * 预警统计
   */
  async statistics(startDate?: string, endDate?: string) {
    const where: any = {};

    // 日期范围
    if (startDate || endDate) {
      where.alertedAt = {};
      if (startDate) {
        where.alertedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.alertedAt.lte = new Date(endDate);
      }
    }

    const [totalCount, alerts] = await Promise.all([
      this.prisma.stockAlert.count({ where }),
      this.prisma.stockAlert.findMany({
        where,
        select: {
          status: true,
          alertType: true,
          priority: true
        }
      })
    ]);

    // 按状态统计
    const byStatus = alerts.reduce((acc: any, alert) => {
      if (!acc[alert.status]) {
        acc[alert.status] = 0;
      }
      acc[alert.status] += 1;
      return acc;
    }, {});

    // 按类型统计
    const byType = alerts.reduce((acc: any, alert) => {
      if (!acc[alert.alertType]) {
        acc[alert.alertType] = 0;
      }
      acc[alert.alertType] += 1;
      return acc;
    }, {});

    // 按优先级统计
    const byPriority = alerts.reduce((acc: any, alert) => {
      if (!acc[alert.priority]) {
        acc[alert.priority] = 0;
      }
      acc[alert.priority] += 1;
      return acc;
    }, {});

    // 待处理数量
    const pendingCount = alerts.filter(a => a.status === 'PENDING').length;

    return {
      code: 200,
      message: '查询预警统计成功',
      data: {
        totalCount,
        pendingCount,
        byStatus,
        byType,
        byPriority
      }
    };
  }

  /**
   * 手动触发预警检测
   */
  async manualCheck() {
    return await this.autoCheckStockAlerts();
  }
}
