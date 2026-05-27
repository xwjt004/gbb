import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CreateSupplierPaymentDto, QueryPaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '../shared/enums/payment-status.enum';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成付款单号
   * 格式: PAY-YYYYMMDD-XXXXXX
   */
  private async generatePaymentNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = `PAY-${dateStr}`;
    const lastPayment = await this.prisma.purchasePayment.findFirst({
      where: {
        paymentNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        paymentNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastPayment) {
      const lastSequence = parseInt(lastPayment.paymentNo.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 创建付款记录
   */
  async create(createDto: CreateSupplierPaymentDto) {
    // 检查采购订单是否存在
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: createDto.purchaseOrderId },
      include: {
        payments: true,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('采购订单不存在');
    }

    // 检查订单是否已审批
    if (purchaseOrder.status !== 'APPROVED' && purchaseOrder.status !== 'SHIPPING' && purchaseOrder.status !== 'RECEIVED') {
      throw new BadRequestException('只有已审批的订单才能进行付款');
    }

    // 计算已付款金额
    const paidAmount = purchaseOrder.payments
      .filter(p => p.status === 'CONFIRMED')
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    // 检查付款金额是否超出订单总额
    const remainingAmount = Number(purchaseOrder.finalAmount) - paidAmount;
    if (createDto.amount > remainingAmount) {
      throw new BadRequestException(
        `付款金额不能超过剩余应付金额 ¥${remainingAmount.toFixed(2)}`
      );
    }

    // 生成付款单号
    const paymentNo = await this.generatePaymentNo();

    // 创建付款记录
    const payment = await this.prisma.purchasePayment.create({
      data: {
        paymentNo,
        purchaseOrderId: createDto.purchaseOrderId,
        amount: createDto.amount,
        paymentMethod: createDto.paymentMethod,
        paymentDate: new Date(createDto.paymentDate),
        transactionNo: createDto.transactionNo,
        bankName: createDto.bankName,
        bankAccount: createDto.bankAccount,
        payee: createDto.payee,
        remark: createDto.remark,
        status: 'PENDING',
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
      message: '付款记录创建成功',
      data: payment,
    };
  }

  /**
   * 确认付款
   */
  async confirm(id: string, confirmerId?: number) {
    const payment = await this.prisma.purchasePayment.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('付款记录不存在');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('只有待确认的付款记录才能确认');
    }

    const updated = await this.prisma.purchasePayment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedBy: confirmerId,
        confirmedAt: new Date(),
      },
    });

    return {
      code: 200,
      message: '付款已确认',
      data: updated,
    };
  }

  /**
   * 取消付款
   */
  async cancel(id: string) {
    const payment = await this.prisma.purchasePayment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('付款记录不存在');
    }

    if (payment.status === 'CONFIRMED') {
      throw new BadRequestException('已确认的付款记录无法取消');
    }

    const updated = await this.prisma.purchasePayment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return {
      code: 200,
      message: '付款已取消',
      data: updated,
    };
  }

  /**
   * 查询付款记录列表
   */
  async findAll(queryDto: QueryPaymentDto) {
    const {
      purchaseOrderId,
      paymentMethod,
      status,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = queryDto;

    const where: any = {};

    if (purchaseOrderId) {
      where.purchaseOrderId = purchaseOrderId;
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [list, total] = await Promise.all([
      this.prisma.purchasePayment.findMany({
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
      this.prisma.purchasePayment.count({ where }),
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
   * 查询付款记录详情
   */
  async findOne(id: string) {
    const payment = await this.prisma.purchasePayment.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            payments: true,
          },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('付款记录不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: payment,
    };
  }

  /**
   * 获取采购订单的付款统计
   */
  async getOrderPaymentStatus(purchaseOrderId: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        payments: {
          where: {
            status: 'CONFIRMED',
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('采购订单不存在');
    }

    const totalAmount = Number(purchaseOrder.finalAmount);
    const paidAmount = purchaseOrder.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );
    const remainingAmount = totalAmount - paidAmount;

    let paymentStatus: PaymentStatus;
    if (paidAmount === 0) {
      paymentStatus = PaymentStatus.PENDING_PAYMENT;
    } else if (paidAmount < totalAmount) {
      paymentStatus = PaymentStatus.PARTIAL_PAID;
    } else {
      paymentStatus = PaymentStatus.FULLY_PAID;
    }

    return {
      code: 200,
      message: '查询成功',
      data: {
        purchaseOrderId,
        purchaseNo: purchaseOrder.purchaseNo,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus,
        paymentCount: purchaseOrder.payments.length,
      },
    };
  }

  /**
   * 获取付款统计
   */
  async getStatistics() {
    const [
      total,
      totalAmount,
      pendingCount,
      confirmedCount,
      cancelledCount,
      byMethod,
    ] = await Promise.all([
      this.prisma.purchasePayment.count(),

      this.prisma.purchasePayment.aggregate({
        where: {
          status: 'CONFIRMED',
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.purchasePayment.count({
        where: { status: 'PENDING' },
      }),

      this.prisma.purchasePayment.count({
        where: { status: 'CONFIRMED' },
      }),

      this.prisma.purchasePayment.count({
        where: { status: 'CANCELLED' },
      }),

      this.prisma.purchasePayment.groupBy({
        by: ['paymentMethod'],
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
        where: {
          status: 'CONFIRMED',
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        total,
        totalAmount: totalAmount._sum?.amount || 0,
        byStatus: {
          pending: pendingCount,
          confirmed: confirmedCount,
          cancelled: cancelledCount,
        },
        byMethod: byMethod.map((item) => ({
          method: item.paymentMethod,
          count: item._count?.id,
          amount: item._sum?.amount || 0,
        })),
      },
    };
  }
}
