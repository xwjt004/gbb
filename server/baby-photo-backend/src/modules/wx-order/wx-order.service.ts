import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWxOrderDto, QueryMyOrdersDto } from './dto/create-wx-order.dto';
import { Prisma } from '@prisma/client';
import { PaymentStatus } from '../../shared/enums/status.enum';

@Injectable()
export class WxOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建订单（支持购物车和立即购买两种方式）
   * @param wxUserId 微信用户ID
   * @param dto 创建订单DTO
   */
  async createOrderFromCart(wxUserId: string, dto: CreateWxOrderDto) {
    // 验证至少有一种数据源
    if (!dto.cartItemIds?.length && !dto.items?.length) {
      throw new BadRequestException('请提供购物车项ID或订单项');
    }

    if (dto.cartItemIds?.length && dto.items?.length) {
      throw new BadRequestException('不能同时使用购物车和立即购买');
    }

    // 根据不同场景处理订单项
    let orderItems: Array<{
      itemType: string;
      productId?: number;
      packageId?: number;
      itemName: string;
      itemImage: string | null;
      specification: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (dto.cartItemIds?.length) {
      // 场景1: 从购物车创建订单
      orderItems = await this.processCartItems(wxUserId, dto.cartItemIds);
    } else if (dto.items?.length) {
      // 场景2: 立即购买
      orderItems = await this.processDirectItems(dto.items);
    }

    // 2. 获取收货地址
    const shippingAddress = await this.prisma.shippingAddress.findFirst({
      where: {
        id: dto.shippingAddressId,
        wxUserId,
      },
    });

    if (!shippingAddress) {
      throw new NotFoundException('收货地址不存在');
    }

    // 3. 验证时间段
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: dto.timeSlotId },
    });

    if (!timeSlot) {
      throw new NotFoundException('时间段不存在');
    }

    // 4. 计算订单金额
    let totalAmount = 0;
    for (const item of orderItems) {
      totalAmount += item.totalPrice;
    }

    // 5. 应用优惠券(如果有)
    let discountAmount = 0;
    if (dto.couponId) {
      const coupon = await this.validateAndApplyCoupon(
        wxUserId,
        dto.couponId,
        totalAmount,
      );
      discountAmount = this.calculateDiscountAmount(coupon, totalAmount);
    }

    const finalAmount = totalAmount - discountAmount;

    // 6. 生成订单号
    const orderNo = this.generateOrderNo();

    // 7. 获取用户信息
    const wxUser = await this.prisma.wxUser.findUnique({
      where: { id: wxUserId },
      include: { linkedUser: true },
    });

    if (!wxUser) {
      throw new NotFoundException('用户不存在');
    }

    // 如果没有关联用户,使用默认值(稍后可以通过后台管理绑定)
    const userId = wxUser.linkedUserId || 1; // 使用默认用户ID或创建临时用户

    // 8. 创建订单(使用事务)
    const order = await this.prisma.$transaction(async (tx) => {
      // 创建订单
      const newOrder = await tx.order.create({
        data: {
          orderNo,
          userId,
          wxUserId,
          source: 'WXAPP',
          totalAmount: finalAmount,
          depositAmount: finalAmount * 0.3, // 30%定金
          paidAmount: 0,
          paymentStatus: 'PENDING_PAYMENT' as any,
          orderStatus: 'PENDING',
          customerName: dto.customerName || wxUser.nickname || '未设置',
          notes: dto.notes,
          childrenCount: dto.childrenCount || 1,
          shippingAddressId: dto.shippingAddressId,
          shippingInfo: shippingAddress as any,
          appointmentDate: dto.appointmentDate,
          timeSlotId: dto.timeSlotId,
          couponId: dto.couponId,
          discountAmount,
        },
      });

      // 创建订单明细
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            itemType: item.itemType as any,
            productId: item.productId,
            packageId: item.packageId,
            itemName: item.itemName,
            itemImage: item.itemImage,
            specification: item.specification,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        });
      }

      // 更新时间段预订状态
      await tx.timeSlot.update({
        where: { id: dto.timeSlotId },
        data: { bookedCount: { increment: 1 }, isBooked: true },
      });

      // 清空已下单的购物车项（仅购物车场景）
      if (dto.cartItemIds?.length) {
        await tx.cartItem.deleteMany({
          where: {
            id: { in: dto.cartItemIds },
          },
        });
      }

      // 如果使用了优惠券,标记为已使用
      if (dto.couponId) {
        await tx.userCoupon.updateMany({
          where: {
            wxUserId,
            couponId: dto.couponId,
            status: 'UNUSED',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
      }

      return newOrder;
    });

    // 9. 返回订单详情
    return this.getOrderDetail(wxUserId, order.id);
  }

  /**
   * 获取我的订单列表
   * @param wxUserId 微信用户ID
   * @param dto 查询参数
   */
  async getMyOrders(wxUserId: string, dto: QueryMyOrdersDto) {
    const { orderStatus, paymentStatus, page = 1, limit = 10 } = dto;

    const where: Prisma.OrderWhereInput = {
      wxUserId,
    };

    if (orderStatus) {
      where.orderStatus = orderStatus as any;
    }

    if (paymentStatus) {
      // 兼容旧的枚举值,将其映射到新值
      let mappedStatus = paymentStatus;
      if (paymentStatus === 'PENDING') {
        mappedStatus = 'PENDING_PAYMENT';
      } else if (paymentStatus === 'PARTIAL') {
        mappedStatus = 'PARTIAL_PAID';
      } else if (paymentStatus === 'PAID') {
        mappedStatus = 'FULLY_PAID';
      }
      where.paymentStatus = mappedStatus as any;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, images: true },
              },
              package: {
                select: { id: true, name: true, images: true },
              },
            },
          },
          timeSlot: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => this.formatOrderSummary(order)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取订单详情
   * @param wxUserId 微信用户ID
   * @param orderId 订单ID
   */
  async getOrderDetail(wxUserId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        wxUserId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                specification: true,
              },
            },
            package: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        timeSlot: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return this.formatOrderDetail(order);
  }

  /**
   * 验证并应用优惠券
   */
  private async validateAndApplyCoupon(
    wxUserId: string,
    couponId: string,
    orderAmount: number,
  ) {
    const userCoupon = await this.prisma.userCoupon.findFirst({
      where: {
        wxUserId,
        couponId,
        status: 'UNUSED',
      },
      include: {
        coupon: true,
      },
    });

    if (!userCoupon) {
      throw new BadRequestException('优惠券不可用');
    }

    const coupon = userCoupon.coupon;

    // 检查是否过期
    const now = new Date();
    if (coupon.startTime && coupon.startTime > now) {
      throw new BadRequestException('优惠券未到使用时间');
    }
    if (coupon.endTime && coupon.endTime < now) {
      throw new BadRequestException('优惠券已过期');
    }

    // 检查最低消费金额
    if (coupon.minAmount && orderAmount < Number(coupon.minAmount)) {
      throw new BadRequestException(
        `订单金额未达到优惠券最低消费金额¥${coupon.minAmount}`,
      );
    }

    return coupon;
  }

  /**
   * 计算优惠金额
   */
  private calculateDiscountAmount(coupon: any, orderAmount: number): number {
    if (coupon.discountType === 'FIXED') {
      return Math.min(Number(coupon.discountValue), orderAmount);
    } else if (coupon.discountType === 'PERCENTAGE') {
      const discount = orderAmount * (Number(coupon.discountValue) / 100);
      if (coupon.maxDiscount) {
        return Math.min(discount, Number(coupon.maxDiscount));
      }
      return discount;
    }
    return 0;
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return `WX${year}${month}${day}${random}`;
  }

  /**
   * 格式化订单摘要
   */
  private formatOrderSummary(order: any) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      totalAmount: Number(order.totalAmount),
      depositAmount: Number(order.depositAmount),
      paidAmount: Number(order.paidAmount),
      discountAmount: Number(order.discountAmount),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      appointmentDate: order.appointmentDate,
      itemCount: order.items?.length || 0,
      items: order.items?.slice(0, 3).map((item: any) => ({
        id: item.id,
        itemName: item.itemName,
        itemImage: item.itemImage,
        quantity: item.quantity,
      })),
      timeSlot: order.timeSlot
        ? {
            id: order.timeSlot.id,
            date: order.timeSlot.date,
            startTime: this.formatTimeOnly(order.timeSlot.startTime),
            endTime: this.formatTimeOnly(order.timeSlot.endTime),
          }
        : null,
      createdAt: order.createdAt,
    };
  }

  /**
   * 格式化订单详情
   */
  private formatOrderDetail(order: any) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      totalAmount: Number(order.totalAmount),
      depositAmount: Number(order.depositAmount),
      paidAmount: Number(order.paidAmount),
      discountAmount: Number(order.discountAmount),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      customerName: order.customerName,
      notes: order.notes,
      childrenCount: order.childrenCount,
      appointmentDate: order.appointmentDate,
      shippingInfo: order.shippingInfo,
      items: order.items?.map((item: any) => ({
        id: item.id,
        itemType: item.itemType,
        itemName: item.itemName,
        itemImage: item.itemImage,
        specification: item.specification,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        product: item.product,
        package: item.package,
      })),
      timeSlot: order.timeSlot
        ? {
            id: order.timeSlot.id,
            date: order.timeSlot.date,
            startTime: this.formatTimeOnly(order.timeSlot.startTime),
            endTime: this.formatTimeOnly(order.timeSlot.endTime),
          }
        : null,
      payments: order.payments?.map((payment: any) => ({
        id: payment.id,
        paymentType: payment.paymentType,
        amount: Number(payment.amount),
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * 处理购物车项
   */
  private async processCartItems(
    wxUserId: string,
    cartItemIds: string[],
  ): Promise<
    Array<{
      itemType: string;
      productId?: number;
      packageId?: number;
      itemName: string;
      itemImage: string | null;
      specification: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>
  > {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        id: { in: cartItemIds },
        wxUserId,
      },
      include: {
        product: true,
        package: true,
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('购物车项不存在或已被删除');
    }

    if (cartItems.length !== cartItemIds.length) {
      throw new BadRequestException('部分购物车项不存在');
    }

    const orderItems: Array<{
      itemType: string;
      productId?: number;
      packageId?: number;
      itemName: string;
      itemImage: string | null;
      specification: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const cartItem of cartItems) {
      let unitPrice = 0;
      let itemName = '';
      let itemImage: string | null = null;
      let specification: string | null = null;
      let itemType = cartItem.itemType;

      if (cartItem.itemType === 'PRODUCT' && cartItem.product) {
        unitPrice = Number(cartItem.product.salePrice);
        itemName = cartItem.product.name;
        itemImage = (cartItem.product.images as string[])?.[0] || null;
        specification = cartItem.product.specification;

        // 检查库存
        if (cartItem.product.isTrackStock) {
          if (cartItem.product.stockQuantity < cartItem.quantity) {
            throw new BadRequestException(
              `商品"${itemName}"库存不足,当前库存:${cartItem.product.stockQuantity}`,
            );
          }
        }
      } else if (cartItem.itemType === 'PACKAGE' && cartItem.package) {
        unitPrice = Number(cartItem.package.price);
        itemName = cartItem.package.name;
        itemImage = cartItem.package.images?.[0] || null;
      } else if (cartItem.itemType === 'DIY_COMPONENT' && cartItem.diyComponents) {
        const diyData = cartItem.diyComponents as any;
        unitPrice = Number(diyData.totalPrice || 0);
        itemName = diyData.name || 'DIY组合';
      }

      const itemTotal = unitPrice * cartItem.quantity;

      orderItems.push({
        itemType,
        productId: cartItem.productId || undefined,
        packageId: cartItem.packageId || undefined,
        itemName,
        itemImage,
        specification,
        quantity: cartItem.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    return orderItems;
  }

  /**
   * 处理直接购买项
   */
  private async processDirectItems(
    items: Array<{
      itemType: 'PRODUCT' | 'PACKAGE';
      productId?: number;
      packageId?: number;
      quantity: number;
    }>,
  ): Promise<
    Array<{
      itemType: string;
      productId?: number;
      packageId?: number;
      itemName: string;
      itemImage: string | null;
      specification: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>
  > {
    const orderItems: Array<{
      itemType: string;
      productId?: number;
      packageId?: number;
      itemName: string;
      itemImage: string | null;
      specification: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of items) {
      let unitPrice = 0;
      let itemName = '';
      let itemImage: string | null = null;
      let specification: string | null = null;

      if (item.itemType === 'PRODUCT' && item.productId) {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`商品ID ${item.productId} 不存在`);
        }

        unitPrice = Number(product.salePrice);
        itemName = product.name;
        itemImage = (product.images as string[])?.[0] || null;
        specification = product.specification;

        // 检查库存
        if (product.isTrackStock) {
          if (product.stockQuantity < item.quantity) {
            throw new BadRequestException(
              `商品"${itemName}"库存不足,当前库存:${product.stockQuantity}`,
            );
          }
        }
      } else if (item.itemType === 'PACKAGE' && item.packageId) {
        const pkg = await this.prisma.package.findUnique({
          where: { id: item.packageId },
        });

        if (!pkg) {
          throw new NotFoundException(`套系ID ${item.packageId} 不存在`);
        }

        unitPrice = Number(pkg.price);
        itemName = pkg.name;
        itemImage = pkg.images?.[0] || null;
      } else {
        throw new BadRequestException('订单项必须指定商品ID或套系ID');
      }

      const itemTotal = unitPrice * item.quantity;

      orderItems.push({
        itemType: item.itemType,
        productId: item.productId,
        packageId: item.packageId,
        itemName,
        itemImage,
        specification,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    return orderItems;
  }

  /**
   * 格式化时间(从PostgreSQL Time类型提取HH:MM格式)
   * PostgreSQL Time类型在JavaScript中表示为Date对象,日期部分为1970-01-01
   */
  private formatTimeOnly(timeValue: any): string {
    if (!timeValue) return '';

    try {
      // timeValue 可能是Date对象或字符串
      const date = timeValue instanceof Date ? timeValue : new Date(timeValue);

      // 提取小时和分钟(使用UTC时间,因为PostgreSQL Time类型没有时区)
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');

      return `${hours}:${minutes}`;
    } catch (e) {
      console.error('时间格式化失败:', e, timeValue);
      return String(timeValue);
    }
  }
}
