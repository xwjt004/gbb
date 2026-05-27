import { Injectable, NotFoundException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { OrdersService } from '../orders/orders.service';
import { CreateDiyPackageDto } from './dto/create-diy-package.dto';
import { UpdateDiyPackageDto } from './dto/update-diy-package.dto';
import { QueryDiyPackageDto } from './dto/query-diy-package.dto';

@Injectable()
export class DiyPackagesService {
  private readonly logger = new Logger(DiyPackagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly discountRulesService: DiscountRulesService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * 创建DIY套系
   */
  async create(createDto: CreateDiyPackageDto) {
    this.logger.log(`创建DIY套系: ${createDto.packageName}`);

    try {
      // 计算折扣
      const discountResult = await this.discountRulesService.calculateDiscount(
        createDto.originalAmount
      );

      const diyPackage = await this.prisma.diyPackage.create({
        data: {
          packageName: createDto.packageName,
          customerId: createDto.customerId,
          customerInfo: createDto.customerInfo as any,
          selectedItems: createDto.selectedItems as any,
          originalAmount: createDto.originalAmount,
          discountAmount: discountResult.data.discountAmount,
          discountRate: discountResult.data.discountRate,
          savedAmount: discountResult.data.savedAmount,
          discountRuleId: discountResult.data.rule?.id,
          expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
        },
        include: {
          discountRule: true,
        },
      });

      this.logger.log(`DIY套系创建成功: ID=${diyPackage.id}`);
      return {
        code: 200,
        message: '创建成功',
        data: diyPackage,
      };
    } catch (error) {
      this.logger.error(`创建DIY套系失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询DIY套系列表
   */
  async findAll(query: QueryDiyPackageDto) {
    const { 
      keyword, 
      customerId, 
      status, 
      startDate, 
      endDate, 
      sortBy, 
      sortOrder = 'desc',
      page = 1, 
      pageSize = 20 
    } = query;

    const where: any = {};
    if (keyword) {
      where.packageName = { contains: keyword };
    }
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    
    // 添加日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // 将结束日期设置为当天的 23:59:59
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    try {
      // 1. 先获取总数
      const total = await this.prisma.diyPackage.count({ where });

      // 2. 获取所有符合条件的数据(不分页)
      const allList = await this.prisma.diyPackage.findMany({
        where,
        include: {
          discountRule: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              orderStatus: true,
              paymentStatus: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' }, // 默认按创建时间排序
        ],
      });

      // 3. 计算每个套系的统计信息
      let listWithStats = allList.map((pkg) => {
        const orderCount = pkg.orders?.length || 0;
        const totalSalesAmount = pkg.orders?.reduce((sum, order) => {
          return sum + (Number(order.totalAmount) || 0);
        }, 0) || 0;

        // 移除 orders 数组,只返回统计数据
        const { orders, ...pkgWithoutOrders } = pkg;

        return {
          ...pkgWithoutOrders,
          orderCount,
          totalSalesAmount,
        };
      });

      // 4. 如果指定了排序,进行排序
      if (sortBy === 'orderCount' || sortBy === 'totalSalesAmount') {
        listWithStats.sort((a, b) => {
          const aValue = a[sortBy] || 0;
          const bValue = b[sortBy] || 0;
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });
      } else if (sortBy === 'createdAt') {
        // 如果按创建时间排序
        listWithStats.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        });
      }

      // 5. 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedList = listWithStats.slice(startIndex, endIndex);

      return {
        code: 200,
        message: '查询成功',
        data: {
          list: paginatedList,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询DIY套系列表失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 查询单个DIY套系
   */
  async findOne(id: number) {
    try {
      const diyPackage = await this.prisma.diyPackage.findUnique({
        where: { id },
        include: {
          discountRule: true,
          orders: {
            select: {
              id: true,
              totalAmount: true,
              orderStatus: true,
              paymentStatus: true,
            },
          },
        },
      });

      if (!diyPackage) {
        throw new NotFoundException(`DIY套系 ID=${id} 不存在`);
      }

      // 计算销售统计信息
      const orderCount = diyPackage.orders?.length || 0;
      const totalSalesAmount = diyPackage.orders?.reduce((sum, order) => {
        return sum + (Number(order.totalAmount) || 0);
      }, 0) || 0;

      // 移除 orders 数组,添加统计数据
      const { orders, ...pkgWithoutOrders } = diyPackage;

      return {
        code: 200,
        message: '查询成功',
        data: {
          ...pkgWithoutOrders,
          orderCount,
          totalSalesAmount,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`查询DIY套系失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新DIY套系
   */
  async update(id: number, updateDto: UpdateDiyPackageDto) {
    this.logger.log(`更新DIY套系: ID=${id}`);

    const existing = await this.prisma.diyPackage.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`DIY套系 ID=${id} 不存在`);
    }

    try {
      let discountData = {};
      
      // 如果更新了原始金额，重新计算折扣
      if (updateDto.originalAmount && updateDto.originalAmount !== Number(existing.originalAmount)) {
        const discountResult = await this.discountRulesService.calculateDiscount(
          updateDto.originalAmount
        );
        discountData = {
          discountAmount: discountResult.data.discountAmount,
          discountRate: discountResult.data.discountRate,
          savedAmount: discountResult.data.savedAmount,
          discountRuleId: discountResult.data.rule?.id,
        };
      }

      const diyPackage = await this.prisma.diyPackage.update({
        where: { id },
        data: {
          ...updateDto,
          customerInfo: updateDto.customerInfo as any,
          selectedItems: updateDto.selectedItems as any,
          ...discountData,
          expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : undefined,
        },
        include: {
          discountRule: true,
        },
      });

      this.logger.log(`DIY套系更新成功: ID=${id}`);
      return {
        code: 200,
        message: '更新成功',
        data: diyPackage,
      };
    } catch (error) {
      this.logger.error(`更新DIY套系失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除DIY套系
   */
  async remove(id: number) {
    this.logger.log(`删除DIY套系: ID=${id}`);

    const existing = await this.prisma.diyPackage.findUnique({
      where: { id },
      include: { orders: true },
    });
    if (!existing) {
      throw new NotFoundException(`DIY套系 ID=${id} 不存在`);
    }

    // 检查是否有关联订单
    if (existing.orders.length > 0) {
      throw new ConflictException('该DIY套系已有订单，无法删除');
    }

    try {
      await this.prisma.diyPackage.delete({
        where: { id },
      });

      this.logger.log(`DIY套系删除成功: ID=${id}`);
      return {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      this.logger.error(`删除DIY套系失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 预览价格计算（不保存到数据库）
   */
  async previewPricing(selectedItems: any[], originalAmount: number) {
    try {
      const discountResult = await this.discountRulesService.calculateDiscount(originalAmount);
      
      return {
        code: 200,
        message: '计算成功',
        data: {
          selectedItems,
          originalAmount,
          discountAmount: discountResult.data.discountAmount,
          discountRate: discountResult.data.discountRate,
          savedAmount: discountResult.data.savedAmount,
          appliedRule: discountResult.data.rule,
        },
      };
    } catch (error) {
      this.logger.error(`预览价格计算失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从 DIY 套系创建订单
   */
  async createOrderFromDiyPackage(
    diyPackageId: number,
    data: {
      userOpenid: string;
      timeSlotId?: number;
      appointmentDate?: Date;
      childrenCount?: number;
      customerName?: string;
      notes?: string;
    }
  ) {
    this.logger.log(`从DIY套系创建订单: packageId=${diyPackageId}`);

    try {
      // 1. 查找 DIY 套系
      const diyPackage = await this.prisma.diyPackage.findUnique({
        where: { id: diyPackageId },
        include: { discountRule: true },
      });

      if (!diyPackage) {
        throw new NotFoundException(`DIY套系 ID=${diyPackageId} 不存在`);
      }

      // 2. 计算最终金额（原价 - 折扣）
      const finalAmount = Number(diyPackage.originalAmount) - Number(diyPackage.discountAmount);

      // 3. 调用订单服务创建订单
      const customerInfo = diyPackage.customerInfo as any;
      const orderData = {
        userOpenid: data.userOpenid,
        diyPackageId: diyPackageId,  // 使用 diyPackageId 字段
        packageId: null,  // DIY订单没有预定义套餐
        timeSlotId: data.timeSlotId,
        appointmentDate: data.appointmentDate,
        totalAmount: finalAmount,
        depositAmount: 0, // DIY 套系默认无定金，可根据业务需求调整
        childrenCount: data.childrenCount || 1,
        customerName: data.customerName || customerInfo?.name || '',
        notes: data.notes || `DIY套系订单: ${diyPackage.packageName}`,
      };

      const orderResult = await this.ordersService.create(orderData as any);

      this.logger.log(`从DIY套系创建订单成功: orderId=${orderResult.id}`);
      
      return {
        code: 200,
        message: '订单创建成功',
        data: {
          order: orderResult,
          diyPackage,
        },
      };
    } catch (error) {
      this.logger.error(`从DIY套系创建订单失败: ${error.message}`);
      throw error;
    }
  }
}
