import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { QueryTransferDto } from './dto/query-transfer.dto';


@Injectable()
export class StockTransferService {
  private readonly logger = new Logger(StockTransferService.name);

  constructor(private readonly prisma: PrismaService) {}


  private async generateTransferNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
   
    // ��ѯ�������еĵ���������
    const count = await this.prisma.stockTransfer.count({
      where: {
        createdAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999))
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `TRF-${dateStr}-${sequence}`;
  }

  /**
   * ��������??
   */
  async create(createTransferDto: CreateTransferDto, submitterId: number) {
    const { productId, quantity, fromWarehouse, toWarehouse, reason } = createTransferDto;

    // 1. ��֤��Ʒ�Ƿ����?
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException(`��ƷID ${productId} ������`);
    }

    // 2. ��֤Դ�ֿ��Ŀ��ֿⲻ����ͬ
    if (fromWarehouse === toWarehouse) {
      throw new BadRequestException('Դ�ֿ��Ŀ��ֿⲻ����ͬ');
    }

    // 3. ��֤����Ƿ����
    if (product.isTrackStock && product.stockQuantity < quantity) {
      throw new BadRequestException(
        `��Ʒ ${product.name} ��治�㣬��ǰ��棺${product.stockQuantity}������������${quantity}`
      );
    }

    // 4. ���ɵ�������
    const transferNo = await this.generateTransferNo();

