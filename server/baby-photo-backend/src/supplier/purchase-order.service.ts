import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreatePurchaseOrderDto, PurchaseOrderStatus } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { QueryPurchaseOrderDto } from './dto/query-purchase-order.dto';
import { ApprovePurchaseOrderDto, RejectPurchaseOrderDto } from './dto/approve-purchase-order.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成采购订单编号
   * 格式: PO-YYYYMMDD-XXXXXX
   */
  private async generatePurchaseNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = `PO-${dateStr}`;
    const lastOrder = await this.prisma.purchaseOrder.findFirst({
      where: {
        purchaseNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        purchaseNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.purchaseNo.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 计算订单总金额
   */
  private calculateTotalAmount(
    items: any[],
    freight: number = 0,
    discount: number = 0,
  ): { subtotal: number; totalAmount: number; totalTax: number } {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const amount = item.quantity * item.unitPrice;
      const tax = amount * (item.taxRate || 0);
      subtotal += amount;
      totalTax += tax;
    });

    const totalAmount = subtotal + totalTax + freight - discount;

    return {
      subtotal,
      totalAmount,
      totalTax,
    };
  }

  /**
   * 创建采购订单
   */
  async create(createDto: CreatePurchaseOrderDto) {
    // 检查供应商是否存在
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: createDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    if (supplier.status !== 'ACTIVE') {
      throw new BadRequestException('供应商未启用,无法创建采购订单');
    }

    // 生成采购订单编号
    const purchaseNo = await this.generatePurchaseNo();

    // 计算金额
    const { subtotal, totalAmount, totalTax } = this.calculateTotalAmount(
      createDto.items,
      createDto.freight || 0,
      createDto.discount || 0,
    );

    // 创建采购订单
    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        purchaseNo,
        supplierId: createDto.supplierId,
        purchaseDate: new Date(createDto.purchaseDate),
        expectedDate: createDto.expectedDate
          ? new Date(createDto.expectedDate)
          : new Date(new Date(createDto.purchaseDate).getTime() + 7 * 24 * 60 * 60 * 1000), // 默认7天后
        totalQuantity: createDto.items.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: subtotal,
        discountAmount: createDto.discount || 0,
        shippingFee: createDto.freight || 0,
        finalAmount: totalAmount,
        status: PurchaseOrderStatus.DRAFT,
        remark: createDto.remark,
        items: {
          create: createDto.items.map((item) => ({
            productNo: item.productId?.toString() || '',
            productName: '',
            unit: 'PCS',
            product: {
              connect: { id: item.productId },
            },
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            remark: item.remark,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                productNo: true,
                name: true,
                categoryId: true,
                specification: true,
                unit: true,
                brand: true,
                model: true,
                costPrice: true,
                salePrice: true,
                description: true,
                images: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            supplierNo: true,
            name: true,
            contactPerson: true,
            contactPhone: true,
          },
        },
      },
    });

    return {
      code: 200,
      message: '采购订单创建成功',
      data: purchaseOrder,
    };
  }

  /**
   * 查询采购订单列表
   */
  async findAll(queryDto: QueryPurchaseOrderDto) {
    const {
      purchaseNo,
      supplierId,
      supplierName,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const where: any = {};

    if (purchaseNo) {
      where.purchaseNo = { contains: purchaseNo };
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (supplierName) {
      where.supplierName = { contains: supplierName };
    }
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        where.purchaseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [list, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          supplier: {
            select: {
              id: true,
              supplierNo: true,
              name: true,
              contactPerson: true,
              contactPhone: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
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
   * 查询采购订单详情
   */
  async findOne(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                productNo: true,
                name: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                specification: true,
                unit: true,
                brand: true,
                model: true,
                costPrice: true,
                salePrice: true,
                description: true,
                images: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            supplierNo: true,
            name: true,
            contactPerson: true,
            contactPhone: true,
            address: true,
          },
        },
        receiveRecords: {
          select: {
            id: true,
            receiveNo: true,
            receiveDate: true,
            receiveQuantity: true,
            qualifiedQuantity: true,
            defectiveQuantity: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('采购订单不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: purchaseOrder,
    };
  }

  /**
   * 更新采购订单
   */
  async update(id: string, updateDto: UpdatePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    // 只有草稿状态的订单可以修改
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的订单可以修改');
    }

    // 使用事务更新订单及其明细
    const updated = await this.prisma.$transaction(async (prisma) => {
      // 如果提供了 items，删除旧的并创建新的
      if (updateDto.items && updateDto.items.length > 0) {
        // 删除旧的明细
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // 计算总金额
        let subtotal = 0;
        const items = await Promise.all(
          updateDto.items.map(async (item) => {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
            });

            if (!product) {
              throw new BadRequestException(`商品 ID ${item.productId} 不存在`);
            }

            const totalPrice = item.quantity * item.unitPrice;
            subtotal += totalPrice;

            return {
              purchaseOrderId: id,
              productId: item.productId!,
              productNo: item.productId?.toString() || '',
              productName: product.name || '',
              unit: product.unit || 'PCS',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice,
              remark: item.remark,
            };
          })
        );

        // 创建新的明细
        await prisma.purchaseOrderItem.createMany({
          data: items,
        });

        // 计算最终金额
        const shippingFee = updateDto.freight || order.shippingFee || 0;
        const discountAmount = updateDto.discount || order.discountAmount || 0;
        const finalAmount = subtotal + Number(shippingFee) - Number(discountAmount);

        // 更新订单主表
        return await prisma.purchaseOrder.update({
          where: { id },
          data: {
            supplierId: updateDto.supplierId || order.supplierId,
            purchaseDate: updateDto.purchaseDate ? new Date(updateDto.purchaseDate) : order.purchaseDate,
            expectedDate: updateDto.expectedDate ? new Date(updateDto.expectedDate) : order.expectedDate,
            shippingFee,
            discountAmount,
            totalAmount: subtotal,
            finalAmount,
            remark: updateDto.remark,
            status: updateDto.status || order.status,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            supplier: true,
          },
        });
      } else {
        // 只更新订单主表字段
        return await prisma.purchaseOrder.update({
          where: { id },
          data: {
            supplierId: updateDto.supplierId,
            purchaseDate: updateDto.purchaseDate ? new Date(updateDto.purchaseDate) : undefined,
            expectedDate: updateDto.expectedDate ? new Date(updateDto.expectedDate) : undefined,
            shippingFee: updateDto.freight,
            discountAmount: updateDto.discount,
            remark: updateDto.remark,
            status: updateDto.status,
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            supplier: true,
          },
        });
      }
    });

    return {
      code: 200,
      message: '采购订单更新成功',
      data: updated,
    };
  }

  /**
   * 提交审批
   */
  async submit(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的订单可以提交审批');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.PENDING,
      },
    });

    return {
      code: 200,
      message: '采购订单已提交审批',
      data: updated,
    };
  }

  /**
   * 审批通过
   */
  async approve(id: string, approveDto: ApprovePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('只有待审批状态的订单可以审批');
    }

    // 更新订单状态为已审批
    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedAt: new Date(),
        rejectReason: approveDto.approvalRemark,
      },
    });

    // 自动创建在途记录
    try {
      // 生成在途单号
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const prefix = `IT-${dateStr}`;
      
      const lastInTransit = await this.prisma.inTransitGoods.findFirst({
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
      if (lastInTransit) {
        const lastSequence = parseInt(lastInTransit.transitNo.slice(-6));
        sequence = lastSequence + 1;
      }
      const transitNo = `${prefix}-${String(sequence).padStart(6, '0')}`;

      // 创建在途记录
      await this.prisma.inTransitGoods.create({
        data: {
          transitNo,
          purchaseOrderId: id,
          totalQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: order.totalAmount,
          expectedDate: order.expectedDate,
          shippingStatus: 'PREPARING',
          shippingCompany: order.shippingCompany,
          trackingNo: order.trackingNo,
        },
      });
    } catch (error) {
      console.error('创建在途记录失败:', error);
      // 不影响审批流程，只记录错误
    }

    return {
      code: 200,
      message: '采购订单审批通过',
      data: updated,
    };
  }

  /**
   * 审批驳回
   */
  async reject(id: string, rejectDto: RejectPurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if (order.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('只有待审批状态的订单可以驳回');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.REJECTED,
        approvedAt: new Date(),
        rejectReason: rejectDto.rejectReason,
      },
    });

    return {
      code: 200,
      message: '采购订单已驳回',
      data: updated,
    };
  }

  /**
   * 撤回审批
   */
  async revokeApproval(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if (order.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('只有已审批状态的订单可以撤回');
    }

    // 检查是否已有在途记录
    const inTransit = await this.prisma.inTransitGoods.findFirst({
      where: { purchaseOrderId: id },
    });

    if (inTransit) {
      // 删除关联的在途记录
      await this.prisma.inTransitGoods.delete({
        where: { id: inTransit.id },
      });
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.PENDING,
        approvedAt: null,
        approverId: null,
      },
    });

    return {
      code: 200,
      message: '审批已撤回',
      data: updated,
    };
  }

  /**
   * 取消订单
   */
  async cancel(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if ([PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED].includes(order.status as PurchaseOrderStatus)) {
      throw new BadRequestException('已收货或已取消的订单无法取消');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
      },
    });

    return {
      code: 200,
      message: '采购订单已取消',
      data: updated,
    };
  }

  /**
   * 更新物流信息
   */
  async updateShipping(
    id: string,
    shippingDto: {
      shippingCompany?: string;
      trackingNo?: string;
      shippingStatus?: string;
    },
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...shippingDto,
      },
    });

    return {
      code: 200,
      message: '物流信息已更新',
      data: updated,
    };
  }

  /**
   * 确认收货
   */
  async confirmReceive(id: string, receiveDto: { receivedQuantity?: number; qualityCheckStatus?: string; qualityCheckRemark?: string }) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('订单已收货');
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('已取消的订单无法收货');
    }

    if (order.status === PurchaseOrderStatus.DRAFT || order.status === PurchaseOrderStatus.PENDING || order.status === PurchaseOrderStatus.REJECTED) {
      throw new BadRequestException('订单未审批或已被驳回，无法收货');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.RECEIVED,
        receivedAt: new Date(),
        receivedQuantity: receiveDto.receivedQuantity || order.totalQuantity,
      },
    });

    return {
      code: 200,
      message: '已确认收货',
      data: updated,
    };
  }

  /**
   * 删除订单
   */
  async remove(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('采购订单不存在');
    }

    // 只能删除草稿或已取消的订单
    if (![PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED].includes(order.status as PurchaseOrderStatus)) {
      throw new BadRequestException('只能删除草稿或已取消的订单');
    }

    await this.prisma.purchaseOrder.delete({
      where: { id },
    });

    return {
      code: 200,
      message: '采购订单删除成功',
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const [total, byStatus, recentOrders, totalAmount] = await Promise.all([
      this.prisma.purchaseOrder.count(),

      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),

      this.prisma.purchaseOrder.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          purchaseNo: true,
          totalAmount: true,
          status: true,
          purchaseDate: true,
          supplier: {
            select: {
              name: true,
            },
          },
        },
      }),

      this.prisma.purchaseOrder.aggregate({
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        total,
        totalAmount: totalAmount._sum?.totalAmount || 0,
        byStatus: byStatus.map((item) => ({
          status: item.status,
          count: item._count?.id,
          amount: item._sum?.totalAmount || 0,
        })),
        recentOrders,
      },
    };
  }
}
