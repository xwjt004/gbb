import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CheckinDto } from './dto/checkin.dto';
import { OrderStatusValidator } from '../../shared/validators/order-status.validator';
import { OrderStatus, PaymentStatus } from '../../shared/enums/status.enum';
// RefundStatus 已在其他地方定义
import { StatusChangeLogService } from '../../shared/services/status-change-log.service';
import { PackagesService } from '../packages/packages.service';
import { AutomationRulesService } from '../automation-rules/automation-rules.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private statusChangeLogService: StatusChangeLogService,
    private packagesService: PackagesService,
    private automationRulesService: AutomationRulesService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { userOpenid, packageId, diyPackageId, timeSlotId } = createOrderDto;

    console.log('创建订单请求数据:', JSON.stringify(createOrderDto, null, 2));

    // 检查用户是否存在 - 先尝试作为openid查找,再尝试作为id查找
    let user = await this.prisma.user.findUnique({
      where: { openid: userOpenid },
    });

    // 如果通过openid找不到,尝试通过id查找(管理后台可能传递的是用户ID)
    if (!user && !isNaN(Number(userOpenid))) {
      console.log('通过openid未找到用户,尝试通过ID查找:', userOpenid);
      user = await this.prisma.user.findUnique({
        where: { id: Number(userOpenid) },
      });
    }

    // 如果用户不存在,抛出异常(后端要求用户必须存在)
    if (!user) {
      console.error(`用户不存在: ${userOpenid}`);
      throw new NotFoundException(`User with identifier ${userOpenid} not found`);
    }

    console.log('找到用户:', user.id, user.nickname);

    // 检查套餐是否存在(只有当packageId存在时才检查)
    if (packageId) {
      const packageInfo = await this.prisma.package.findUnique({
        where: { id: packageId },
      });

      if (!packageInfo) {
        console.error(`套餐不存在: ${packageId}`);
        throw new NotFoundException(`Package with id ${packageId} not found`);
      }

      console.log('找到套餐:', packageInfo.id, packageInfo.name);
    }

    // 检查DIY套系是否存在(只有当diyPackageId存在时才检查)
    if (diyPackageId) {
      const diyPackageInfo = await this.prisma.diyPackage.findUnique({
        where: { id: diyPackageId },
      });

      if (!diyPackageInfo) {
        console.error(`DIY套系不存在: ${diyPackageId}`);
        throw new NotFoundException(`DiyPackage with id ${diyPackageId} not found`);
      }

      console.log('找到DIY套系:', diyPackageInfo.id, diyPackageInfo.packageName);
    }

    // 确保至少有一个套餐ID(普通套餐或DIY套系)
    if (!packageId && !diyPackageId) {
      throw new BadRequestException('必须提供套餐ID或DIY套系ID');
    }

    // 检查时间槽是否可用（如果提供了timeSlotId）
    let timeSlot: any = null;
    if (timeSlotId) {
      timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id: timeSlotId },
        include: {
          _count: {
            select: { orders: true }
          }
        }
      });

      if (!timeSlot) {
        console.error(`时间槽不存在: ${timeSlotId}`);
        throw new NotFoundException(`TimeSlot with id ${timeSlotId} not found`);
      }

      // 使用精确的容量管理：检查当前预订数量是否超过容量
      const currentBookedCount = timeSlot._count?.orders;
      if (currentBookedCount >= timeSlot.capacity) {
        console.error(`时间槽容量已满: ${timeSlotId}, 当前预订: ${currentBookedCount}, 最大容量: ${timeSlot.capacity}`);
        throw new BadRequestException(
          `时间槽容量已满，当前预订 ${currentBookedCount}/${timeSlot.capacity}`
        );
      }

      // 检查时间槽状态
      if (timeSlot.status === 'UNAVAILABLE') {
        console.error(`时间槽不可用: ${timeSlotId}`);
        throw new BadRequestException('时间槽当前不可用');
      }

      console.log('找到时间槽:', timeSlot.id, timeSlot.date, `容量: ${currentBookedCount}/${timeSlot.capacity}`);
    }

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 计算价格（使用定价引擎）
    let pricingInfo: Record<string, any> | null = null;
    const appointmentDate = createOrderDto.appointmentDate
      ? new Date(createOrderDto.appointmentDate)
      : timeSlot?.date || null;

    if (packageId && appointmentDate) {
      const calculated = await this.packagesService.calculatePrice(packageId, appointmentDate);
      pricingInfo = { ...calculated };
      // 应用时间槽的价格倍数
      if (timeSlot?.priceMultiplier && timeSlot.priceMultiplier !== 1) {
        pricingInfo.finalPrice = Math.round(pricingInfo.finalPrice * timeSlot.priceMultiplier * 100) / 100;
        pricingInfo.priceMultiplier = timeSlot.priceMultiplier;
      }
    }

    // 优先使用客户端传入的总额（管理员可自定义价格），否则使用定价引擎计算结果
    // 定价引擎结果仍保存在 paymentSummary 中用于参考
    const finalTotalAmount = createOrderDto.totalAmount || (pricingInfo?.finalPrice ?? 0);

    // 准备订单数据 - 修正字段映射
    const orderData: any = {
      orderNo,
      // 使用用户的数字ID而不是openid
      userId: user.id,
      packageId: packageId || null,
      diyPackageId: diyPackageId || null,
      totalAmount: finalTotalAmount,
      depositAmount: createOrderDto.depositAmount || 0,
      paidAmount: 0,
      paymentStatus: PaymentStatus.PENDING_PAYMENT,
      orderStatus: OrderStatus.PENDING,
      childrenCount: createOrderDto.childrenCount || 1,
      customerName: createOrderDto.customerName,
      customerPhone: createOrderDto.customerPhone,
      notes: createOrderDto.notes,
      couponId: createOrderDto.couponId || null,
      discountAmount: 0,
      wxUserId: createOrderDto.wxUserId || null,
      // 将用户的协议同意信息保存到独立列（已新增于 prisma schema）以及兼容地写入 paymentSummary
      agreementAccepted: !!createOrderDto.agreementAccepted,
      agreementVersion: createOrderDto.agreementVersion || null,
      agreementAcceptedAt: createOrderDto.agreementAcceptedAt ? new Date(createOrderDto.agreementAcceptedAt) : null,
      paymentSummary: {
        ...(createOrderDto.paymentSummary || {}),
        ...(pricingInfo ? {
          pricing: {
            basePrice: pricingInfo.basePrice,
            finalPrice: pricingInfo.finalPrice,
            appliedRule: pricingInfo.appliedRule,
            priceMultiplier: pricingInfo.priceMultiplier || 1,
          },
        } : {}),
        agreement: {
          accepted: !!createOrderDto.agreementAccepted,
          version: createOrderDto.agreementVersion || null,
          acceptedAt: createOrderDto.agreementAcceptedAt ? new Date(createOrderDto.agreementAcceptedAt) : null,
        },
      },
    };

    // 如果提供了时间槽，添加关联 - timeSlotId是必需的
    if (timeSlotId && timeSlot) {
      orderData.timeSlotId = timeSlotId;
    } else {
      console.error('timeSlotId是必需字段，但未提供或时间槽不存在');
      throw new BadRequestException('时间槽ID是必需的');
    }

    if (createOrderDto.appointmentDate) {
      orderData.appointmentDate = createOrderDto.appointmentDate;
    } else {
      // 如果没有提供预约日期，使用时间槽的日期
      if (timeSlot) {
        orderData.appointmentDate = timeSlot.date;
      } else {
        throw new BadRequestException('预约日期是必需的');
      }
    }

    console.log('准备创建的订单数据:', JSON.stringify(orderData, null, 2));

    try {
      // 使用事务确保数据一致性
      const result = await this.prisma.$transaction(async (prisma) => {
        // 创建订单
        const order = await prisma.order.create({
          data: orderData,
        });

        console.log('订单创建成功:', order.id);

        // 如果有时间槽，更新时间槽状态
        if (timeSlotId) {
          // 获取当前时间槽的实际预订数量
          const currentTimeSlot = await prisma.timeSlot.findUnique({
            where: { id: timeSlotId },
            include: {
              _count: {
                select: { orders: true }
              }
            }
          });

          if (currentTimeSlot) {
            const newBookedCount = currentTimeSlot._count?.orders;
            const isFullyBooked = newBookedCount >= currentTimeSlot.capacity;

            await prisma.timeSlot.update({
              where: { id: timeSlotId },
              data: {
                bookedCount: newBookedCount,
                availableCount: Math.max(0, currentTimeSlot.capacity - newBookedCount),
                isBooked: isFullyBooked,
                status: isFullyBooked ? 'BOOKED' : 'AVAILABLE'
              },
            });
            
            console.log(`时间槽状态已更新: 预订数量 ${newBookedCount}/${currentTimeSlot.capacity}, 状态: ${isFullyBooked ? 'BOOKED' : 'AVAILABLE'}`);
          }
        }

        // 如果有优惠券，核销并应用折扣
        if (createOrderDto.couponId) {
          const wxUserId = createOrderDto.wxUserId || order.wxUserId;
          if (wxUserId) {
            const couponResult = await this.redeemCouponInternal(
              prisma,
              createOrderDto.couponId,
              wxUserId,
              order.id,
              finalTotalAmount,
            );
            if (couponResult) {
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  discountAmount: couponResult.discountAmount,
                  totalAmount: couponResult.finalAmount,
                  paymentSummary: orderData.paymentSummary
                    ? { ...orderData.paymentSummary, coupon: couponResult }
                    : { coupon: couponResult },
                },
              });
            }
          }
        }

        return order;
      });

      return result;
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }

  async findAll(params?: { page?: number; pageSize?: number; [key: string]: any }) {
    const { page = 1, pageSize = 20, ...searchParams } = params || {};
    
    // 确保分页参数是数字类型
    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    
    // 构建查询条件
    const where: any = {};
    
    // 有效的枚举值列表
    const validOrderStatuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const validPaymentStatuses = ['PENDING_PAYMENT', 'PARTIAL_PAID', 'FULLY_PAID', 'REFUNDING', 'PARTIAL_REFUNDED', 'REFUNDED', 'CANCELLED'];

    // 如果有搜索参数，添加相应的过滤条件（仅当值是有效的枚举值时）
    if (searchParams.orderStatus && validOrderStatuses.includes(searchParams.orderStatus)) {
      where.orderStatus = searchParams.orderStatus;
    }
    if (searchParams.status) {
      if (validOrderStatuses.includes(searchParams.status)) {
        where.orderStatus = searchParams.status;
      } else if (searchParams.status === 'REFUNDED') {
        // REFUNDED 是支付状态，非订单状态
        where.paymentStatus = 'REFUNDED';
      }
    }
    if (searchParams.paymentStatus && validPaymentStatuses.includes(searchParams.paymentStatus)) {
      where.paymentStatus = searchParams.paymentStatus;
    }
    if (searchParams.userId) {
      where.userId = Number(searchParams.userId);
    }
    if (searchParams.packageId) {
      where.packageId = Number(searchParams.packageId);
    }
    
    // 关键字搜索：支持订单号、客户手机、客户姓名和用户信息
    if (searchParams.keyword) {
      where.OR = [
        {
          orderNo: {
            contains: searchParams.keyword,
            mode: 'insensitive',
          },
        },
        {
          customerPhone: {
            contains: searchParams.keyword,
            mode: 'insensitive',
          },
        },
        {
          customerName: {
            contains: searchParams.keyword,
            mode: 'insensitive',
          },
        },
        {
          user: {
            phone: {
              contains: searchParams.keyword,
              mode: 'insensitive',
            },
          },
        },
        {
          user: {
            nickname: {
              contains: searchParams.keyword,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // 单独的订单号搜索
    if (searchParams.orderNo && !searchParams.keyword) {
      where.orderNo = {
        contains: searchParams.orderNo,
        mode: 'insensitive',
      };
    }

    // 单独的手机号搜索
    if (searchParams.phone && !searchParams.keyword) {
      where.OR = [
        { customerPhone: { contains: searchParams.phone, mode: 'insensitive' } },
        { user: { phone: { contains: searchParams.phone, mode: 'insensitive' } } },
      ];
    }
    
    // 日期范围搜索
    if (searchParams.startDate || searchParams.endDate) {
      where.createdAt = {};
      if (searchParams.startDate) {
        where.createdAt.gte = new Date(searchParams.startDate);
      }
      if (searchParams.endDate) {
        where.createdAt.lte = new Date(searchParams.endDate);
      }
    }
    
    // 计算分页参数
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;
    
    // 获取总数
    const total = await this.prisma.order.count({ where });
    
    // 获取分页数据
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: true,
        package: true,
        diyPackage: true,
        timeSlot: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    return {
      list: orders,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        total,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        package: true,
        diyPackage: true,
        timeSlot: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    return order;
  }

  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: true,
        package: true,
        diyPackage: true,
        timeSlot: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with order number ${orderNo} not found`,
      );
    }

    return order;
  }

  // 为用户查找订单
  async findByUserOpenid(userOpenid: string) {
    return await this.prisma.order.findMany({
      where: {
        user: {
          openid: userOpenid,
        },
      },
      include: {
        package: true,
        diyPackage: true,
        timeSlot: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    // 首先检查订单是否存在
    const existingOrder = await this.findOne(id);

    // 准备状态变更日志记录
    const statusChangeLogs: Array<{
      orderId: string;
      fieldName: 'orderStatus' | 'paymentStatus';
      oldValue: string;
      newValue: string;
      operator: string;
      reason: string;
    }> = [];

    // 使用事务处理时间槽变更
    const result = await this.prisma.$transaction(async (prisma) => {
      // 如果更新了时间槽，需要处理旧的和新的时间槽状态
      if (
        updateOrderDto.timeSlotId &&
        updateOrderDto.timeSlotId !== existingOrder.timeSlotId
      ) {
        // 检查新的时间槽是否可用
        const newTimeSlot = await prisma.timeSlot.findUnique({
          where: { id: updateOrderDto.timeSlotId },
          include: {
            _count: {
              select: { orders: true }
            }
          }
        });

        if (!newTimeSlot) {
          throw new NotFoundException(
            `TimeSlot with id ${updateOrderDto.timeSlotId} not found`,
          );
        }

        // 检查新时间槽容量
        const currentBookedCount = newTimeSlot._count?.orders;
        if (currentBookedCount >= newTimeSlot.capacity) {
          throw new BadRequestException(
            `时间槽容量已满，当前预订 ${currentBookedCount}/${newTimeSlot.capacity}`
          );
        }

        // 检查新时间槽状态
        if (newTimeSlot.status === 'UNAVAILABLE') {
          throw new BadRequestException('时间槽当前不可用');
        }

        // 释放旧的时间槽（如果存在）
        if (existingOrder.timeSlotId) {
          const oldTimeSlot = await prisma.timeSlot.findUnique({
            where: { id: existingOrder.timeSlotId },
            include: {
              _count: {
                select: { orders: true }
              }
            }
          });

          if (oldTimeSlot) {
            const oldNewBookedCount = Math.max(0, oldTimeSlot._count?.orders - 1);
            const oldIsFullyBooked = oldNewBookedCount >= oldTimeSlot.capacity;

            await prisma.timeSlot.update({
              where: { id: existingOrder.timeSlotId },
              data: {
                bookedCount: oldNewBookedCount,
                availableCount: Math.max(0, oldTimeSlot.capacity - oldNewBookedCount),
                isBooked: oldIsFullyBooked,
                status: oldIsFullyBooked ? 'BOOKED' : 'AVAILABLE'
              },
            });
          }
        }

        // 预订新的时间槽
        const newNewBookedCount = currentBookedCount + 1;
        const newIsFullyBooked = newNewBookedCount >= newTimeSlot.capacity;

        await prisma.timeSlot.update({
          where: { id: updateOrderDto.timeSlotId },
          data: {
            bookedCount: newNewBookedCount,
            availableCount: Math.max(0, newTimeSlot.capacity - newNewBookedCount),
            isBooked: newIsFullyBooked,
            status: newIsFullyBooked ? 'BOOKED' : 'AVAILABLE'
          },
        });
      }

      // 准备更新数据
      const updateData: any = {};

      // 状态验证
      let newOrderStatus = existingOrder.orderStatus;
      let newPaymentStatus = existingOrder.paymentStatus;

      if (updateOrderDto.orderStatus !== undefined) {
        newOrderStatus = updateOrderDto.orderStatus as any;
        updateData.orderStatus = updateOrderDto.orderStatus as any;
      }
      if (updateOrderDto.paymentStatus !== undefined) {
        newPaymentStatus = updateOrderDto.paymentStatus as any;
        updateData.paymentStatus = updateOrderDto.paymentStatus as any;
      }

      // 验证状态组合是否有效
      OrderStatusValidator.validateAndThrow(
        newOrderStatus as OrderStatus,
        newPaymentStatus as PaymentStatus,
        id
      );

      // 验证状态转换是否允许
      const currentOrderStatus = existingOrder.orderStatus as OrderStatus;
      const currentPaymentStatus = existingOrder.paymentStatus as PaymentStatus;
      
      if (!OrderStatusValidator.isValidTransition(
        currentOrderStatus,
        currentPaymentStatus,
        newOrderStatus as OrderStatus,
        newPaymentStatus as PaymentStatus
      )) {
        throw new BadRequestException(
          `不允许的状态转换: ${OrderStatusValidator.getStatusCombinationDescription(currentOrderStatus, currentPaymentStatus)} → ${OrderStatusValidator.getStatusCombinationDescription(newOrderStatus as OrderStatus, newPaymentStatus as PaymentStatus)}`
        );
      }

      // 记录状态变更信息  
      if (updateOrderDto.orderStatus !== undefined && updateOrderDto.orderStatus !== existingOrder.orderStatus) {
        statusChangeLogs.push({
          orderId: id,
          fieldName: 'orderStatus',
          oldValue: existingOrder.orderStatus,
          newValue: updateOrderDto.orderStatus,
          operator: updateOrderDto.operator || 'system',
          reason: updateOrderDto.reason || '管理员操作',
        });
      }
      if (updateOrderDto.paymentStatus !== undefined && updateOrderDto.paymentStatus !== existingOrder.paymentStatus) {
        statusChangeLogs.push({
          orderId: id,
          fieldName: 'paymentStatus',
          oldValue: existingOrder.paymentStatus,
          newValue: updateOrderDto.paymentStatus,
          operator: updateOrderDto.operator || 'system',
          reason: updateOrderDto.reason || '管理员操作',
        });
      }
      if (updateOrderDto.notes !== undefined) {
        updateData.notes = updateOrderDto.notes;
      }
      if (updateOrderDto.appointmentDate !== undefined) {
        updateData.appointmentDate = new Date(updateOrderDto.appointmentDate);
      }
      if (updateOrderDto.totalAmount !== undefined) {
        updateData.totalAmount = updateOrderDto.totalAmount;
      }
      if (updateOrderDto.depositAmount !== undefined) {
        updateData.depositAmount = updateOrderDto.depositAmount;
      }
      if (updateOrderDto.paidAmount !== undefined) {
        updateData.paidAmount = updateOrderDto.paidAmount;
      }
      if (updateOrderDto.childrenCount !== undefined) {
        updateData.childrenCount = updateOrderDto.childrenCount;
      }
      if (updateOrderDto.customerName !== undefined) {
        updateData.customerName = updateOrderDto.customerName;
      }
      if (updateOrderDto.customerPhone !== undefined) {
        updateData.customerPhone = updateOrderDto.customerPhone;
      }
      if (updateOrderDto.timeSlotId !== undefined) {
        updateData.timeSlotId = updateOrderDto.timeSlotId;
      }

      // 更新订单
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          package: true,
          timeSlot: true,
          payments: true,
        },
      });

      return updatedOrder;
    });

    // 在事务成功后记录状态变更日志
    if (statusChangeLogs.length > 0) {
      // 使用 Promise.all 并发记录日志，不阻塞响应
      Promise.all(
        statusChangeLogs.map(log => 
          this.statusChangeLogService.logStatusChange(log)
        )
      ).catch(error => {
        console.error('记录状态变更日志失败:', error);
      });
    }

    return result;
  }

  async findByPhone(phone: string) {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          user: {
            phone: phone,
          },
        },
        include: {
          user: true,
          package: true,
          timeSlot: true,
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return orders;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to find orders by phone: ${errorMessage}`,
      );
    }
  }

  async findByPaymentStatus(paymentStatus: string) {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          paymentStatus: paymentStatus as any,
        },
        include: {
          user: true,
          package: true,
          timeSlot: true,
          payments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 统计信息
      const totalOrders = orders.length;
      const totalAmount = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0,
      );
      const totalPaidAmount = orders.reduce(
        (sum, order) => sum + Number(order.paidAmount),
        0,
      );

      return {
        orders,
        statistics: {
          totalOrders,
          totalAmount,
          totalPaidAmount,
          paymentStatus,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to find orders by payment status: ${errorMessage}`,
      );
    }
  }

  async getStats() {
    try {
      // 获取订单总数
      const totalOrders = await this.prisma.order.count();

      // 获取各种状态的订单数量
      const [pendingOrders, paidOrders, cancelledOrders, completedOrders] = await Promise.all([
        this.prisma.order.count({ where: { orderStatus: OrderStatus.PENDING } }),
        this.prisma.order.count({ where: { orderStatus: OrderStatus.COMPLETED } }),
        this.prisma.order.count({ where: { orderStatus: OrderStatus.CANCELLED } }),
        this.prisma.order.count({ where: { orderStatus: OrderStatus.COMPLETED } }),
      ]);

      // 获取总收入
      const totalRevenue = await this.prisma.order.aggregate({
        where: { orderStatus: { not: OrderStatus.CANCELLED } },
        _sum: { totalAmount: true },
      });

      // 获取已支付金额
      const paidAmount = await this.prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.FULLY_PAID },
        _sum: { paidAmount: true },
      });

      // 获取今日订单数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayOrders = await this.prisma.order.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      // 计算转化率（完成订单 / 总订单）
      const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      return {
        totalOrders,
        pendingOrders,
        confirmedOrders: paidOrders, // 确认订单等同于已支付
        completedOrders,
        cancelledOrders,
        totalRevenue: totalRevenue._sum?.totalAmount || 0,
        paidAmount: paidAmount._sum?.paidAmount || 0,
        todayOrders,
        conversionRate,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to get order statistics: ${errorMessage}`,
      );
    }
  }

  async getOrderTrends(period?: string, startDateParam?: string, endDateParam?: string): Promise<Array<{ date: string; orders: number; revenue: number }>> {
    try {
      let startDate: Date;
      let endDate: Date;
      
      // 如果提供了具体的日期参数,使用它们
      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // 否则使用period参数
        // 获取当前本地日期（不受时区影响）
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 计算开始日期
        let daysToSubtract = 6; // 默认7天（包括今天）
        switch (period) {
          case '7d':
            daysToSubtract = 6;
            break;
          case '30d':
            daysToSubtract = 29;
            break;
          case '90d':
            daysToSubtract = 89;
            break;
          default:
            daysToSubtract = 6;
        }
        
        startDate = new Date(today);
        startDate.setDate(today.getDate() - daysToSubtract);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('[OrderTrends] Period:', period);
      console.log('[OrderTrends] Date Range:', startDateParam && endDateParam ? 'Custom' : period);
      console.log('[OrderTrends] Start Date:', startDate.toISOString());
      console.log('[OrderTrends] End Date:', endDate.toISOString());

      // 生成日期数组(包括今天)
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // 使用本地时间格式化日期,避免时区转换问题
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        dates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }      console.log('[OrderTrends] Generated dates:', dates);
      console.log('[OrderTrends] Date count:', dates.length);

      // 获取期间内的所有订单
      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          orderStatus: { not: 'CANCELLED' }, // 排除取消的订单
        },
        select: {
          createdAt: true,
          totalAmount: true,
        },
      });

      console.log('[OrderTrends] Found orders:', orders.length);

      // 将数据按日期聚合
      const trendData: { [key: string]: { orders: number; revenue: number } } = {};
      
      // 初始化所有日期为0
      dates.forEach(date => {
        trendData[date] = { orders: 0, revenue: 0 };
      });

      // 填充实际数据 - 按日期分组统计
      orders.forEach(order => {
        // 使用本地时间格式化日期,避免时区转换问题
        const orderDate = order.createdAt;
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        const day = String(orderDate.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        if (trendData[date]) {
          trendData[date].orders += 1;
          trendData[date].revenue += Number(order.totalAmount || 0);
        }
      });

      // 转换为数组格式
      const result = dates.map(date => ({
        date,
        orders: trendData[date].orders,
        revenue: trendData[date].revenue,
      }));

      console.log('[OrderTrends] Result summary:', result.map(r => `${r.date}: ${r.orders} orders`).join(', '));

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to get order trends: ${errorMessage}`,
      );
    }
  }

  // 获取未来订单趋势(基于预约时间)
  async getFutureOrderTrends(period?: string, startDateParam?: string, endDateParam?: string): Promise<Array<{ date: string; orders: number; revenue: number }>> {
    try {
      let startDate: Date;
      let endDate: Date;
      
      // 如果提供了具体的日期参数,使用它们
      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // 否则使用period参数
        // 获取当前本地日期
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 计算未来的天数
        let daysToAdd = 6; // 默认7天(包括今天)
        switch (period) {
          case '7d':
            daysToAdd = 6;
            break;
          case '30d':
            daysToAdd = 29;
            break;
          case '90d':
            daysToAdd = 89;
            break;
          default:
            daysToAdd = 6;
        }
        
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(today);
        endDate.setDate(today.getDate() + daysToAdd);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('[FutureOrderTrends] Period:', period);
      console.log('[FutureOrderTrends] Date Range:', startDateParam && endDateParam ? 'Custom' : period);
      console.log('[FutureOrderTrends] Start Date:', startDate.toISOString());
      console.log('[FutureOrderTrends] End Date:', endDate.toISOString());

      // 生成日期数组(从今天到未来)
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        dates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[FutureOrderTrends] Generated dates:', dates);
      console.log('[FutureOrderTrends] Date count:', dates.length);

      // 获取期间内有预约的订单(使用订单的appointmentDate字段)
      const orders = await this.prisma.order.findMany({
        where: {
          orderStatus: { not: 'CANCELLED' }, // 只排除已取消的订单
          appointmentDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          totalAmount: true,
          orderStatus: true,
          appointmentDate: true,
        },
      });

      console.log('[FutureOrderTrends] Found future orders:', orders.length);
      console.log('[FutureOrderTrends] Order details:', 
        orders.map(o => ({
          amount: o.totalAmount.toString(),
          status: o.orderStatus,
          appointmentDate: o.appointmentDate,
        }))
      );

      // 将数据按日期聚合
      const trendData: { [key: string]: { orders: number; revenue: number } } = {};
      
      // 初始化所有日期为0
      dates.forEach(date => {
        trendData[date] = { orders: 0, revenue: 0 };
      });

      // 填充实际数据 - 按预约日期分组统计
      orders.forEach(order => {
        if (order.appointmentDate) {
          const appointmentDate = order.appointmentDate;
          const year = appointmentDate.getFullYear();
          const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
          const day = String(appointmentDate.getDate()).padStart(2, '0');
          const date = `${year}-${month}-${day}`;
          
          if (trendData[date]) {
            trendData[date].orders += 1;
            trendData[date].revenue += Number(order.totalAmount || 0);
          }
        }
      });

      // 转换为数组格式
      const result = dates.map(date => ({
        date,
        orders: trendData[date].orders,
        revenue: trendData[date].revenue,
      }));

      console.log('[FutureOrderTrends] Result summary:', result.map(r => `${r.date}: ${r.orders} orders`).join(', '));

      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to get future order trends: ${errorMessage}`,
      );
    }
  }

  async cancelOrder(id: string, reason?: string) {
    // 检查订单是否存在
    const existingOrder = await this.findOne(id);

    // 检查订单是否可以取消
    if (existingOrder.orderStatus === 'COMPLETED') {
      throw new BadRequestException('已完成的订单不能取消');
    }
    if (existingOrder.orderStatus === 'CANCELLED') {
      throw new BadRequestException('订单已经被取消');
    }

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (prisma) => {
      // 释放时间槽（如果有）
      if (existingOrder.timeSlotId) {
        // 获取当前时间槽信息
        const currentTimeSlot = await prisma.timeSlot.findUnique({
          where: { id: existingOrder.timeSlotId },
          include: {
            _count: {
              select: { orders: true }
            }
          }
        });

        if (currentTimeSlot) {
          // 计算取消订单后的预订数量（减1）
          const newBookedCount = Math.max(0, currentTimeSlot._count?.orders - 1);
          const isFullyBooked = newBookedCount >= currentTimeSlot.capacity;

          await prisma.timeSlot.update({
            where: { id: existingOrder.timeSlotId },
            data: {
              bookedCount: newBookedCount,
              availableCount: Math.max(0, currentTimeSlot.capacity - newBookedCount),
              isBooked: isFullyBooked,
              status: isFullyBooked ? 'BOOKED' : 'AVAILABLE'
            },
          });
        }
      }

      // 更新订单状态
      const cancelledOrder = await prisma.order.update({
        where: { id },
        data: { 
          orderStatus: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          notes: reason ? `${existingOrder.notes || ''}\n取消原因: ${reason}`.trim() : existingOrder.notes
        },
        include: {
          user: true,
          package: true,
          timeSlot: true,
          payments: true,
        },
      });

      return cancelledOrder;
    });

    return result;
  }

  async confirmOrder(id: string) {
    // 检查订单是否存在
    const existingOrder = await this.findOne(id);

    // 检查订单是否可以确认
    if (existingOrder.orderStatus !== 'PENDING') {
      throw new BadRequestException('只有待确认的订单才能确认');
    }

    // 更新订单状态
    const confirmedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        orderStatus: 'CONFIRMED'
      },
      include: {
        user: true,
        package: true,
        timeSlot: true,
        payments: true,
        wxUser: true,
      },
    });

    this.automationRulesService.evaluate('APPOINTMENT_CONFIRMED', { order: confirmedOrder, wxUser: confirmedOrder.wxUser })
      .catch((err: Error) => console.error('自动化规则执行失败', err));

    return confirmedOrder;
  }

  async completeOrder(id: string) {
    // 检查订单是否存在
    const existingOrder = await this.findOne(id);

    // 检查订单是否可以完成（待确认、已确认、进行中的订单都可以完成）
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(existingOrder.orderStatus)) {
      throw new BadRequestException(
        `订单状态为 ${existingOrder.orderStatus}，无法完成。只有待确认、已确认或进行中的订单才能完成。`
      );
    }

    // 校验支付状态：未支付订单不可完成（先付款后付货）
    if (existingOrder.paymentStatus === 'PENDING_PAYMENT') {
      throw new BadRequestException(
        `订单 ${existingOrder.orderNo} 尚未支付，无法完成。请先确认收款后再操作。`
      );
    }

    // 更新订单状态
    const completedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        orderStatus: OrderStatus.COMPLETED,
        completedAt: new Date(),
        // 订单完成视为客户已到场，自动标记签到
        checkinStatus: 'CHECKED_IN',
        checkinTime: new Date(),
      },
      include: {
        user: true,
        package: true,
        timeSlot: true,
        payments: true,
        wxUser: true,
      },
    });

    // 触发自动化规则（不阻塞主流程）
    this.automationRulesService.evaluate('ORDER_COMPLETED', { order: completedOrder, wxUser: completedOrder.wxUser })
      .catch((err: Error) => console.error('自动化规则执行失败', err));

    return completedOrder;
  }

  async batchOperate(operation: string, orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('请选择要操作的订单');
    }

    const results: Array<{ orderId: string; success: boolean; data?: any }> = [];
    const errors: Array<{ orderId: string; success: boolean; error: string }> = [];

    for (const orderId of orderIds) {
      try {
        let result;
        switch (operation) {
          case 'cancel':
            result = await this.cancelOrder(orderId, '批量取消操作');
            break;
          case 'confirm':
            result = await this.confirmOrder(orderId);
            break;
          case 'complete':
            result = await this.completeOrder(orderId);
            break;
          default:
            throw new BadRequestException(`不支持的操作: ${operation}`);
        }
        results.push({ orderId, success: true, data: result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ orderId, success: false, error: errorMessage });
      }
    }

    return {
      success: errors.length === 0,
      totalCount: orderIds.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  async deleteOrder(id: string) {
    // 检查订单是否存在
    const existingOrder = await this.findOne(id);

    // 检查订单状态，只允许删除已取消的订单
    if (existingOrder.orderStatus !== 'CANCELLED') {
      throw new BadRequestException('只有已取消的订单才能删除');
    }

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (prisma) => {
      // 释放时间槽（如果有）
      if (existingOrder.timeSlotId) {
        // 获取当前时间槽信息
        const currentTimeSlot = await prisma.timeSlot.findUnique({
          where: { id: existingOrder.timeSlotId },
          include: {
            _count: {
              select: { orders: true }
            }
          }
        });

        if (currentTimeSlot) {
          // 计算删除订单后的预订数量（减1）
          const newBookedCount = Math.max(0, currentTimeSlot._count?.orders - 1);
          const isFullyBooked = newBookedCount >= currentTimeSlot.capacity;

          await prisma.timeSlot.update({
            where: { id: existingOrder.timeSlotId },
            data: {
              bookedCount: newBookedCount,
              availableCount: Math.max(0, currentTimeSlot.capacity - newBookedCount),
              isBooked: isFullyBooked,
              status: isFullyBooked ? 'BOOKED' : 'AVAILABLE'
            },
          });
        }
      }

      // 删除相关的支付记录
      await prisma.payment.deleteMany({
        where: { orderId: id },
      });

      // 删除状态变更日志
      await prisma.statusChangeLog.deleteMany({
        where: { orderId: id },
      });

      // 删除订单
      const deletedOrder = await prisma.order.delete({
        where: { id },
      });

      return deletedOrder;
    });

    return result;
  }

  async checkin(orderId: string, dto: CheckinDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { timeSlot: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.checkinStatus === 'CHECKED_IN') {
      throw new BadRequestException('该订单已签到');
    }
    if (order.checkinStatus === 'NO_SHOW') {
      throw new BadRequestException('该订单已标记为缺席');
    }

    return this.prisma.$transaction(async (prisma) => {
      if (dto.status === 'NO_SHOW' && order.timeSlotId) {
        const ts = order.timeSlot;
        if (ts) {
          const newBooked = Math.max(0, ts.bookedCount - 1);
          await prisma.timeSlot.update({
            where: { id: order.timeSlotId },
            data: {
              bookedCount: newBooked,
              availableCount: Math.max(0, ts.capacity - newBooked),
              isBooked: newBooked > 0,
            },
          });
        }
      }

      return prisma.order.update({
        where: { id: orderId },
        data: {
          checkinStatus: dto.status,
          checkinTime: dto.status === 'CHECKED_IN' ? new Date() : null,
        },
        select: { id: true, orderNo: true, checkinStatus: true, checkinTime: true },
      });
    });
  }

  async getScheduleBoardRange(startDate: string, endDate: string, photographerId?: number) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      appointmentDate: { gte: start, lte: end },
      orderStatus: { notIn: ['CANCELLED', 'REJECTED'] },
    };
    if (photographerId) where.photographerId = photographerId;

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        timeSlot: true,
        wxUser: { select: { nickname: true, phone: true, avatar: true } },
        package: { select: { name: true } },
        photographer: { select: { id: true, nickname: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    // Group by timeSlot for a timeline view
    const grouped: Record<number, { timeSlot: any; orders: any[] }> = {};
    for (const order of orders) {
      const slotId = order.timeSlotId || 0;
      if (!grouped[slotId]) {
        grouped[slotId] = { timeSlot: order.timeSlot, orders: [] };
      }
      grouped[slotId].orders.push(order);
    }

    return Object.values(grouped).sort((a, b) => {
      const aTime = a.timeSlot?.startTime?.getTime?.() || 0;
      const bTime = b.timeSlot?.startTime?.getTime?.() || 0;
      return aTime - bTime;
    });
  }

  async getScheduleBoard(date: string, photographerId?: number) {
    return this.getScheduleBoardRange(date, date, photographerId);
  }

  async assignPhotographer(orderId: string, photographerId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const photographer = await this.prisma.user.findUnique({ where: { id: photographerId } });
    if (!photographer) throw new NotFoundException('Photographer not found');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { photographerId },
      select: { id: true, orderNo: true, photographerId: true },
    });
  }

  async batchAssignPhotographer(orderIds: string[], photographerId: number) {
    const photographer = await this.prisma.user.findUnique({ where: { id: photographerId } });
    if (!photographer) throw new NotFoundException('Photographer not found');

    const result = await this.prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { photographerId },
    });
    return { updated: result.count };
  }

  async rescheduleOrder(orderId: string, timeSlotId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, timeSlotId: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const newSlot = await this.prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
    });
    if (!newSlot) throw new NotFoundException('TimeSlot not found');

    if (newSlot.bookedCount >= newSlot.capacity) {
      throw new BadRequestException('TimeSlot is fully booked');
    }

    return this.prisma.$transaction(async (tx) => {
      // Release old slot
      if (order.timeSlotId) {
        await tx.timeSlot.update({
          where: { id: order.timeSlotId },
          data: { bookedCount: { decrement: 1 }, isBooked: false },
        });
      }

      // Book new slot
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: { bookedCount: { increment: 1 }, isBooked: true },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { timeSlotId, appointmentDate: newSlot.date },
        select: { id: true, orderNo: true, timeSlotId: true, appointmentDate: true },
      });
    });
  }

  private generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD${year}${month}${day}${random}`;
  }

  /**
   * 获取订单资金流趋势
   * @param startDateParam 开始日期 YYYY-MM-DD
   * @param endDateParam 结束日期 YYYY-MM-DD
   * @returns 每日资金流数据: 订单金额、已收款、未收款、申请退款、已退款
   */
  async getCashFlowTrends(
    startDateParam: string,
    endDateParam: string
  ): Promise<Array<{
    date: string;
    totalAmount: number;      // 订单总金额
    paidAmount: number;        // 已收款金额
    unpaidAmount: number;      // 未收款金额
    refundRequested: number;   // 申请退款金额
    refundCompleted: number;   // 已退款金额
  }>> {
    try {
      // 解析日期参数
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);

      console.log('[CashFlowTrends] Start Date:', startDate.toISOString());
      console.log('[CashFlowTrends] End Date:', endDate.toISOString());

      // 生成日期数组
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log('[CashFlowTrends] Generated dates:', dates);
      console.log('[CashFlowTrends] Date count:', dates.length);

      // 查询所有订单及其支付记录（按预约时间筛选）
      const orders = await this.prisma.order.findMany({
        where: {
          appointmentDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          payments: true,
        },
      });

      console.log('[CashFlowTrends] Found orders:', orders.length);

      // 查询所有退款申请
      const refundRequests = await this.prisma.refundRequest.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      console.log('[CashFlowTrends] Found refund requests:', refundRequests.length);

      // 按日期聚合资金流数据
      const cashFlowMap = new Map<string, {
        totalAmount: number;
        paidAmount: number;
        unpaidAmount: number;
        refundRequested: number;
        refundCompleted: number;
      }>();

      // 初始化所有日期为0
      dates.forEach(date => {
        cashFlowMap.set(date, {
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          refundRequested: 0,
          refundCompleted: 0,
        });
      });

      // 统计每个订单的资金数据（按预约日期）
      orders.forEach(order => {
        // 使用预约日期而不是创建日期
        const orderDate = order.appointmentDate ? new Date(order.appointmentDate) : new Date(order.createdAt);
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        const day = String(orderDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (cashFlowMap.has(dateKey)) {
          const data = cashFlowMap.get(dateKey)!;
          const totalAmt = Number(order.totalAmount) || 0;
          const paidAmt = Number(order.paidAmount) || 0;

          // 订单总金额
          data.totalAmount += totalAmt;

          // 已收款金额 - 从订单的 paidAmount 字段获取
          data.paidAmount += paidAmt;

          // 未收款金额 = 总金额 - 已收款（不能为负数）
          data.unpaidAmount += Math.max(0, totalAmt - paidAmt);

          // 统计已退款金额（使用订单的 refundedAmount 字段）
          data.refundCompleted += Number(order.refundedAmount) || 0;
        }
      });

      // 统计退款申请金额（按退款创建日期）
      refundRequests.forEach(refund => {
        const refundDate = new Date(refund.createdAt);
        const year = refundDate.getFullYear();
        const month = String(refundDate.getMonth() + 1).padStart(2, '0');
        const day = String(refundDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (cashFlowMap.has(dateKey)) {
          const data = cashFlowMap.get(dateKey)!;

          // 申请退款金额
          data.refundRequested += Number(refund.refundAmount) || 0;
        }
      });

      // 转换为结果数组
      const result = dates.map(date => ({
        date,
        totalAmount: cashFlowMap.get(date)?.totalAmount || 0,
        paidAmount: cashFlowMap.get(date)?.paidAmount || 0,
        unpaidAmount: cashFlowMap.get(date)?.unpaidAmount || 0,
        refundRequested: cashFlowMap.get(date)?.refundRequested || 0,
        refundCompleted: cashFlowMap.get(date)?.refundCompleted || 0,
      }));

      console.log('[CashFlowTrends] Result summary:', 
        result.map(r => `${r.date}: 总额${r.totalAmount}, 已收${r.paidAmount}, 未收${r.unpaidAmount}`).join(', ')
      );

      return result;
    } catch (error) {
      console.error('获取订单资金流趋势失败:', error);
      throw error;
    }
  }

  /**
   * 更换套餐（升级/降级）
   */
  async changePackage(orderId: string, dto: { newPackageId: number; reason?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('订单不存在');

    const newPackage = await this.prisma.package.findUnique({ where: { id: dto.newPackageId } });
    if (!newPackage) throw new NotFoundException('新套餐不存在');

    const paidAmount = Number(order.paidAmount);
    const appointmentDate = order.appointmentDate || new Date();
    const pricing = await this.packagesService.calculatePrice(dto.newPackageId, appointmentDate);
    const newTotalAmount = pricing.finalPrice;
    const priceDiff = Math.round((newTotalAmount - paidAmount) * 100) / 100;

    const result = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          packageId: dto.newPackageId,
          totalAmount: newTotalAmount,
          paymentSummary: order.paymentSummary
            ? { ...(order.paymentSummary as any), packageChange: { oldPackageId: order.packageId, newPackageId: dto.newPackageId, priceDiff, reason: dto.reason } }
            : { packageChange: { oldPackageId: order.packageId, newPackageId: dto.newPackageId, priceDiff, reason: dto.reason } },
        },
      });

      if (priceDiff > 0) {
        await prisma.payment.create({
          data: {
            orderId,
            amount: priceDiff,
            paymentType: 'FULL',
            paymentMethod: 'WECHAT_PAY',
            status: 'PENDING_PAYMENT',
            notes: `升级套餐补差价: ¥${priceDiff}`,
          },
        });
      } else if (priceDiff < 0) {
        await prisma.refund.create({
          data: {
            refundRequestId: '',
            orderId,
            originalPaymentId: '',
            refundAmount: Math.abs(priceDiff),
            refundType: 'PARTIAL',
            refundMethod: 'ORIGINAL',
            notes: `降级套餐退差价: ¥${Math.abs(priceDiff)}`,
          },
        });
      }

      return updated;
    });

    return { code: 200, message: priceDiff > 0 ? '升级成功，需补差价' : priceDiff < 0 ? '降级成功，将退还差价' : '套餐更换成功', data: result };
  }

  /**
   * 核销优惠券并计算折扣
   */
  private async redeemCouponInternal(
    prisma: any,
    couponId: string,
    wxUserId: string,
    orderId: string,
    totalAmount: number,
  ) {
    // 查找用户优惠券记录
    const userCoupon = await prisma.userCoupon.findFirst({
      where: { wxUserId, couponId, status: 'UNUSED' },
      include: { coupon: true },
    });

    if (!userCoupon) throw new BadRequestException('优惠券不存在或已使用');
    if (new Date() > userCoupon.expiredAt) throw new BadRequestException('优惠券已过期');

    const coupon = userCoupon.coupon;
    if (coupon.status !== 'ACTIVE') throw new BadRequestException('优惠券已失效');
    if (new Date() < coupon.startTime) throw new BadRequestException('优惠券尚未生效');
    if (new Date() > coupon.endTime) throw new BadRequestException('优惠券已过期');

    // 检查最低消费
    const minAmount = coupon.minAmount ? Number(coupon.minAmount) : 0;
    if (totalAmount < minAmount) {
      throw new BadRequestException(`订单金额未达到最低消费 ¥${minAmount}`);
    }

    // 计算折扣金额
    let discountAmount = 0;
    const discountValue = Number(coupon.discountValue);
    if (coupon.discountType === 'PERCENT') {
      discountAmount = (totalAmount * discountValue) / 100;
      const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      discountAmount = discountValue;
    }

    discountAmount = Math.min(discountAmount, totalAmount);
    const finalAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
    discountAmount = Math.round(discountAmount * 100) / 100;

    // 标记用户优惠券为已使用
    await prisma.userCoupon.update({
      where: { id: userCoupon.id },
      data: { status: 'USED', usedAt: new Date(), orderId },
    });

    // 更新优惠券使用计数
    await prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });

    return { discountAmount, finalAmount, couponName: coupon.couponName, discountType: coupon.discountType };
  }

  /**
   * 为订单应用优惠券
   */
  async applyCoupon(orderId: string, dto: { couponId: string; wxUserId?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');

    const wxUserId = dto.wxUserId || order.wxUserId;
    if (!wxUserId) throw new BadRequestException('无法确定微信用户');

    const result = await this.prisma.$transaction(async (prisma) => {
      const couponResult = await this.redeemCouponInternal(
        prisma,
        dto.couponId,
        wxUserId,
        orderId,
        Number(order.totalAmount),
      );

      return prisma.order.update({
        where: { id: orderId },
        data: {
          couponId: dto.couponId,
          discountAmount: couponResult.discountAmount,
          totalAmount: couponResult.finalAmount,
          paymentSummary: order.paymentSummary
            ? { ...(order.paymentSummary as any), coupon: couponResult }
            : { coupon: couponResult },
        },
      });
    });

    return { code: 200, message: '优惠券应用成功', data: result };
  }
}