    // 5. ��������??
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNo,
        productId,
        quantity,
        fromWarehouse: fromWarehouse || 'MAIN',
        toWarehouse: toWarehouse || 'BRANCH',
        reason,
        status: 'PENDING',
        submitterId,
        submittedAt: new Date()
      },
      include: {
        product: true,
        submitter: {
          select: {
            id: true,
            nickname: true
          }
        }
      }
    });

    this.logger.log(`������������?? ${transferNo}, ��Ʒ: ${product.name}, ����: ${quantity}`);
    return transfer;
  }

  /**
   * ��ѯ��������??
   */
  async findAll(queryTransferDto: QueryTransferDto) {
    const {
      page = 1,
      pageSize = 10,
      status,
      fromWarehouse,
      toWarehouse,
      productId,
      submitterId,
      startDate,
      endDate
    } = queryTransferDto;

    // ������ѯ����
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (fromWarehouse) {
      where.fromWarehouse = fromWarehouse;
    }

    if (toWarehouse) {
      where.toWarehouse = toWarehouse;
    }

    if (productId) {
      where.productId = productId;
    }

    if (submitterId) {
      where.submitterId = submitterId;
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

    // ��ѯ����
    const total = await this.prisma.stockTransfer.count({ where });

    // ��ѯ�б�
    const transfers = await this.prisma.stockTransfer.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productNo: true
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return {
      items: transfers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * ��ѯ��������??
   */
  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productNo: true,
            stockQuantity: true
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

    if (!transfer) {
      throw new NotFoundException(`������ID ${id} ������`);
    }

    return transfer;
  }

  /**
   * ��������??
   */
  async approve(id: string, approverId: number, approvalNote?: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״??
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}����������`);
    }

    // 3. ��֤����Ƿ����
    const product = await this.prisma.product.findUnique({
      where: { id: transfer.productId }
    });

    if (!product) {
      throw new NotFoundException('��Ʒ������');
    }

    if (product.isTrackStock && product.stockQuantity < transfer.quantity) {
      throw new BadRequestException(
        `��Ʒ ${product.name} ��治�㣬��ǰ��棺${product.stockQuantity}������������${transfer.quantity}`
      );
    }

    // 4. ���µ�����״̬Ϊ����??
    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
        approvalNote
      },
      include: {
        product: true,
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

    this.logger.log(`����??${transfer.transferNo} ������ͨ��`);
    return updatedTransfer;
  }

  /**
   * �ܾ�����??
   */
  async reject(id: string, approverId: number, approvalNote?: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״??
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}�����ܾܾ�`);
    }

    // 3. ���µ�����״̬Ϊ�Ѿ�??
    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approverId,
        approvedAt: new Date(),
        approvalNote
      },
      include: {
        product: true,
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

    this.logger.log(`����??${transfer.transferNo} �Ѿܾ�`);
    return updatedTransfer;
  }

  /**
   * ����
   */
  async ship(id: string, shippingNote?: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״??
    if (transfer.status !== 'APPROVED') {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}�����ܷ���`);
    }

    // 3. ��ȡ��Ʒ��Ϣ
    const product = await this.prisma.product.findUnique({
      where: { id: transfer.productId },
    });

    if (!product) {
      throw new NotFoundException('��Ʒ������');
    }

    // 4. �ۼ����?
    if (product.isTrackStock) {
      if (product.stockQuantity < transfer.quantity) {
        throw new BadRequestException(
          `��Ʒ ${product.name} ��治�㣬��ǰ��棺${product.stockQuantity}������������${transfer.quantity}`
        );
      }

      await this.prisma.product.update({
        where: { id: transfer.productId },
        data: {
          stockQuantity: {
            decrement: transfer.quantity
          }
        }
      });

      // ���������ˮ��¼��������?
      await this.createStockTransaction({
        productId: transfer.productId,
        transactionType: 'TRANSFER_OUT',
        quantity: -transfer.quantity,  // ������ʾ����
        beforeStock: product.stockQuantity,
        afterStock: product.stockQuantity - transfer.quantity,
        operatorId: transfer.submitterId,  // ʹ���ύ��ID
        remark: `����??${transfer.transferNo} ����`
      });
    }

    // 5. ���µ�����״̬Ϊ��??
    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'IN_TRANSIT',
        shippedAt: new Date(),
        shippingNote
      },
      include: {
        product: true,
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

    this.logger.log(`����??${transfer.transferNo} �ѷ������ۼ����?${transfer.quantity}`);
    return updatedTransfer;
  }

  /**
   * �ջ�
   */
  async receive(id: string, receivingNote?: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״??
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}�������ջ�`);
    }

    // 3. ��ȡ��Ʒ��Ϣ
    const product = await this.prisma.product.findUnique({
      where: { id: transfer.productId },
    });

    if (!product) {
      throw new NotFoundException('��Ʒ������');
    }

    // 4. ���ӿ��?
    if (product.isTrackStock) {
      await this.prisma.product.update({
        where: { id: transfer.productId },
        data: {
          stockQuantity: {
            increment: transfer.quantity
          }
        }
      });

      // ���������ˮ��¼������?
      await this.createStockTransaction({
        productId: transfer.productId,
        transactionType: 'TRANSFER_IN',
        quantity: transfer.quantity,  // ������ʾ����
        beforeStock: product.stockQuantity,
        afterStock: product.stockQuantity + transfer.quantity,
        operatorId: transfer.submitterId,  // ʹ���ύ��ID
        remark: `����??${transfer.transferNo} �ջ�`
      });
    }

    // 5. ���µ�����״̬Ϊ����??
    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        receivedAt: new Date(),
        completedAt: new Date(),
        receivingNote
      },
      include: {
        product: true,
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

    this.logger.log(`����??${transfer.transferNo} ���ջ������ӿ��?${transfer.quantity}`);
    return updatedTransfer;
  }

  /**
   * ȡ������??
   */
  async cancel(id: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״̬��ֻ�д��������������ĵ���������ȡ����
    if (!['PENDING', 'APPROVED'].includes(transfer.status)) {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}������ȡ��`);
    }

    // 3. ���µ�����״̬Ϊ��ȡ??
    const updatedTransfer = await this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      },
      include: {
        product: true,
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

    this.logger.log(`����??${transfer.transferNo} ��ȡ��`);
    return updatedTransfer;
  }

  /**
   * ɾ������??
   */
  async remove(id: string) {
    // 1. ��ѯ����??
    const transfer = await this.findOne(id);

    // 2. ��֤״̬��ֻ������ɡ���ȡ�����Ѿܾ��ĵ���������ɾ��??
    if (!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(transfer.status)) {
      throw new BadRequestException(`������״̬Ϊ ${transfer.status}������ɾ��`);
    }

    // 3. ɾ������??
    await this.prisma.stockTransfer.delete({
      where: { id }
    });

    this.logger.log(`����??${transfer.transferNo} ��ɾ��`);
    return { message: 'ɾ���ɹ�' };
  }

  /**
   * ͳ�Ƶ�������
   */
  async statistics(startDate?: string, endDate?: string) {
    // ����ʱ�䷶Χ����
    const where: any = {};
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

    // ��ѯ����
    const totalCount = await this.prisma.stockTransfer.count({ where });

    // ��״̬ͳ??
    const statusStats = await this.prisma.stockTransfer.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    });

    // ���ֿ�ͳ�ƣ������ֿ�??
    const fromWarehouseStats = await this.prisma.stockTransfer.groupBy({
      by: ['fromWarehouse'],
      where,
      _count: {
        fromWarehouse: true
      },
      _sum: {
        quantity: true
      }
    });

    // ���ֿ�ͳ�ƣ����ղֿ�??
    const toWarehouseStats = await this.prisma.stockTransfer.groupBy({
      by: ['toWarehouse'],
      where,
      _count: {
        toWarehouse: true
      },
      _sum: {
        quantity: true
      }
    });

    // ��֯��������
    const byStatus: any = {};
    statusStats.forEach(stat => {
      byStatus[stat.status] = stat._count?.status;
    });

    const byFromWarehouse: any = {};
    fromWarehouseStats.forEach(stat => {
      byFromWarehouse[stat.fromWarehouse] = {
        count: stat._count?.fromWarehouse,
        totalQuantity: stat._sum?.quantity || 0
      };
    });

    const byToWarehouse: any = {};
    toWarehouseStats.forEach(stat => {
      byToWarehouse[stat.toWarehouse] = {
        count: stat._count?.toWarehouse,
        totalQuantity: stat._sum?.quantity || 0
      };
    });

    return {
      totalCount,
      pendingCount: byStatus.PENDING || 0,
      approvedCount: byStatus.APPROVED || 0,
      inTransitCount: byStatus.IN_TRANSIT || 0,
      completedCount: byStatus.COMPLETED || 0,
      rejectedCount: byStatus.REJECTED || 0,
      cancelledCount: byStatus.CANCELLED || 0,
      byStatus,
      byFromWarehouse,
      byToWarehouse
    };
  }

  /**
   * ���������ˮ���?
   */
  private async createStockTransaction(data: {
    productId: number;
    transactionType: string;
    quantity: number;
    beforeStock: number;
    afterStock: number;
    operatorId: number;
    remark?: string;
  }) {
    // ������ˮ??
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
    const transactionNo = `TXN-${dateStr}-${sequence}`;

    // ������ˮ��¼
    return await this.prisma.stockTransaction.create({
      data: {
        transactionNo,
        productId: data.productId,
        transactionType: data.transactionType,
        quantity: data.quantity,
        beforeStock: data.beforeStock,
        afterStock: data.afterStock,
        operatorId: data.operatorId,
        remark: data.remark
      }
    });
  }
}
