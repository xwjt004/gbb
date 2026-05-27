import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma/prisma.service';
import {
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  CompleteRefundDto,
  QueryRefundDto,
  RefundStatus,
} from './dto/create-refund.dto';

@Injectable()
export class RefundService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成退款单号
   * 格式: REF-YYYYMMDD-XXXXXX
   */
  private async generateRefundNo(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const prefix = `REF-${dateStr}`;
    const lastRefund = await this.prisma.purchaseRefund.findFirst({
      where: {
        refundNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        refundNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastRefund) {
      const lastSequence = parseInt(lastRefund.refundNo.slice(-6));
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  /**
   * 创建退款申请
   */
  async create(createDto: CreateRefundDto, applicantId?: number, applicantName?: string) {
    // 检查采购订单是否存在
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: createDto.purchaseOrderId },
      include: {
        payments: {
          where: {
            status: 'CONFIRMED',
          },
        },
        refunds: {
          where: {
            status: {
              in: ['PENDING', 'APPROVED', 'COMPLETED'],
            },
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('采购订单不存在');
    }

    // 计算已付款金额
    const paidAmount = purchaseOrder.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    if (paidAmount === 0) {
      throw new BadRequestException('该订单尚未付款,无法申请退款');
    }

    // 计算已退款或待退款金额
    const refundedAmount = purchaseOrder.refunds.reduce(
      (sum, refund) => sum + Number(refund.refundAmount),
      0
    );

    const availableRefundAmount = paidAmount - refundedAmount;

    if (createDto.refundAmount > availableRefundAmount) {
      throw new BadRequestException(
        `退款金额不能超过可退金额 ¥${availableRefundAmount.toFixed(2)}`
      );
    }

    // 如果指定了付款ID,检查付款记录
    if (createDto.paymentId) {
      const payment = await this.prisma.purchasePayment.findUnique({
        where: { id: createDto.paymentId },
      });

      if (!payment || payment.purchaseOrderId !== createDto.purchaseOrderId) {
        throw new BadRequestException('付款记录不存在或不属于该采购订单');
      }

      if (payment.status !== 'CONFIRMED') {
        throw new BadRequestException('只能对已确认的付款申请退款');
      }
    }

    // 生成退款单号
    const refundNo = await this.generateRefundNo();

    // 创建退款申请
    const refund = await this.prisma.purchaseRefund.create({
      data: {
        refundNo,
        purchaseOrderId: createDto.purchaseOrderId,
        paymentId: createDto.paymentId,
        refundAmount: createDto.refundAmount,
        refundType: createDto.refundType,
        reason: createDto.reason,
        applicantId,
        applicantName,
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
        payment: true,
      },
    });

    return {
      code: 200,
      message: '退款申请已提交',
      data: refund,
    };
  }

  /**
   * 审批通过退款申请
   */
  async approve(id: string, approveDto: ApproveRefundDto, approverId?: number) {
    const refund = await this.prisma.purchaseRefund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('只有待审批的退款申请才能审批');
    }

    const updated = await this.prisma.purchaseRefund.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalRemark: approveDto.approvalRemark,
      },
    });

    return {
      code: 200,
      message: '退款申请已批准',
      data: updated,
    };
  }

  /**
   * 拒绝退款申请
   */
  async reject(id: string, rejectDto: RejectRefundDto, rejecterId?: number) {
    const refund = await this.prisma.purchaseRefund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('只有待审批的退款申请才能拒绝');
    }

    const updated = await this.prisma.purchaseRefund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: rejecterId,
        rejectedAt: new Date(),
        rejectReason: rejectDto.rejectReason,
      },
    });

    return {
      code: 200,
      message: '退款申请已拒绝',
      data: updated,
    };
  }

  /**
   * 完成退款
   */
  async complete(id: string, completeDto: CompleteRefundDto, completerId?: number) {
    const refund = await this.prisma.purchaseRefund.findUnique({
      where: { id },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.status !== 'APPROVED') {
      throw new BadRequestException('只有已批准的退款申请才能完成退款');
    }

    const updated = await this.prisma.purchaseRefund.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedBy: completerId,
        completedAt: new Date(),
        transactionNo: completeDto.transactionNo,
        remark: completeDto.remark || refund.remark,
      },
    });

    return {
      code: 200,
      message: '退款已完成',
      data: updated,
    };
  }

  /**
   * 查询退款申请列表
   */
  async findAll(queryDto: QueryRefundDto) {
    const {
      purchaseOrderId,
      refundType,
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
    if (refundType) {
      where.refundType = refundType;
    }
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.appliedAt = {};
      if (startDate) {
        where.appliedAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.appliedAt.lte = end;
      }
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [list, total] = await Promise.all([
      this.prisma.purchaseRefund.findMany({
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
          payment: true,
        },
      }),
      this.prisma.purchaseRefund.count({ where }),
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
   * 查询退款详情
   */
  async findOne(id: string) {
    const refund = await this.prisma.purchaseRefund.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            payments: true,
            refunds: true,
          },
        },
        payment: true,
      },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    return {
      code: 200,
      message: '查询成功',
      data: refund,
    };
  }

  /**
   * 获取退款统计
   */
  async getStatistics() {
    const [
      total,
      totalAmount,
      pendingCount,
      approvedCount,
      rejectedCount,
      completedCount,
      byType,
    ] = await Promise.all([
      this.prisma.purchaseRefund.count(),

      this.prisma.purchaseRefund.aggregate({
        where: {
          status: 'COMPLETED',
        },
        _sum: {
          refundAmount: true,
        },
      }),

      this.prisma.purchaseRefund.count({
        where: { status: 'PENDING' },
      }),

      this.prisma.purchaseRefund.count({
        where: { status: 'APPROVED' },
      }),

      this.prisma.purchaseRefund.count({
        where: { status: 'REJECTED' },
      }),

      this.prisma.purchaseRefund.count({
        where: { status: 'COMPLETED' },
      }),

      this.prisma.purchaseRefund.groupBy({
        by: ['refundType'],
        _count: {
          id: true,
        },
        _sum: {
          refundAmount: true,
        },
        where: {
          status: 'COMPLETED',
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        total,
        totalAmount: totalAmount._sum?.refundAmount || 0,
        byStatus: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          completed: completedCount,
        },
        byType: byType.map((item) => ({
          type: item.refundType,
          count: item._count?.id,
          amount: item._sum?.refundAmount || 0,
        })),
      },
    };
  }
}
