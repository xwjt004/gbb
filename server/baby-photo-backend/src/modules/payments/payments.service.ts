import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { WechatPayService } from './wechat-pay.service';
import { PaymentNotificationService } from './services/payment-notification.service';
import { CreatePaymentDto, PaymentChannel } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentSearchDto } from './dto/payment-search.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { CollectBalanceDto, BalanceInfoDto } from './dto/collect-balance.dto';
import { 
  CreateRefundRequestDto, 
  RefundType, 
  RefundMethod 
} from './dto/create-refund-request.dto';
import { 
  RefundRequestSearchDto, 
  ApproveRefundRequestDto, 
  RejectRefundRequestDto, 
  ProcessRefundRequestDto,
  RefundStatus 
} from './dto/refund-request-search.dto';
import { OrderStatusValidator } from '../../shared/validators/order-status.validator';
import { OrderStatus, PaymentStatus, STATUS_DESCRIPTIONS } from '../../shared/enums/status.enum';
import { AutoStatusTransitionService } from '../../shared/services/auto-status-transition.service';
import { formatLocalDate } from '../../shared/utils/date.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly wechatPayService: WechatPayService,
    private readonly notificationService: PaymentNotificationService,
    private readonly autoStatusTransitionService: AutoStatusTransitionService,
  ) {}

  /**
   * 创建支付订单
   */
  async create(createPaymentDto: CreatePaymentDto) {
    try {
      // 0. 生成幂等复合 key（如果用户传入 idempotencyKey 则扩展组合）
      const compositeIdemKey = this.generateIdempotencyKey(createPaymentDto);
      const finalIdemKey = createPaymentDto.idempotencyKey
        ? `${createPaymentDto.idempotencyKey}:${compositeIdemKey}`
        : compositeIdemKey;
      const cacheKey = this.cacheService.generateKey('payment-idem', finalIdemKey);

      // 如果命中缓存直接返回（避免重复创建）
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        this.logger.warn(`幂等重复请求命中: key=${finalIdemKey}`);
        return cached;
      }

      // 1. 验证订单是否存在
      const order = await this.prisma.order.findUnique({
        where: { orderNo: createPaymentDto.orderNo },
        include: { user: true, package: true },
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }

      // 2. 检查是否已有未完成的支付
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          order: {
            orderNo: createPaymentDto.orderNo,
          },
          status: PaymentStatus.PENDING_PAYMENT,
        },
      });

      if (existingPayment) {
        // 如果携带幂等 key 则视为重复创建，直接返回已有记录（不抛异常）
        this.logger.warn(`检测到已有待处理支付记录 order=${createPaymentDto.orderNo} payment=${existingPayment.id}`);
        const existingResponse = {
          code: 200,
            message: '幂等重复请求返回已有支付记录',
            data: {
              payment_id: existingPayment.id,
              order_no: createPaymentDto.orderNo,
              amount: Number(existingPayment.amount),
              status: existingPayment.status,
              payment_type: existingPayment.paymentType,
              idempotency_key: finalIdemKey,
              payment_info: null, // 无法重建预支付信息（仅首次创建缓存）
            },
        };
        // 缓存幂等响应，TTL 短暂保证窗口期稳定（60s）
        await this.cacheService.set(cacheKey, existingResponse, 60);
        return existingResponse;
      }

      // 2.5 检查订单是否已完成支付（防止重复收款）
      if (order.paymentStatus === PaymentStatus.FULLY_PAID) {
        throw new BadRequestException(
          `该订单已全额支付（支付状态: ${order.paymentStatus}），请勿重复收款`
        );
      }

      // 2.6 检查累计已付金额是否已达到订单总额
      const existingFullPayments = await this.prisma.payment.findMany({
        where: {
          orderId: order.id,
          status: PaymentStatus.FULLY_PAID,
        },
      });
      const totalFullyPaid = existingFullPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      if (totalFullyPaid + Number(createPaymentDto.amount) > Number(order.totalAmount)) {
        throw new BadRequestException(
          `该订单已收款 ¥${totalFullyPaid.toFixed(2)}，本次收款 ¥${Number(createPaymentDto.amount).toFixed(2)} 将超过订单总额 ¥${Number(order.totalAmount).toFixed(2)}，请核实后操作`
        );
      }

      // 3. 创建支付记录
      // 映射前端的 paymentType (WECHAT/ALIPAY/CASH) 到数据库的 paymentMethod
      const paymentMethodMap: Record<string, string> = {
        'WECHAT': 'WECHAT_PAY',
        'ALIPAY': 'ALIPAY',
        'CASH': 'CASH',
        'BANK_TRANSFER': 'BANK_CARD'
      };

      const payment = await this.prisma.payment.create({
        data: {
          order: {
            connect: {
              orderNo: createPaymentDto.orderNo,
            },
          },
          amount: createPaymentDto.amount,
          paymentType: 'FULL' as any, // 默认全款支付
          paymentMethod: paymentMethodMap[createPaymentDto.paymentType] as any || 'WECHAT_PAY',
          status: 'PENDING_PAYMENT' as any,
        },
      });

      // 4. 调用微信支付API (APIv3)
      let paymentResult;
      if (createPaymentDto.paymentType === 'WECHAT') {
        paymentResult = await this.wechatPayService.createJsapiOrder({
          orderId: payment.id,
          orderNo: createPaymentDto.orderNo,
          description:
            createPaymentDto.description || `${order.package?.name || '套系'} - 支付`,
          amount: Number(createPaymentDto.amount), // V3 使用元为单位
          openid: order.user.openid,
        });

        // 更新支付记录
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PENDING_PAYMENT,
          },
        });
      }

      // 5. 构造返回数据
      const response = {
        payment_id: payment.id,
        order_no: createPaymentDto.orderNo,
        amount: Number(createPaymentDto.amount),
        status: PaymentStatus.PENDING_PAYMENT,
        idempotency_key: finalIdemKey,
        payment_info: paymentResult
          ? {
              prepayId: paymentResult.prepayId,
              timeStamp: paymentResult.timeStamp,
              nonceStr: paymentResult.nonceStr,
              package: paymentResult.package,
              signType: paymentResult.signType,
              paySign: paymentResult.paySign,
            }
          : null,
      };

      this.logger.log(`支付订单创建成功: ${payment.id}`);

  const resultWrapper = {
        code: 200,
        message: '支付订单创建成功',
        data: response,
      };

  // 设置幂等缓存，TTL 120 秒（避免重复点按）
  await this.cacheService.set(cacheKey, resultWrapper, 300);
  return resultWrapper;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`创建支付订单失败: ${error.message}`, error.stack);
      throw new BadRequestException('创建支付订单失败');
    }
  }

  /**
   * 获取支付元数据：支付状态、订单状态、渠道、描述映射
   */
  async getPaymentMeta() {
    const paymentStatuses = Object.values(PaymentStatus);
    const orderStatuses = Object.values(OrderStatus);
    const paymentChannels = Object.keys(PaymentChannel);
    return {
      code: 200,
      message: '支付元数据获取成功',
      data: {
        paymentStatuses,
        orderStatuses,
        paymentChannels,
        descriptions: STATUS_DESCRIPTIONS,
      },
    };
  }

  /**
   * 生成复合幂等 key：paymentType:orderNo:sha256( amount|description ) 截取前16位
   */
  private generateIdempotencyKey(dto: CreatePaymentDto): string {
    const base = `${dto.amount}|${dto.description || ''}`;
    const hash = createHash('sha256').update(base).digest('hex').slice(0, 16);
    return `${dto.paymentType}:${dto.orderNo}:${hash}`;
  }

  /**
   * 根据订单号查找待支付的支付记录
   */
  async findPendingPaymentByOrderNo(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });
    if (!order) return null;

    return this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PENDING_PAYMENT,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建支付记录（供 wx-order-pay 发起支付时调用）
   */
  async createPaymentRecord(params: {
    orderId: string;
    orderNo: string;
    amount: number;
    paymentMethod: string;
  }) {
    return this.prisma.payment.create({
      data: {
        orderId: params.orderId,
        amount: params.amount,
        paymentType: 'FULL',
        paymentMethod: params.paymentMethod as any,
        status: PaymentStatus.PENDING_PAYMENT,
      },
    });
  }

  /**
   * 处理微信支付回调
   */
  async handleWxPayNotify(body: any, headers: Record<string, string>) {
    try {
      // 使用 V3 验证签名
      const timestamp = headers['wechatpay-timestamp'] as string;
      const nonce = headers['wechatpay-nonce'] as string;
      const signature = headers['wechatpay-signature'] as string;
      const serialNo = headers['wechatpay-serial'] as string;

      const isValid = this.wechatPayService.verifyNotifySignature(
        timestamp, nonce, JSON.stringify(body), signature, serialNo,
      );
      if (!isValid) {
        throw new BadRequestException('签名验证失败');
      }

      // V3: 回调数据在 resource 字段中，需要解密
      if (body.resource) {
        const notifyData = this.wechatPayService.decryptNotifyData(
          body.resource.ciphertext,
          body.resource.associated_data,
          body.resource.nonce,
        );
        await this.handlePaymentResult(notifyData);
      } else {
        this.logger.warn('微信回调缺少 resource 字段', JSON.stringify(body));
      }

      return { code: 'SUCCESS', message: '成功' };
    } catch (error) {
      this.logger.error(`处理微信支付回调失败: ${error.message}`, error.stack);
      return { code: 'FAIL', message: error.message };
    }
  }

  /**
   * 获取支付列表（包含未支付的订单）
   */
  async findAll(searchDto: PaymentSearchDto) {
    const {
      page = 1,
      limit = 20,
      phone,
      status,
      startDate,
      endDate,
      paymentType,
      orderNo,
      paymentNo,
      transactionId,
      minAmount,
      maxAmount,
      includeUnpaidOrders = true, // 是否包含未支付的订单
    } = searchDto;

    try {
      let allPaymentRecords: any[] = [];
      let totalCount = 0;

      // 1. 查询支付记录
      const paymentWhere: any = {};

      // 构建order查询条件
      const orderConditions: any = {};
      
      // 手机号查询
      if (phone) {
        orderConditions.user = { phone };
      }

      // 订单号查询
      if (orderNo) {
        orderConditions.orderNo = orderNo;
      }

      // 如果有order相关的查询条件，设置到paymentWhere中
      if (Object.keys(orderConditions).length > 0) {
        paymentWhere.order = orderConditions;
      }

      // 支付单号查询
      if (paymentNo) {
        paymentWhere.id = paymentNo;
      }

      // 第三方交易号查询
      if (transactionId) {
        paymentWhere.transactionId = { contains: transactionId, mode: 'insensitive' };
      }

      // 状态查询（映射到 Prisma PaymentStatus 枚举）
      const validPaymentStatuses = ['PENDING_PAYMENT', 'PARTIAL_PAID', 'FULLY_PAID', 'REFUNDING', 'PARTIAL_REFUNDED', 'REFUNDED', 'CANCELLED'];
      const statusToPrisma: Record<string, string> = {
        'PENDING_PAYMENT': 'PENDING_PAYMENT',
        'PARTIAL_PAID': 'PARTIAL_PAID',
        'FULLY_PAID': 'FULLY_PAID',
        'PAID': 'FULLY_PAID',
        'CANCELLED': 'CANCELLED',
        'REFUNDING': 'REFUNDING',
        'REFUNDED': 'REFUNDED',
        'PROCESSING': 'PENDING_PAYMENT',
        'FAILED': 'PENDING_PAYMENT',
      };
      if (status) {
        const prismaStatus = statusToPrisma[status];
        if (prismaStatus && validPaymentStatuses.includes(prismaStatus)) {
          paymentWhere.status = prismaStatus;
        }
      }

      // 支付方式查询（映射前端值到 Prisma PaymentMethod 枚举）
      const methodToPrisma: Record<string, string> = {
        'WECHAT': 'WECHAT_PAY',
        'ALIPAY': 'ALIPAY_TRANSFER',
        'CASH': 'CASH',
        'BANK_TRANSFER': 'BANK_CARD',
      };
      if (paymentType) {
        const prismaMethod = methodToPrisma[paymentType];
        if (prismaMethod) {
          paymentWhere.paymentMethod = prismaMethod;
        }
      }

      // 金额范围查询
      if (minAmount !== undefined || maxAmount !== undefined) {
        paymentWhere.amount = {};
        if (minAmount !== undefined) {
          paymentWhere.amount.gte = minAmount;
        }
        if (maxAmount !== undefined) {
          paymentWhere.amount.lte = maxAmount;
        }
      }

      // 时间范围查询
      if (startDate || endDate) {
        paymentWhere.createdAt = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          paymentWhere.createdAt.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          paymentWhere.createdAt.lte = end;
        }
      }

      // 查询支付记录
      const [payments, paymentCount] = await Promise.all([
        this.prisma.payment.findMany({
          where: paymentWhere,
          include: {
            order: {
              include: {
                user: {
                  select: { nickname: true, phone: true, openid: true },
                },
                package: {
                  select: { name: true, price: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.payment.count({ where: paymentWhere }),
      ]);

      allPaymentRecords = payments.map(payment => {
        // 如果订单已退款或部分退款，修正支付记录状态
        const refundedAmount = Number(payment.order?.refundedAmount || 0);
        const paidStatuses: string[] = ['FULLY_PAID', 'SUCCESS', 'PAID'];
        let displayStatus = payment.status;
        if (paidStatuses.includes(payment.status) && refundedAmount > 0) {
          displayStatus = refundedAmount >= Number(payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUNDED;
        }

        return {
        payment_id: payment.id,
        order_no: payment.order.orderNo,
        amount: Number(payment.amount),
        payment_type: payment.paymentType,
        payment_method: payment.paymentMethod,
        status: displayStatus,
        transaction_id: payment.transactionId,
        paid_at: payment.paidAt,
        created_at: payment.createdAt,
        order_info: {
          user: payment.order.user,
          package: payment.order.package,
          total_amount: Number(payment.order.totalAmount),
          order: payment.order,
        },
        refund_amount: Number(payment.order?.refundedAmount || 0),
        refund_reason: payment.refundReason,
      };
    });

      // 2. 如果需要包含未支付订单,查询未支付的订单
      // 但是如果用户搜索了特定的支付单号或第三方交易号,则不包含未支付订单
      if (includeUnpaidOrders && (!status || status === 'PENDING') && !paymentNo && !transactionId) {
        const unpaidOrderWhere: any = {
          paymentStatus: PaymentStatus.PENDING_PAYMENT, // 未支付状态
        };

        // 应用相同的搜索条件
        if (phone) {
          unpaidOrderWhere.user = { phone };
        }
        if (orderNo) {
          // 如果已经设置了手机号查询，需要合并条件
          if (unpaidOrderWhere.user) {
            // 需要同时满足手机号和订单号
            unpaidOrderWhere.AND = [
              { user: unpaidOrderWhere.user },
              { orderNo }
            ];
            delete unpaidOrderWhere.user;
          } else {
            unpaidOrderWhere.orderNo = orderNo;
          }
        }
        if (startDate || endDate) {
          unpaidOrderWhere.createdAt = {};
          if (startDate) unpaidOrderWhere.createdAt.gte = new Date(startDate);
          if (endDate) unpaidOrderWhere.createdAt.lte = new Date(endDate);
        }

        // 排除已有支付记录的订单
        const existingOrderNos = payments.map(p => p.order.orderNo);
        if (existingOrderNos.length > 0) {
          if (unpaidOrderWhere.orderNo && typeof unpaidOrderWhere.orderNo === 'string') {
            // 如果已经有orderNo查询，需要同时满足orderNo查询和notIn条件
            unpaidOrderWhere.AND = [
              ...(unpaidOrderWhere.AND || []),
              { orderNo: unpaidOrderWhere.orderNo },
              { orderNo: { notIn: existingOrderNos } }
            ];
            delete unpaidOrderWhere.orderNo;
          } else {
            unpaidOrderWhere.orderNo = { notIn: existingOrderNos };
          }
        }

        const unpaidOrders = await this.prisma.order.findMany({
          where: unpaidOrderWhere,
          include: {
            user: {
              select: { nickname: true, phone: true, openid: true },
            },
            package: {
              select: { name: true, price: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100, // 性能优化：限制最多查询100条虚拟未支付订单，防止大数据集查询
        });

        // 将未支付订单转换为支付记录格式
        const unpaidPaymentRecords = unpaidOrders.map(order => ({
          payment_id: `PENDING_${order.orderNo}`,
          order_no: order.orderNo,
          amount: Number(order.depositAmount || order.totalAmount), // 使用定金或总金额
          payment_type: null,
          payment_method: null, // 无支付记录，无支付方式
          status: PaymentStatus.PENDING_PAYMENT,
          transaction_id: null,
          paid_at: null,
          created_at: order.createdAt,
          order_info: {
            user: order.user,
            package: order.package,
            total_amount: Number(order.totalAmount),
            order: order,
          },
          refund_amount: 0,
          refund_reason: null,
        }));

        allPaymentRecords = [...allPaymentRecords, ...unpaidPaymentRecords];
        totalCount = paymentCount + unpaidOrders.length;
      } else {
        totalCount = paymentCount;
      }

      // 3. 金额范围过滤
      if (minAmount !== undefined || maxAmount !== undefined) {
        allPaymentRecords = allPaymentRecords.filter(record => {
          const amount = Number(record.amount);
          if (minAmount !== undefined && amount < minAmount) return false;
          if (maxAmount !== undefined && amount > maxAmount) return false;
          return true;
        });
        totalCount = allPaymentRecords.length;
      }

      // 4. 排序和分页
      allPaymentRecords.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const paginatedRecords = allPaymentRecords.slice(
        (page - 1) * limit,
        page * limit
      );

      return {
        code: 200,
        message: '查询成功',
        data: {
          payments: paginatedRecords,
          pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询支付列表失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 通过手机号查找支付记录
   */
  async findByPhone(
    phone: string,
    pagination: { page: number; limit: number },
  ) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'payment-phone',
        phone,
        pagination.page.toString(),
        pagination.limit.toString(),
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const { page, limit } = pagination;

          const [payments, total] = await Promise.all([
            this.prisma.payment.findMany({
              where: {
                order: {
                  user: { phone },
                },
              },
              include: {
                order: {
                  include: {
                    package: {
                      select: { name: true, price: true },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            this.prisma.payment.count({
              where: {
                order: {
                  user: { phone },
                },
              },
            }),
          ]);

          if (total === 0) {
            throw new NotFoundException('未找到相关支付记录');
          }

          return {
            code: 200,
            message: '查询成功',
            data: {
              payments: payments.map((payment) => ({
                payment_id: payment.id,
                order_no: payment.order.orderNo,
                amount: Number(payment.amount),
                payment_type: payment.paymentType,
                status: payment.status,
                transaction_id: payment.transactionId,
                paid_at: payment.paidAt,
                created_at: payment.createdAt,
                package_info: payment.order.package,
                order_amount: Number(payment.order.totalAmount),
              })),
              pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
              },
            },
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `通过手机号查找支付记录失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 通过订单号查找支付记录
   */
  async findByOrderNo(orderNo: string) {
    try {
      const cacheKey = this.cacheService.generateKey('payment-order', orderNo);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const payments = await this.prisma.payment.findMany({
            where: {
              order: {
                orderNo,
              },
            },
            include: {
              order: {
                include: {
                  user: {
                    select: { nickname: true, phone: true },
                  },
                  package: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (payments.length === 0) {
            throw new NotFoundException('未找到相关支付记录');
          }

          return {
            code: 200,
            message: '查询成功',
            data: payments.map((payment) => ({
              payment_id: payment.id,
              order_no: payment.order.orderNo,
              amount: Number(payment.amount),
              payment_type: payment.paymentType,
              status: payment.status,
              transaction_id: payment.transactionId,
              paid_at: payment.paidAt,
              created_at: payment.createdAt,
              order_info: payment.order,
            })),
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `通过订单号查找支付记录失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 获取支付详情
   */
  async findOne(id: string) {
  const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    return {
      ...payment,
      refund_amount: Number(payment.order?.refundedAmount || 0),
    };
  }

  /**
   * 更新支付信息
   */
  async update(id: string, updatePaymentDto: UpdatePaymentDto) {
    // 首先检查支付记录是否存在
    await this.findOne(id);

    // 准备更新数据
    const data: any = { ...updatePaymentDto };
    
    // 如果有 paidAt 字段，转换为 Date 对象
    if (updatePaymentDto.paidAt) {
      data.paidAt = new Date(updatePaymentDto.paidAt);
    }

    // 如果有 refundedAt 字段，转换为 Date 对象
    if (updatePaymentDto.refundedAt) {
      data.refundedAt = new Date(updatePaymentDto.refundedAt);
    }

    // 更新支付记录
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data,
      include: { order: true },
    });

    return updatedPayment;
  }

  /**
   * 申请退款
   */
  async refund(id: string, refundPaymentDto: RefundPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    const { refundAmount, refundReason } = refundPaymentDto;
    const refundNo = this.generateRefundNo();

    // 调用微信退款API
    let transactionId: string;
    try {
      const result = await this.wechatPayService.refund({
        outTradeNo: payment.order.orderNo,
        outRefundNo: refundNo,
        totalFee: Math.round(Number(payment.amount) * 100),
        refundFee: Math.round(Number(refundAmount) * 100),
        refundDesc: refundReason || '管理员退款',
      });
      transactionId = result.refundId;
      this.logger.log(`微信退款成功: transactionId=${result.refundId}`);
    } catch (error) {
      this.logger.error(`微信退款API调用失败: ${error.message}`);
      throw new BadRequestException(`微信退款失败: ${error.message}`);
    }

    // 更新支付状态为 REFUNDED，同时更新订单的累计退款金额并创建退款记录
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { status: 'REFUNDED' },
      });

      const newPaidAmount = Math.max(0, Number(payment.order.paidAmount) - Number(refundAmount));
      const orderTotal = Number(payment.order.totalAmount);

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          refundedAmount: {
            increment: Number(refundAmount),
          },
          paidAmount: newPaidAmount,
          paymentStatus: newPaidAmount <= 0
            ? PaymentStatus.REFUNDED
            : newPaidAmount >= orderTotal
              ? PaymentStatus.FULLY_PAID
              : PaymentStatus.PARTIAL_PAID,
        },
      });

      await tx.refundRequest.create({
        data: {
          orderId: payment.orderId,
          orderNo: payment.order.orderNo,
          refundNo: refundNo,
          refundType: RefundType.PARTIAL,
          refundAmount: refundAmount,
          refundReason: refundReason || '管理员退款',
          refundMethod: RefundMethod.ORIGINAL,
          transactionId: transactionId,
          applicantType: 'ADMIN',
          status: RefundStatus.COMPLETED,
          approvedBy: 'SYSTEM',
          approvedAt: new Date(),
          refundedBy: 'SYSTEM',
          refundedAt: new Date(),
        },
      });

      // v1.2.4+5: 团购退款处理 — 全款退款时更新参团状态并回收优惠券
      if (payment.order.groupBuyActivityId && payment.order.wxUserId && Number(refundAmount) >= Number(payment.amount)) {
        await tx.groupBuyParticipant.updateMany({
          where: { activityId: payment.order.groupBuyActivityId, userId: payment.order.wxUserId },
          data: { status: 'REFUNDED' },
        });
        this.logger.log(`团购参团状态已更新 REFUNDED: activity=${payment.order.groupBuyActivityId}, user=${payment.order.wxUserId}`);

        const act = await tx.groupBuyActivity.findUnique({
          where: { id: payment.order.groupBuyActivityId },
          select: { packageId: true },
        });
        if (act) {
          const gbCoupons = await tx.coupon.findMany({
            where: { couponType: 'GROUP_BUY', applicableIds: { has: act.packageId } },
            select: { id: true },
          });
          if (gbCoupons.length > 0) {
            const r = await tx.userCoupon.updateMany({
              where: { wxUserId: payment.order.wxUserId, couponId: { in: gbCoupons.map(c => c.id) }, status: 'UNUSED' },
              data: { status: 'EXPIRED' },
            });
            if (r.count > 0) this.logger.log(`团购优惠券已回收: ${r.count} 张`);
          }
        }
      }
    });

    return this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
  }

  /**
   * 取消支付
   */
  async cancel(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    // 更新支付状态为 CANCELLED
    await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.CANCELLED },
    });

    return this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
  }

  /**
   * 删除支付记录
   */
  async remove(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    await this.prisma.payment.delete({
      where: { id },
    });

    return { message: 'Payment deleted successfully' };
  }

  /**
   * 获取支付状态
   */
  async getPaymentStatus(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: { status: true, transactionId: true, paidAt: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    return payment;
  }

  /**
   * 获取支付统计信息
   */
  async getPaymentStatistics(query: any = {}) {
    const { startDate, endDate, paymentType } = query;

    try {
      // 构建基础查询条件
      const where: any = {};
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (paymentType) {
        where.paymentType = paymentType;
      }

      // 并行查询各种统计数据
      const [
        totalPayments,
  successPayments, // 已支付计数（统一内部状态 PAID）
        failedPayments,
        pendingPayments,
        totalAmountResult,
        todayAmountResult,
        refundAmountResult,
      ] = await Promise.all([
        // 总支付记录数
        this.prisma.payment.count({ where }),
        
        // 成功支付数
        this.prisma.payment.count({ 
          where: { ...where, status: PaymentStatus.FULLY_PAID } 
        }),
        
        // 失败/取消支付数
        this.prisma.payment.count({ 
          where: { ...where, status: PaymentStatus.CANCELLED } 
        }),
        
        // 待支付数（包括未支付订单）
        this.prisma.order.count({
          where: {
            paymentStatus: PaymentStatus.PENDING_PAYMENT,
            ...((startDate || endDate) && {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              }
            })
          }
        }),
        
        // 总交易额
        this.prisma.payment.aggregate({
          where: { ...where, status: PaymentStatus.FULLY_PAID },
          _sum: { amount: true },
        }),
        
        // 今日交易额
        this.prisma.payment.aggregate({
          where: {
            ...where,
            status: PaymentStatus.FULLY_PAID,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          _sum: { amount: true },
        }),
        
        // 退款总额（汇总已退款订单的累计退款金额）
        this.prisma.order.aggregate({
          where: {
            payments: {
              some: {
                status: PaymentStatus.REFUNDED,
                ...((startDate || endDate) && {
                  updatedAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                  }
                }),
              },
            },
            ...(paymentType && { payments: { some: { paymentType } } }),
          },
          _sum: { refundedAmount: true },
        }),
      ]);

      // 计算转化率
      const totalOrdersWithPaymentAttempt = totalPayments + pendingPayments;
      const conversionRate = totalOrdersWithPaymentAttempt > 0 
        ? (successPayments / totalOrdersWithPaymentAttempt) * 100 
        : 0;

      return {
        code: 200,
        message: '统计查询成功',
        data: {
          totalCount: totalPayments,
          successCount: successPayments,
          failedCount: failedPayments,
          pendingCount: pendingPayments,
          totalAmount: Number(totalAmountResult._sum?.amount || 0),
          todayAmount: Number(todayAmountResult._sum?.amount || 0),
          refundAmount: Number(refundAmountResult._sum?.refundedAmount || 0),
          conversionRate: Math.round(conversionRate * 100) / 100, // 保留2位小数
        },
      };
    } catch (error) {
      this.logger.error(`获取支付统计失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取统计数据失败');
    }
  }

  /**
   * 手动同步支付状态
   */
  async syncPaymentStatus(id: string) {
    // 虚拟支付记录无真实 Payment 记录，不允许同步
    if (id.startsWith('PENDING_')) {
      throw new BadRequestException('该订单尚未创建支付记录，请先确认收款');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    // 已退款/退款中的支付不改变状态
    if (payment.status === 'REFUNDED' || payment.status === 'REFUNDING' || payment.status === 'PARTIAL_REFUNDED') {
      return this.prisma.payment.findUnique({
        where: { id },
        include: { order: true },
      });
    }

    // TODO: 调用支付网关查询支付状态接口
    // 已支付状态不做变更（待接入微信查询接口后改为真实查询）
    if (payment.status === 'FULLY_PAID') {
      return this.prisma.payment.findUnique({
        where: { id },
        include: { order: true },
      });
    }

    return this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });
  }

  /**
   * 导出支付数据
   */
  async exportPayments(searchDto: PaymentSearchDto) {
    try {
      // 构建查询条件
      const where = this.buildPaymentSearchConditions(searchDto);

      // 获取支付数据
      const payments = await this.prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              user: {
                select: {
                  nickname: true,
                  phone: true,
                },
              },
              package: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000, // 限制导出数量
      });

      // 转换数据格式用于导出
      const exportData = payments.map((payment, index) => ({
        序号: index + 1,
        支付单号: payment.id,
        关联订单: payment.order?.orderNo || '',
        用户昵称: payment.order?.user?.nickname || '',
        用户手机: payment.order?.user?.phone || '',
        套餐名称: payment.order?.package?.name || '',
        支付金额: Number(payment.amount || 0),
        支付方式: this.getPaymentMethodText(payment.paymentType),
        支付状态: this.getPaymentStatusText(payment.status),
        第三方单号: payment.transactionId || '',
        支付时间: payment.paidAt ? new Date(payment.paidAt).toLocaleString('zh-CN') : '',
        创建时间: new Date(payment.createdAt).toLocaleString('zh-CN'),
      }));

      return {
        code: 200,
        message: '导出数据获取成功',
        data: exportData,
        total: exportData.length,
      };
    } catch (error) {
      this.logger.error(`导出支付数据失败: ${error.message}`, error.stack);
      throw new BadRequestException('导出数据失败');
    }
  }

  /**
   * 获取支付趋势数据
   */
  async getPaymentTrends(period: string = '7d') {
    try {
      const days = period === '30d' ? 30 : 7;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trends: Array<{ date: string; payments: number; amount: number }> = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const [dayPayments, dayAmount] = await Promise.all([
          this.prisma.payment.count({
            where: {
              status: PaymentStatus.FULLY_PAID,
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              },
            },
          }),
          this.prisma.payment.aggregate({
            where: {
              status: PaymentStatus.FULLY_PAID,
              createdAt: {
                gte: dayStart,
                lte: dayEnd,
              },
            },
            _sum: { amount: true },
          }),
        ]);

        trends.push({
          date: formatLocalDate(currentDate),
          payments: dayPayments,
          amount: Number(dayAmount._sum?.amount || 0),
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        code: 200,
        message: '趋势数据获取成功',
        data: trends,
      };
    } catch (error) {
      this.logger.error(`获取支付趋势失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取趋势数据失败');
    }
  }

  // 私有辅助方法

  /**
   * 处理支付结果
   */
  async handlePaymentResult(notifyData: any) {
    const { out_trade_no, transaction_id, trade_state, amount } = notifyData;

    // 先通过订单号查找订单
    const order = await this.prisma.order.findUnique({
      where: { orderNo: out_trade_no },
      include: {
        payments: {
          where: { status: { in: [PaymentStatus.PENDING_PAYMENT, PaymentStatus.PARTIAL_PAID, PaymentStatus.FULLY_PAID] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`订单不存在: ${out_trade_no}`);
    }

    // 查找已有支付记录（pending状态的可复用，已支付的防止重复）
    let payment = order.payments?.[0] || null;

    // 如果已有已支付的记录，直接返回（幂等）
    if (payment && payment.status === PaymentStatus.FULLY_PAID) {
      this.logger.warn(`幂等处理: 支付已处理 order=${out_trade_no} payment=${payment.id}`);
      return {
        success: true,
        message: '支付已处理',
        payment,
        order,
      };
    }

    // 计算支付金额（兼容 WeChat APIv3 对象格式和数字格式）
    let paidAmount: number;
    if (typeof amount === 'object' && amount !== null) {
      paidAmount = Number(amount.total) / 100; // APIv3 金额单位是分
    } else {
      paidAmount = Number(amount) || 0;
    }

    // 确定支付类型
    const paymentType = this.determinePaymentTypeFromOrder(order);

    // 如果没有支付记录，创建新的
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: paidAmount,
          paymentType: paymentType as any,
          status: PaymentStatus.PENDING_PAYMENT,
          paymentMethod: 'WECHAT_PAY',
        },
        include: { order: true },
      });
      this.logger.log(`微信支付回调自动创建支付记录: ${payment.id}`);
    }

    // 更新支付状态
    let status: string;
    let paidAt: Date | null = null;

    switch (trade_state) {
      case 'SUCCESS':
        status = PaymentStatus.FULLY_PAID;
        paidAt = new Date();
        break;
      case 'USERPAYING':
        status = PaymentStatus.PENDING_PAYMENT;
        this.logger.log(`支付处理中: ${out_trade_no}，等待微信最终结果`);
        break;
      case 'CLOSED':
      case 'REVOKED':
        status = PaymentStatus.CANCELLED;
        break;
      default:
        status = PaymentStatus.CANCELLED;
    }

    // 更新支付记录
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status as any,
        transactionId: transaction_id || payment.transactionId,
        paidAt: status === PaymentStatus.FULLY_PAID ? (paidAt || new Date()) : payment.paidAt,
      },
    });

    // 如果支付成功，更新订单状态
    if (status === PaymentStatus.FULLY_PAID) {
      await this.updateOrderAfterPayment(
        order.orderNo,
        paidAmount,
      );

      // 支付成功后锁定时间槽（订单创建时不再锁定，防止不付款占位）
      if (order.timeSlotId) {
        try {
          const timeSlot = await this.prisma.timeSlot.findUnique({
            where: { id: order.timeSlotId },
          });
          if (timeSlot) {
            // 检查容量，防止超卖
            if ((timeSlot.bookedCount || 0) >= timeSlot.capacity) {
              this.logger.warn(`时间槽已满但仍收到支付: slot=${order.timeSlotId}, order=${order.orderNo}`);
            } else {
              const newBookedCount = (timeSlot.bookedCount || 0) + 1;
              const isFullyBooked = newBookedCount >= timeSlot.capacity;
              await this.prisma.timeSlot.update({
                where: { id: order.timeSlotId },
                data: {
                  bookedCount: newBookedCount,
                  availableCount: Math.max(0, timeSlot.capacity - newBookedCount),
                  isBooked: isFullyBooked,
                  status: isFullyBooked ? 'BOOKED' : 'AVAILABLE',
                },
              });
              this.logger.log(`支付成功锁定时间槽: slot=${order.timeSlotId}, 预订 ${newBookedCount}/${timeSlot.capacity}`);
            }
          }
        } catch (slotErr) {
          this.logger.error(`锁定时间槽失败: ${slotErr.message}`, slotErr.stack);
        }
      }

      // 触发自动状态转换
      await this.autoStatusTransitionService.onPaymentSuccess(
        order.id,
        transaction_id
      );

      // 发送支付成功通知
      await this.notificationService.sendPaymentSuccessNotification(
        order.orderNo,
      );
    }

    this.logger.log(`支付状态更新: ${out_trade_no} -> ${status}`);
  }

  /**
   * 根据订单支付模式确定支付类型
   */
  private determinePaymentTypeFromOrder(order: any): string {
    const paymentMode = order.paymentMode || 'FULL';
    if (paymentMode.includes('DEPOSIT')) {
      const paidAmount = Number(order.paidAmount || 0);
      return paidAmount === 0 ? 'DEPOSIT' : 'FINAL';
    }
    return 'FULL';
  }

  /**
   * 支付成功后更新订单
   */
  private async updateOrderAfterPayment(orderNo: string, paidAmount: number) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) return;

    // 从支付记录重新计算已付总额，而非简单累加，防止重复调用导致数据膨胀
    const payments = await this.prisma.payment.findMany({
      where: {
        orderId: order.id,
        status: { in: ['FULLY_PAID', 'PARTIAL_PAID'] },
      },
    });
    const newPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(order.totalAmount);

    let paymentStatus: string;
    if (newPaidAmount >= totalAmount) {
      paymentStatus = 'FULLY_PAID';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'PARTIAL_PAID';
    } else {
      paymentStatus = 'PENDING_PAYMENT';
    }

    await this.prisma.order.update({
      where: { orderNo },
      data: {
        paidAmount: newPaidAmount,
        paymentStatus: paymentStatus as any,
      },
    });

    // 清除相关缓存
    const cacheKeys = [
      this.cacheService.getOrderCacheKey(orderNo),
      this.cacheService.generateKey('payment-order', orderNo),
    ];

    await Promise.all(cacheKeys.map((key) => this.cacheService.del(key)));
  }

  /**
   * 生成支付ID
   */
  private generatePaymentId(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `PAY${timestamp}${random}`;
  }

  /**
   * 构建支付查询条件
   */
  private buildPaymentSearchConditions(searchDto: PaymentSearchDto) {
    const where: any = {};

    if (searchDto.paymentNo) {
      where.id = searchDto.paymentNo; // 精确匹配支付单号
    }

    if (searchDto.orderNo) {
      where.order = {
        orderNo: { contains: searchDto.orderNo, mode: 'insensitive' },
      };
    }

    if (searchDto.phone) {
      where.order = {
        ...where.order,
        user: { phone: { contains: searchDto.phone, mode: 'insensitive' } },
      };
    }

    if (searchDto.paymentType) {
      where.paymentType = searchDto.paymentType;
    }

    if (searchDto.status) {
      where.status = searchDto.status;
    }

    if (searchDto.transactionId) {
      where.transactionId = { contains: searchDto.transactionId, mode: 'insensitive' };
    }

    if (searchDto.startDate || searchDto.endDate) {
      where.createdAt = {};
      if (searchDto.startDate) {
        where.createdAt.gte = new Date(searchDto.startDate);
      }
      if (searchDto.endDate) {
        where.createdAt.lte = new Date(searchDto.endDate);
      }
    }

    if (searchDto.minAmount || searchDto.maxAmount) {
      where.amount = {};
      if (searchDto.minAmount) {
        where.amount.gte = Number(searchDto.minAmount);
      }
      if (searchDto.maxAmount) {
        where.amount.lte = Number(searchDto.maxAmount);
      }
    }

    return where;
  }

  /**
   * 获取支付方式文本
   */
  private getPaymentMethodText(paymentType: string): string {
    const methodMap: { [key: string]: string } = {
      'WECHAT': '微信支付',
      'ALIPAY': '支付宝',
      'CASH': '现金支付',
      'BANK_TRANSFER': '银行卡支付',
      'DEPOSIT': '定金支付',
      'FULL_PAYMENT': '全款支付',
    };
    return methodMap[paymentType] || paymentType;
  }

  /**
   * 获取订单余额信息
   */
  async getOrderBalance(orderId: string): Promise<BalanceInfoDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const totalAmount = Number(order.totalAmount);
    
    // 计算所有支付金额
    const paidPayments = order.payments.filter(payment => 
      payment.status === 'FULLY_PAID'
    );
    const totalPaidAmount = paidPayments.reduce((sum, payment) => 
      sum + Number(payment.amount), 0
    );
    
    // 计算退款金额
    const refundedPayments = order.payments.filter(payment => 
      payment.status === OrderStatus.CANCELLED
    );
    const totalRefundedAmount = refundedPayments.reduce((sum, payment) => 
      sum + Number(payment.amount), 0
    );
    
    // 实际已付金额 = 总支付金额 - 退款金额
    const actualPaidAmount = totalPaidAmount - totalRefundedAmount;
    
    // 调试日志
    this.logger.log(`订单${orderId}余额计算:`);
    this.logger.log(`总支付记录: ${order.payments.length}`);
    this.logger.log(`已付支付记录: ${paidPayments.length}, 金额: ${totalPaidAmount}`);
    this.logger.log(`退款支付记录: ${refundedPayments.length}, 金额: ${totalRefundedAmount}`);
    this.logger.log(`实际已付金额: ${actualPaidAmount}`);
    order.payments.forEach(p => {
      this.logger.log(`支付记录: ${p.id}, 金额: ${p.amount}, 状态: ${p.status}, 类型: ${p.paymentType}`);
    });
    
    const remainingAmount = totalAmount - actualPaidAmount;

    // 🔥 计算多收款金额
    const overpaidAmount = actualPaidAmount > totalAmount ? actualPaidAmount - totalAmount : 0;

    // 根据实际支付情况确定支付状态
    let paymentStatus: string;
    let isFreeOrder = false;  // 是否为免费订单
    
    if (totalAmount === 0) {
      // 🔥 免费订单
      isFreeOrder = true;
      if (actualPaidAmount > 0) {
        // 免费订单但有收款 - 异常情况
        paymentStatus = 'OVERPAID';  // 多收款
      } else {
        paymentStatus = 'FREE';  // 免费
      }
    } else if (actualPaidAmount > totalAmount) {
      // 🔥 多收款
      paymentStatus = 'OVERPAID';
    } else if (actualPaidAmount >= totalAmount) {
      paymentStatus = 'PAID';
    } else if (actualPaidAmount > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PENDING';
    }

    return {
      totalAmount,
      paidAmount: actualPaidAmount,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      overpaidAmount,  // 🔥 新增：多收款金额
      isFreeOrder,     // 🔥 新增：是否为免费订单
      isFullyPaid: actualPaidAmount >= totalAmount && totalAmount > 0,
      isOverpaid: actualPaidAmount > totalAmount,  // 🔥 新增：是否多收款
      paymentStatus: paymentStatus as any,
      payments: order.payments.map(payment => ({
        id: payment.id,
        amount: Number(payment.amount),
        paymentType: payment.paymentType,
        status: payment.status,
        createdAt: payment.createdAt,
        transactionId: payment.transactionId,
      })),
    };
  }

  /**
   * 收取尾款
   */
  async collectBalance(collectBalanceDto: CollectBalanceDto) {
    const { orderId, amount, paymentType, notes } = collectBalanceDto;

    try {
      this.logger.log(`开始收取尾款，订单ID: ${orderId}, 金额: ${amount}, 支付方式: ${paymentType}`);
      
      return await this.prisma.$transaction(async (tx) => {
        // 1. 获取订单信息
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { user: true, package: true },
        });

        if (!order) {
          throw new NotFoundException('订单不存在');
        }

        this.logger.log(`找到订单: ${order.orderNo}, 总额: ${order.totalAmount}, 已付: ${order.paidAmount}`);

        // 2. 检查订单状态 - 已取消或已退款的订单不能收款
      if (order.orderStatus === 'CANCELLED') {
        throw new BadRequestException('订单已取消，无法收取尾款。如需继续请先恢复订单或申请退款。');
      }

      if ((order.orderStatus as any) === OrderStatus.CANCELLED) {
        throw new BadRequestException('订单已退款，无法收取尾款。');
      }

      // 注意：允许已完成订单收款（先服务后付款的业务场景）
      // if (order.orderStatus === 'COMPLETED') {
      //   throw new BadRequestException('订单已完成，无法收取尾款。');
      // }

      // 3. 计算剩余金额
      const totalAmount = Number(order.totalAmount);
      const paidAmount = Number(order.paidAmount);
      
      // 🔥 新增：检查免费订单（总额为0）
      if (totalAmount === 0) {
        throw new BadRequestException(
          '该订单为免费订单（订单总额为0），不允许收款。如需收款，请先调整订单金额。'
        );
      }

      // 🔥 新增：检查是否已经多收款
      if (paidAmount > totalAmount) {
        const overpaid = paidAmount - totalAmount;
        throw new BadRequestException(
          `该订单已多收款 ¥${overpaid.toFixed(2)}，实际已付 ¥${paidAmount}，订单总额 ¥${totalAmount}。请先处理多收款项，再进行新的收款操作。`
        );
      }

      const remainingAmount = totalAmount - paidAmount;

      // 4. 验证收取金额
      if (amount > remainingAmount) {
        throw new BadRequestException(
          `收取金额 ¥${amount} 超过剩余金额 ¥${remainingAmount}`
        );
      }

      if (remainingAmount <= 0) {
        throw new BadRequestException('该订单已全额支付，无需收取尾款');
      }

      // 5. 创建支付记录
      const payment = await tx.payment.create({
        data: {
          orderId: orderId,
          paymentType: 'FINAL', // 尾款类型
          paymentMethod: paymentType as any, // 支付方式（CASH/WECHAT_PAY等）
          amount,
          status: PaymentStatus.FULLY_PAID, // 现金收款直接标记为已支付
          paidAt: new Date(),
        },
      });

      // 6. 更新订单已付金额
      const newPaidAmount = paidAmount + amount;
      // 修复浮点数比较问题：使用容差比较，或者四舍五入到2位小数
      const roundedPaidAmount = Math.round(newPaidAmount * 100) / 100;
      const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
      const isFullyPaid = roundedPaidAmount >= roundedTotalAmount;

      this.logger.log(
        `订单 ${order.orderNo} 收款: 已付=${newPaidAmount}, 总额=${totalAmount}, ` +
        `四舍五入后: 已付=${roundedPaidAmount}, 总额=${roundedTotalAmount}, ` +
        `是否全额支付=${isFullyPaid}`
      );

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: (isFullyPaid ? 'FULLY_PAID' : 'PARTIAL_PAID') as any,
          // 如果全额支付且订单已确认，可以进入进行中状态
          orderStatus: isFullyPaid && order.orderStatus === 'CONFIRMED' 
            ? 'IN_PROGRESS' 
            : order.orderStatus,
          updatedAt: new Date(),
        },
        include: {
          user: { select: { nickname: true, phone: true } },
          package: { select: { name: true } },
        },
      });

      // 6. 记录状态变更日志
      if (isFullyPaid && order.orderStatus === 'CONFIRMED') {
        this.logger.log(`订单 ${order.orderNo} 尾款收取完成，状态变更为进行中`);
      }

      this.logger.log(`收款成功，订单: ${order.orderNo}, 本次收款: ¥${amount}, 已付总额: ¥${newPaidAmount}`);

      return {
        code: 200,
        message: isFullyPaid ? '尾款收取成功，订单已全额支付' : '尾款收取成功',
        data: {
          paymentId: payment.id,
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          collectAmount: amount,
          totalAmount,
          paidAmount: newPaidAmount,
          remainingAmount: totalAmount - newPaidAmount,
          isFullyPaid,
          paymentStatus: updatedOrder.paymentStatus,
          orderStatus: updatedOrder.orderStatus,
          payment: {
            id: payment.id,
            amount: Number(payment.amount),
            paymentType: payment.paymentType,
            status: payment.status,
            paidAt: payment.paidAt,
          },
        },
      };
      });
    } catch (error) {
      this.logger.error(`收取尾款失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 确认支付(手动确认)
   * 用于现金支付等需要人工确认的场景
   */
  async confirmPayment(paymentId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 处理 PENDING_ 开头的虚拟支付记录 → 自动创建真实支付记录
      if (paymentId.startsWith('PENDING_')) {
        const orderNo = paymentId.replace('PENDING_', '');
        const order = await tx.order.findUnique({
          where: { orderNo },
          include: {
            items: {
              where: { itemType: 'PRODUCT' },
              include: { product: true },
            },
          },
        });
        if (!order) {
          throw new NotFoundException(`订单 ${orderNo} 不存在`);
        }

        const amount = Number(order.depositAmount || order.totalAmount);

        // 创建真实支付记录
        const newPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount,
            paymentType: 'DEPOSIT' as any,
            paymentMethod: 'CASH' as any,
            status: PaymentStatus.FULLY_PAID,
            paidAt: new Date(),
            notes: `现金确认收款（原虚拟记录 ${paymentId}）`,
          },
        });

        // 计算订单总已付金额
        const payments = await tx.payment.findMany({
          where: { orderId: order.id, status: PaymentStatus.FULLY_PAID },
        });
        const totalPaidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalAmount = Number(order.totalAmount);
        const roundedPaidAmount = Math.round(totalPaidAmount * 100) / 100;
        const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
        const isFullyPaid = roundedPaidAmount >= roundedTotalAmount;

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: totalPaidAmount,
            paymentStatus: (isFullyPaid ? 'FULLY_PAID' : 'PARTIAL_PAID') as any,
            orderStatus: isFullyPaid && order.orderStatus === 'PENDING'
              ? 'IN_PROGRESS'
              : order.orderStatus,
          },
        });

        // 4. 扣减商品库存 (先付款后付货)
        if (isFullyPaid && order.items && order.items.length > 0) {
          for (const item of order.items) {
            const product = item.product;
            if (product && product.isTrackStock) {
              if (product.stockQuantity < item.quantity) {
                throw new BadRequestException(
                  `商品 ${product.name} 库存不足，当前库存：${product.stockQuantity}，需要：${item.quantity}`
                );
              }
              await tx.product.update({
                where: { id: product.id },
                data: { stockQuantity: { decrement: item.quantity } },
              });
              this.logger.log(`库存扣减: ${product.name} x${item.quantity}, 剩余: ${product.stockQuantity - item.quantity}`);
            }
          }
        }

        // 5. 确认收款后锁定时间槽
        if (isFullyPaid && order.timeSlotId) {
          try {
            const timeSlot = await tx.timeSlot.findUnique({
              where: { id: order.timeSlotId },
            });
            if (timeSlot) {
              if ((timeSlot.bookedCount || 0) >= timeSlot.capacity) {
                this.logger.warn(`时间槽已满但仍收到确认: slot=${order.timeSlotId}, order=${order.orderNo}`);
              } else {
                const newBookedCount = (timeSlot.bookedCount || 0) + 1;
                const isFullyBooked = newBookedCount >= timeSlot.capacity;
                await tx.timeSlot.update({
                  where: { id: order.timeSlotId },
                  data: {
                    bookedCount: newBookedCount,
                    availableCount: Math.max(0, timeSlot.capacity - newBookedCount),
                    isBooked: isFullyBooked,
                    status: isFullyBooked ? 'BOOKED' : 'AVAILABLE',
                  },
                });
                this.logger.log(`确认收款锁定时间槽: slot=${order.timeSlotId}, 预订 ${newBookedCount}/${timeSlot.capacity}`);
              }
            }
          } catch (slotErr) {
            this.logger.error(`锁定时间槽失败: ${slotErr.message}`, slotErr.stack);
          }
        }

        this.logger.log(
          `虚拟支付确认: ${paymentId} → 创建真实支付 ${newPayment.id}, 订单 ${order.orderNo}`
        );

        return {
          code: 200,
          message: isFullyPaid ? '收款成功,订单已全额支付' : '收款成功',
          data: {
            paymentId: newPayment.id,
            orderId: updatedOrder.id,
            orderNo: updatedOrder.orderNo,
            paidAmount: totalPaidAmount,
            totalAmount,
            remainingAmount: totalAmount - totalPaidAmount,
            isFullyPaid,
            paymentStatus: updatedOrder.paymentStatus,
            orderStatus: updatedOrder.orderStatus,
          },
        };
      }

      // 1. 获取支付记录
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException('支付记录不存在');
      }

      if (payment.status === PaymentStatus.FULLY_PAID) {
        throw new BadRequestException('该支付已确认,无需重复操作');
      }

      // 2. 更新支付状态
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FULLY_PAID,
          paidAt: new Date(),
        },
      });

      // 3. 同步订单支付状态 (关键!!)
      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: {
          payments: true,
          items: {
            where: { itemType: 'PRODUCT' },
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('关联订单不存在');
      }

      // 计算总已付金额
      const totalPaidAmount = order.payments
  .filter(p => p.status === 'FULLY_PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const totalAmount = Number(order.totalAmount);
      
      // 修复浮点数比较问题：四舍五入到2位小数后比较
      const roundedPaidAmount = Math.round(totalPaidAmount * 100) / 100;
      const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
      const isFullyPaid = roundedPaidAmount >= roundedTotalAmount;

      this.logger.log(
        `确认支付 ${paymentId}, 订单 ${order.orderNo}: 已付=${totalPaidAmount}, 总额=${totalAmount}, ` +
        `四舍五入后: 已付=${roundedPaidAmount}, 总额=${roundedTotalAmount}, ` +
        `是否全额支付=${isFullyPaid}`
      );

      // 更新订单
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: totalPaidAmount,
          paymentStatus: (isFullyPaid ? 'FULLY_PAID' : 'PARTIAL_PAID') as any,
          // 全额支付且订单处于待确认状态时,自动变更为进行中
          orderStatus: isFullyPaid && order.orderStatus === 'PENDING' 
            ? 'IN_PROGRESS' 
            : order.orderStatus,
        },
      });

      // 4. 扣减商品库存 (先付款后付货)
      if (isFullyPaid && order.items && order.items.length > 0) {
        for (const item of order.items) {
          const product = item.product;
          if (product && product.isTrackStock) {
            if (product.stockQuantity < item.quantity) {
              throw new BadRequestException(
                `商品 ${product.name} 库存不足，当前库存：${product.stockQuantity}，需要：${item.quantity}`
              );
            }
            await tx.product.update({
              where: { id: product.id },
              data: { stockQuantity: { decrement: item.quantity } },
            });
            this.logger.log(`库存扣减: ${product.name} x${item.quantity}, 剩余: ${product.stockQuantity - item.quantity}`);
          }
        }
      }

      // 5. 支付确认后锁定时间槽（订单创建时不再锁定，防止不付款占位）
      if (isFullyPaid && order.timeSlotId) {
        try {
          const timeSlot = await tx.timeSlot.findUnique({
            where: { id: order.timeSlotId },
          });
          if (timeSlot) {
            if ((timeSlot.bookedCount || 0) >= timeSlot.capacity) {
              this.logger.warn(`时间槽已满但仍收到确认支付: slot=${order.timeSlotId}, order=${order.orderNo}`);
            } else {
              const newBookedCount = (timeSlot.bookedCount || 0) + 1;
              const isFullyBooked = newBookedCount >= timeSlot.capacity;
              await tx.timeSlot.update({
                where: { id: order.timeSlotId },
                data: {
                  bookedCount: newBookedCount,
                  availableCount: Math.max(0, timeSlot.capacity - newBookedCount),
                  isBooked: isFullyBooked,
                  status: isFullyBooked ? 'BOOKED' : 'AVAILABLE',
                },
              });
              this.logger.log(`确认支付锁定时间槽: slot=${order.timeSlotId}, 预订 ${newBookedCount}/${timeSlot.capacity}`);
            }
          }
        } catch (slotErr) {
          this.logger.error(`锁定时间槽失败: ${slotErr.message}`, slotErr.stack);
        }
      }

      this.logger.log(
        `支付确认成功: ${paymentId}, 订单 ${order.orderNo} 已付金额: ${totalPaidAmount}`
      );

      return {
        code: 200,
        message: isFullyPaid ? '支付确认成功,订单已全额支付' : '支付确认成功',
        data: {
          paymentId: updatedPayment.id,
          orderId: updatedOrder.id,
          orderNo: updatedOrder.orderNo,
          paidAmount: totalPaidAmount,
          totalAmount,
          remainingAmount: totalAmount - totalPaidAmount,
          isFullyPaid,
          paymentStatus: updatedOrder.paymentStatus,
          orderStatus: updatedOrder.orderStatus,
        },
      };
    });
  }

  /**
   * 获取订单的支付记录（包括尾款记录）
   */
  async getOrderPaymentHistory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { nickname: true, phone: true },
        },
        package: {
          select: { name: true, price: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const totalAmount = Number(order.totalAmount);
    const paidAmount = Number(order.paidAmount);
    const remainingAmount = totalAmount - paidAmount;

    return {
      code: 200,
      message: '查询成功',
      data: {
        order: {
          id: order.id,
          orderNo: order.orderNo,
          totalAmount,
          paidAmount,
          remainingAmount,
          isFullyPaid: remainingAmount <= 0,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          customer: order.user,
          package: order.package,
        },
        payments: order.payments.map((payment, index) => ({
          id: payment.id,
          sequence: index + 1,
          amount: Number(payment.amount),
          paymentType: payment.paymentType,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          transactionId: payment.transactionId,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          description: index === 0 ? '定金/首付款' : `第${index}次尾款`,
        })),
        summary: {
          totalPayments: order.payments.length,
          totalPaidAmount: order.payments
            .filter(p => p.status === 'FULLY_PAID')
            .reduce((sum, p) => sum + Number(p.amount), 0),
          pendingAmount: remainingAmount,
        },
      },
    };
  }

  /**
   * 处理退款
   */
  async processRefund(paymentId: string, reason?: string, notes?: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取支付记录
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      });

      if (!payment) {
        throw new NotFoundException('支付记录不存在');
      }

  if (payment.status !== 'FULLY_PAID') {
        throw new BadRequestException('只能退款已支付成功的记录');
      }

      // 2. 更新支付状态为已退款
      const refundedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundReason: reason,
          notes: notes ? `${payment.notes || ''}\n退款备注: ${notes}`.trim() : payment.notes,
        },
      });

      // 3. 重新计算订单已付金额
      const validPayments = await tx.payment.findMany({
        where: {
          orderId: payment.orderId,
          status: PaymentStatus.FULLY_PAID,
        },
      });

      const newPaidAmount = validPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(payment.order.totalAmount);

      // 4. 更新订单支付状态
      let paymentStatus: string;
      if (newPaidAmount >= totalAmount) {
        paymentStatus = 'FULLY_PAID';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'PARTIAL_PAID';
      } else {
        paymentStatus = 'PENDING_PAYMENT';
      }

      const updatedOrder = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paidAmount: newPaidAmount,
          paymentStatus: paymentStatus as any,
        },
      });

      // 5. 记录退款日志
      this.logger.log(`退款处理完成: 支付ID=${paymentId}, 金额=${payment.amount}, 原因=${reason || '无'}`);

      // v1.2.4+5: 团购退款处理 — 全款退款时更新参团状态并回收优惠券
      if (payment.order.groupBuyActivityId && payment.order.wxUserId && newPaidAmount === 0) {
        await tx.groupBuyParticipant.updateMany({
          where: { activityId: payment.order.groupBuyActivityId, userId: payment.order.wxUserId },
          data: { status: 'REFUNDED' },
        });
        this.logger.log(`团购参团状态已更新 REFUNDED: activity=${payment.order.groupBuyActivityId}, user=${payment.order.wxUserId}`);

        const act = await tx.groupBuyActivity.findUnique({
          where: { id: payment.order.groupBuyActivityId },
          select: { packageId: true },
        });
        if (act) {
          const gbCoupons = await tx.coupon.findMany({
            where: { couponType: 'GROUP_BUY', applicableIds: { has: act.packageId } },
            select: { id: true },
          });
          if (gbCoupons.length > 0) {
            const r = await tx.userCoupon.updateMany({
              where: { wxUserId: payment.order.wxUserId, couponId: { in: gbCoupons.map(c => c.id) }, status: 'UNUSED' },
              data: { status: 'EXPIRED' },
            });
            if (r.count > 0) this.logger.log(`团购优惠券已回收: ${r.count} 张`);
          }
        }
      }

      return {
        code: 200,
        message: '退款处理成功',
        data: {
          refundedPayment: {
            id: refundedPayment.id,
            amount: Number(refundedPayment.amount),
            paymentType: refundedPayment.paymentType,
            status: refundedPayment.status,
            refundedAt: refundedPayment.refundedAt,
            refundReason: refundedPayment.refundReason,
          },
          order: {
            id: updatedOrder.id,
            orderNo: updatedOrder.orderNo,
            totalAmount: Number(updatedOrder.totalAmount),
            paidAmount: Number(updatedOrder.paidAmount),
            remainingAmount: Number(updatedOrder.totalAmount) - Number(updatedOrder.paidAmount),
            paymentStatus: updatedOrder.paymentStatus,
          },
        },
      };
    });
  }

  /**
   * 获取支付状态文本
   */
  private getPaymentStatusText(status: string): string {
    const statusMap: Record<string,string> = {
      PENDING: '待支付',
      PROCESSING: '处理中',
      PARTIAL: '部分支付',
      PAID: '已支付',
      OVERPAID: '多收款',
      FREE: '免费订单',
      FAILED: '支付失败',
      CANCELLED: '已取消',
      REFUNDING: '退款中',
      REFUNDED: '已退款'
    };
    return statusMap[status] || status;
  }

  // ==================== 退款申请管理 ====================

  /**
   * 生成退款申请编号
   */
  private generateRefundNo(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REF${year}${month}${day}${random}`;
  }

  /**
   * 创建退款申请
   */
  async createRefundRequest(createDto: CreateRefundRequestDto) {
    try {
      // 1. 查找订单
      const order = await this.prisma.order.findFirst({
        where: { orderNo: createDto.orderNo },
        include: {
          payments: {
            where: { status: PaymentStatus.FULLY_PAID },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }

      // 2. 验证订单状态
      if ((order.orderStatus as any) === OrderStatus.CANCELLED) {
        throw new BadRequestException('订单已退款，无需再次申请');
      }

      if (order.orderStatus === OrderStatus.COMPLETED) {
        throw new BadRequestException('订单已完成，如需退款请联系管理员');
      }

      // 3. 验证退款金额
      const paidAmount = Number(order.paidAmount);
      if (paidAmount === 0) {
        throw new BadRequestException('订单未支付，无需退款');
      }

      if (createDto.refundType === RefundType.FULL) {
        // 全额退款，退款金额应等于已支付金额
        createDto.refundAmount = paidAmount;
      } else {
        // 部分退款，退款金额不能超过已支付金额
        if (createDto.refundAmount > paidAmount) {
          throw new BadRequestException(
            `退款金额不能超过已支付金额 ¥${paidAmount}`
          );
        }
      }

      // 4. 检查是否已有待处理的退款申请
      const existingRefundRequest = await this.prisma.refundRequest.findFirst({
        where: {
          orderNo: createDto.orderNo,
          status: {
            in: ['PENDING', 'APPROVED', 'PROCESSING'],
          },
        },
      });

      if (existingRefundRequest) {
        throw new ConflictException('该订单已有待处理的退款申请');
      }

      // 5. 创建退款申请
      const refundRequest = await this.prisma.refundRequest.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          refundNo: this.generateRefundNo(),
          refundType: createDto.refundType,
          refundAmount: createDto.refundAmount,
          refundReason: createDto.refundReason,
          refundMethod: createDto.refundMethod || RefundMethod.ORIGINAL,
          applicantType: createDto.applicantType || 'USER',
          applicantId: createDto.applicantId,
          applicantName: createDto.applicantName,
          notes: createDto.notes,
          attachments: createDto.attachments || [],
          status: RefundStatus.PENDING,
        },
      });

      this.logger.log(`退款申请创建成功: ${refundRequest.refundNo}, 订单: ${order.orderNo}, 金额: ¥${createDto.refundAmount}`);

      return refundRequest;
    } catch (error) {
      this.logger.error(`创建退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询退款申请列表
   */
  async findAllRefundRequests(searchDto: RefundRequestSearchDto) {
    try {
      const {
        orderNo,
        refundNo,
        status,
        applicantId,
        startDate,
        endDate,
        refundType,
        page = 1,
        limit = 20,
      } = searchDto;

      // 构建查询条件
      const where: any = {};

      if (orderNo) {
        where.orderNo = { contains: orderNo };
      }

      if (refundNo) {
        where.refundNo = { contains: refundNo };
      }

      if (status) {
        where.status = status;
      } else {
        // 默认不显示已取消和已拒绝的退款申请
        where.status = {
          notIn: [RefundStatus.CANCELLED, RefundStatus.REJECTED],
        };
      }

      if (applicantId) {
        where.applicantId = applicantId;
      }

      if (refundType) {
        where.refundType = refundType;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // 查询总数
      const total = await this.prisma.refundRequest.count({ where });

      // 查询列表
      const refundRequests = await this.prisma.refundRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: refundRequests,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`查询退款申请列表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取退款申请详情
   */
  async findOneRefundRequest(id: string) {
    const refundRequest = await this.prisma.refundRequest.findUnique({
      where: { id },
    });

    if (!refundRequest) {
      throw new NotFoundException('退款申请不存在');
    }

    return refundRequest;
  }

  /**
   * 审批通过退款申请
   */
  async approveRefundRequest(id: string, approveDto: ApproveRefundRequestDto) {
    try {
      const refundRequest = await this.prisma.refundRequest.findUnique({
        where: { id },
      });

      if (!refundRequest) {
        throw new NotFoundException('退款申请不存在');
      }

      if (refundRequest.status !== RefundStatus.PENDING) {
        throw new BadRequestException('只能审批待审批状态的退款申请');
      }

      // 更新退款申请状态为已审批
      const updated = await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundStatus.APPROVED,
          approvedBy: approveDto.approvedBy || 'ADMIN',
          approvedAt: new Date(),
          notes: approveDto.notes || refundRequest.notes,
        },
      });

      // 审计记录 - APPROVE（记录审批时的订单已付金额）
      try {
        const order = await this.prisma.order.findUnique({ where: { id: refundRequest.orderId } });
        const beforePaid = order ? Number(order.paidAmount || 0) : 0;
        await this.createRefundAudit({
          refundRequestId: updated.id,
          orderId: refundRequest.orderId,
          orderNo: refundRequest.orderNo,
          action: 'APPROVE',
          amount: Number(updated.refundAmount),
          beforePaid,
          afterPaid: beforePaid,
          operatorId: approveDto.approvedBy || 'ADMIN',
          operatorName: approveDto.approvedBy || 'ADMIN',
          notes: approveDto.notes || '审批通过',
        });
      } catch (e) {
        this.logger.error(`写入审批审计失败: ${e.message}`);
      }

      this.logger.log(`退款申请审批通过: ${refundRequest.refundNo}, 审批人: ${approveDto.approvedBy}`);

      return updated;
    } catch (error) {
      this.logger.error(`审批退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 拒绝退款申请
   */
  async rejectRefundRequest(id: string, rejectDto: RejectRefundRequestDto) {
    try {
      const refundRequest = await this.prisma.refundRequest.findUnique({
        where: { id },
      });

      if (!refundRequest) {
        throw new NotFoundException('退款申请不存在');
      }

      if (refundRequest.status !== RefundStatus.PENDING) {
        throw new BadRequestException('只能拒绝待审批状态的退款申请');
      }

      // 更新退款申请状态为已拒绝
      const updated = await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundStatus.REJECTED,
          rejectedBy: rejectDto.rejectedBy || 'ADMIN',
          rejectedAt: new Date(),
          rejectReason: rejectDto.rejectReason,
        },
      });

      // 审计记录 - REJECT（记录审批时的订单已付金额）
      try {
        const order = await this.prisma.order.findUnique({ where: { id: refundRequest.orderId } });
        const beforePaid = order ? Number(order.paidAmount || 0) : 0;
        await this.createRefundAudit({
          refundRequestId: updated.id,
          orderId: refundRequest.orderId,
          orderNo: refundRequest.orderNo,
          action: 'REJECT',
          amount: Number(updated.refundAmount),
          beforePaid,
          afterPaid: beforePaid,
          operatorId: rejectDto.rejectedBy || 'ADMIN',
          operatorName: rejectDto.rejectedBy || 'ADMIN',
          notes: rejectDto.rejectReason || '审批拒绝',
        });
      } catch (e) {
        this.logger.error(`写入拒绝审计失败: ${e.message}`);
      }

      this.logger.log(`退款申请已拒绝: ${refundRequest.refundNo}, 原因: ${rejectDto.rejectReason}`);

      return updated;
    } catch (error) {
      this.logger.error(`拒绝退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 执行退款
   */
  async processRefundRequest(id: string, processDto: ProcessRefundRequestDto) {
    try {
      const refundRequest = await this.prisma.refundRequest.findUnique({
        where: { id },
      });

      if (!refundRequest) {
        throw new NotFoundException('退款申请不存在');
      }

      if (refundRequest.status !== RefundStatus.APPROVED) {
        throw new BadRequestException('只能处理已审批的退款申请');
      }

      // 开始事务处理退款
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. 更新退款申请状态为处理中
        await tx.refundRequest.update({
          where: { id },
          data: {
            status: RefundStatus.PROCESSING,
          },
        });

        // 2. 查找订单
        const order = await tx.order.findUnique({
          where: { id: refundRequest.orderId },
          include: {
            payments: {
              where: { status: PaymentStatus.FULLY_PAID },
              orderBy: { paidAt: 'desc' },
            },
          },
        });

        if (!order) {
          throw new NotFoundException('订单不存在');
        }

        // 3. 根据退款方式执行退款
        let transactionId = processDto.transactionId;

        if (refundRequest.refundMethod === RefundMethod.ORIGINAL) {
          // 原路退回 - 调用微信退款APIv3
          if (order.payments && order.payments.length > 0) {
            const latestPayment = order.payments[0];

            try {
              const result = await this.wechatPayService.refund({
                outTradeNo: order.orderNo,
                outRefundNo: refundRequest.refundNo,
                totalFee: Math.round(Number(latestPayment.amount) * 100),
                refundFee: Math.round(Number(refundRequest.refundAmount) * 100),
                refundDesc: refundRequest.refundReason || '订单退款',
              });

              transactionId = result.refundId;
              this.logger.log(`微信退款成功: transactionId=${result.refundId}, 金额=${refundRequest.refundAmount}`);
            } catch (error) {
              this.logger.error(`微信退款API调用失败: ${error.message}`);
              throw new BadRequestException(`微信退款失败: ${error.message}`);
            }
          }
        } else {
          // 现金或银行转账退款 - 手动记录
          this.logger.log(`手动退款: 方式=${refundRequest.refundMethod}, 金额=${refundRequest.refundAmount}`);
        }

        // 4. 映射退款方式到支付方式
        let paymentMethod: string;
        if (refundRequest.refundMethod === RefundMethod.ORIGINAL) {
          paymentMethod = (order.payments && order.payments.length > 0)
            ? order.payments[0].paymentMethod
            : 'CASH';
        } else if (refundRequest.refundMethod === RefundMethod.CASH) {
          paymentMethod = 'CASH';
        } else { // BANK
          paymentMethod = 'BANK_CARD';
        }

        // 5. 创建退款支付记录
        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentType: 'REFUND' as any,
            paymentMethod: paymentMethod as any,
            amount: -Number(refundRequest.refundAmount), // 负数表示退款
            status: 'REFUNDED',
            transactionId: transactionId || refundRequest.refundNo,
            refundReason: refundRequest.refundReason,
            notes: processDto.notes,
            paidAt: new Date(),
            refundedAt: new Date(),
          },
        });

        // 6. 更新订单的已支付金额
        const newPaidAmount = Number(order.paidAmount) - Number(refundRequest.refundAmount);
        // 防止退款金额超过已支付金额
        if (newPaidAmount < 0) {
          throw new BadRequestException(
            `退款金额 ¥${Number(refundRequest.refundAmount).toFixed(2)} 超过订单已付金额 ¥${Number(order.paidAmount).toFixed(2)}，无法退款`
          );
        }
        const safePaidAmount = Math.max(0, newPaidAmount);
        await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: safePaidAmount,
            refundedAmount: Number(order.refundedAmount || 0) + Number(refundRequest.refundAmount),
            paymentStatus: safePaidAmount <= 0 ? PaymentStatus.REFUNDED
              : safePaidAmount >= Number(order.totalAmount) ? PaymentStatus.FULLY_PAID
              : PaymentStatus.PARTIAL_PAID,
            orderStatus: refundRequest.refundType === RefundType.FULL ? OrderStatus.CANCELLED : order.orderStatus,
          },
        });

        // 7. 释放预约时段（取消订单时）
        if (order.timeSlotId && refundRequest.refundType === RefundType.FULL) {
          try {
            await tx.timeSlot.update({
              where: { id: order.timeSlotId },
              data: {
                bookedCount: { decrement: 1 },
              },
            });
            // 如果 bookedCount 降至 0，恢复 isBooked
            const updatedSlot = await tx.timeSlot.findUnique({
              where: { id: order.timeSlotId },
            });
            if (updatedSlot && updatedSlot.bookedCount <= 0) {
              await tx.timeSlot.update({
                where: { id: order.timeSlotId },
                data: { isBooked: false, status: 'AVAILABLE' },
              });
            }
          } catch (e) {
            this.logger.error(`释放预约时段失败: ${e.message}`);
          }
        }

        // 8. 更新退款申请状态为已完成
        const updatedRefundRequest = await tx.refundRequest.update({
          where: { id },
          data: {
            status: RefundStatus.COMPLETED,
            refundedBy: processDto.refundedBy || 'ADMIN',
            refundedAt: new Date(),
            transactionId: transactionId || refundRequest.refundNo,
          },
        });

        // 9. 审计记录 - PROCESS (完成退款)，在事务内写入
        await this.createRefundAudit({
          refundRequestId: updatedRefundRequest.id,
          orderId: order.id,
          orderNo: order.orderNo,
          action: 'PROCESS',
          amount: Number(updatedRefundRequest.refundAmount),
          beforePaid: Number(order.paidAmount),
          afterPaid: newPaidAmount,
          operatorId: processDto.refundedBy || 'ADMIN',
          operatorName: processDto.refundedBy || 'ADMIN',
          notes: processDto.notes || '退款执行完成',
        }, tx as any);

        return updatedRefundRequest;
      });

      this.logger.log(`退款处理成功: ${refundRequest.refundNo}, 金额: ¥${refundRequest.refundAmount}`);

      return result;
    } catch (error) {
      this.logger.error(`处理退款失败: ${error.message}`, error.stack);
      
      // 更新退款申请状态为失败
      await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundStatus.FAILED,
          notes: `退款失败: ${error.message}`,
        },
      });

      throw error;
    }
  }

  /**
   * 取消退款申请
   */
  async cancelRefundRequest(id: string) {
    try {
      const refundRequest = await this.prisma.refundRequest.findUnique({
        where: { id },
      });

      if (!refundRequest) {
        throw new NotFoundException('退款申请不存在');
      }

      if (!['PENDING', 'APPROVED'].includes(refundRequest.status)) {
        throw new BadRequestException('只能取消待审批或已审批的退款申请');
      }

      const updated = await this.prisma.refundRequest.update({
        where: { id },
        data: {
          status: RefundStatus.CANCELLED,
        },
      });

      // 审计记录 - CANCEL
      await this.createRefundAuditFallback({
        refundRequestId: updated.id,
        orderId: updated.orderId,
        orderNo: updated.orderNo,
        action: 'CANCEL',
        amount: Number(updated.refundAmount),
        beforePaid: 0,
        afterPaid: 0,
        operatorId: 'SYSTEM',
        operatorName: 'SYSTEM',
        notes: '退款申请取消'
      });

      this.logger.log(`退款申请已取消: ${refundRequest.refundNo}`);

      return updated;
    } catch (error) {
      this.logger.error(`取消退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 审计记录写入占位方法（等待 Prisma Client 重新生成模型后可替换为 prisma.refundAudit.create）
   */
  private async createRefundAuditFallback(data: {
    refundRequestId: string;
    orderId: string;
    orderNo: string;
    action: string;
    amount: number;
    beforePaid: number;
    afterPaid: number;
    operatorId?: string;
    operatorName?: string;
    notes?: string;
  }) {
    try {
      await this.prisma.$executeRawUnsafe(`
        INSERT INTO "refund_audits" (
          "id", "refund_request_id", "order_id", "order_no", "action",
          "amount", "before_paid", "after_paid", "operator_id", "operator_name", "notes", "created_at"
        ) VALUES (
          gen_random_uuid(), '${data.refundRequestId}', '${data.orderId}', '${data.orderNo}', '${data.action}',
          ${data.amount}, ${data.beforePaid}, ${data.afterPaid}, ${data.operatorId ? `'${data.operatorId}'` : 'NULL'}, ${data.operatorName ? `'${data.operatorName}'` : 'NULL'}, ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'}, NOW()
        )
      `);
    } catch (e) {
      this.logger.error(`写入退款审计失败: ${e.message}`);
    }
  }

  /**
   * 安全的审计写入方法，使用 Prisma Client 的 refundAudit.create API
   * 如果传入 tx（Prisma.TransactionClient），则在该事务内执行
   */
  private async createRefundAudit(
    data: {
      refundRequestId: string;
      orderId: string;
      orderNo: string;
      action: string;
      amount: number;
      beforePaid: number;
      afterPaid: number;
      operatorId?: string;
      operatorName?: string;
      notes?: string;
    },
    tx?: any,
  ) {
    try {
      const client = tx || this.prisma;
      
      return await client.refundAudit.create({
        data: {
          refundRequestId: data.refundRequestId,
          orderId: data.orderId,
          orderNo: data.orderNo,
          action: data.action,
          amount: data.amount,
          beforePaid: data.beforePaid,
          afterPaid: data.afterPaid,
          operatorId: data.operatorId || null,
          operatorName: data.operatorName || null,
          notes: data.notes || null,
        },
      });
    } catch (e) {
      this.logger.error(`写入退款审计失败: ${e.message}`, e.stack);
      throw e;
    }
  }

  /**
   * 获取订单的退款申请列表
   */
  async getRefundRequestsByOrderNo(orderNo: string) {
    try {
      const refundRequests = await this.prisma.refundRequest.findMany({
        where: { orderNo },
        orderBy: { createdAt: 'desc' },
      });

      return refundRequests;
    } catch (error) {
      this.logger.error(`查询订单退款申请失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取退款统计信息
   */
  async getRefundStatistics(query: RefundRequestSearchDto = {}) {
    try {
      const { startDate, endDate } = query;

      // 构建查询条件 - 排除已取消和已拒绝的退款
      const where: any = {
        status: {
          notIn: [RefundStatus.CANCELLED, RefundStatus.REJECTED],
        },
      };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // 统计各状态的退款申请数量（排除已取消和已拒绝）
      const statusStats = await this.prisma.refundRequest.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
        _sum: { refundAmount: true },
      });

      // 总退款金额（已完成的）
      const completedRefunds = await this.prisma.refundRequest.aggregate({
        where: {
          ...where,
          status: RefundStatus.COMPLETED,
        },
        _sum: { refundAmount: true },
        _count: { id: true },
      });

      // 待处理退款金额（只统计待审批、已审批、处理中的）
      const pendingRefunds = await this.prisma.refundRequest.aggregate({
        where: {
          ...where,
          status: {
            in: [RefundStatus.PENDING, RefundStatus.APPROVED, RefundStatus.PROCESSING],
          },
        },
        _sum: { refundAmount: true },
        _count: { id: true },
      });

      return {
        statusStats,
        completedRefunds: {
          amount: completedRefunds._sum?.refundAmount || 0,
          count: completedRefunds._count?.id || 0,
        },
        pendingRefunds: {
          amount: pendingRefunds._sum?.refundAmount || 0,
          count: pendingRefunds._count?.id || 0,
        },
      };
    } catch (error) {
      this.logger.error(`获取退款统计失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据 refundRequestId 查询退款审计记录，按时间倒序
   */
  async getRefundAuditsByRefundRequestId(refundRequestId: string) {
    try {
      return await this.prisma.refundAudit.findMany({
        where: { refundRequestId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      this.logger.error(`查询退款审计失败: ${e.message}`, e.stack);
      throw e;
    }
  }

  /**
   * 检测可疑支付
   * 检测类型: duplicate(重复支付), overpayment(超额支付), system_error(系统错误)
   */
  async getSuspiciousPayments(params: { type?: string; severity?: string; page?: number; limit?: number } = {}) {
    const { type = 'all', severity = 'all', page = 1, limit = 20 } = params;
    try {
      const suspiciousPayments: Array<{
        paymentId: string;
        orderId: string;
        orderNo: string;
        amount: number;
        type: 'duplicate' | 'overpayment' | 'system_error';
        reason: string;
        severity: 'high' | 'medium' | 'low';
        detectedAt: Date;
        customerInfo?: any;
        resolved?: boolean;
        resolvedAt?: Date | null;
      }> = [];

      // 1. 检测重复支付
      if (type === 'duplicate' || type === 'all') {
        const duplicates = await this.findDuplicatePayments();
        suspiciousPayments.push(...duplicates);
      }

      // 2. 检测超额支付
      if (type === 'overpayment' || type === 'all') {
        const overpayments = await this.findOverpayments();
        suspiciousPayments.push(...overpayments);
      }

      // 3. 检测系统错误
      if (type === 'system_error' || type === 'all') {
        const systemErrors = await this.findSystemErrors();
        suspiciousPayments.push(...systemErrors);
      }

      // 过滤 severity
      const filtered = severity === 'all' ? suspiciousPayments : suspiciousPayments.filter(p => p.severity === severity);

      // 按严重性和时间排序
      filtered.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.detectedAt.getTime() - a.detectedAt.getTime();
      });

      const total = filtered.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      return {
        success: true,
        data: paginated,
        summary: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          high: filtered.filter(p => p.severity === 'high').length,
          medium: filtered.filter(p => p.severity === 'medium').length,
          low: filtered.filter(p => p.severity === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error(`检测可疑支付失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 标记可疑支付已处理/忽略
   * 由于未建立持久化表，此处以简单校验 + 返回结构方式实现占位
   */
  async resolveSuspiciousPayment(paymentId: string) {
    // 查询支付是否存在
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) {
      throw new NotFoundException('支付记录不存在');
    }
    // 简单判断是否仍然可疑（占位逻辑，可扩展）
    const stillSuspicious = payment.status === PaymentStatus.PENDING_PAYMENT;
    return {
      success: true,
      paymentId,
      resolved: true,
      resolvedAt: new Date(),
      wasSuspicious: stillSuspicious,
      message: '可疑支付标记处理完成（占位实现，后续可持久化）',
    };
  }

  /**
   * 查找重复支付
   * 规则: 同一订单在5分钟内有多笔相同金额的支付记录
   */
  private async findDuplicatePayments() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // 查询最近5分钟内的支付记录
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        status: PaymentStatus.FULLY_PAID,
      },
      include: {
        order: {
          include: {
            user: {
              select: { nickname: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const duplicates: any[] = [];
    const paymentGroups = new Map<string, typeof recentPayments>();

    // 按订单ID和金额分组
    recentPayments.forEach(payment => {
      const key = `${payment.orderId}_${payment.amount}`;
      const group = paymentGroups.get(key) || [];
      group.push(payment);
      paymentGroups.set(key, group);
    });

    // 找出有多笔支付的组
    paymentGroups.forEach((group, key) => {
      if (group.length > 1) {
        // 有重复支付
        group.forEach((payment, index) => {
          if (index > 0) { // 第一笔不算重复
            duplicates.push({
              paymentId: payment.id,
              orderId: payment.orderId,
              orderNo: payment.order.orderNo,
              amount: Number(payment.amount),
              type: 'duplicate' as const,
              reason: `检测到重复支付: 同一订单在5分钟内有${group.length}笔相同金额(¥${payment.amount})的支付`,
              severity: 'high' as const,
              detectedAt: new Date(),
              customerInfo: {
                name: payment.order.user?.nickname,
                phone: payment.order.user?.phone,
              },
            });
          }
        });
      }
    });

    return duplicates;
  }

  /**
   * 查找超额支付
   * 规则: 支付金额 > 订单应付金额
   */
  private async findOverpayments() {
    const overpayments: any[] = [];

    // 查询所有已支付的记录
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.FULLY_PAID,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
        },
      },
      include: {
        order: {
          include: {
            user: {
              select: { nickname: true, phone: true },
            },
          },
        },
      },
    });

    // 检查每笔支付是否超额
    for (const payment of payments) {
      const order = payment.order;
      const balance = Number(order.totalAmount) - Number(order.paidAmount) + Number(payment.amount);
      
      // 如果这笔支付后，已付金额超过订单总额
      if (Number(payment.amount) > balance) {
        const overage = Number(payment.amount) - balance;
        overpayments.push({
          paymentId: payment.id,
          orderId: payment.orderId,
          orderNo: order.orderNo,
          amount: Number(payment.amount),
          type: 'overpayment' as const,
          reason: `支付金额(¥${payment.amount})超过应付余额(¥${balance.toFixed(2)}), 超出¥${overage.toFixed(2)}`,
          severity: overage > 100 ? 'high' : 'medium' as 'high' | 'medium',
          detectedAt: new Date(),
          customerInfo: {
            name: order.user?.nickname,
            phone: order.user?.phone,
          },
        });
      }
    }

    return overpayments;
  }

  /**
   * 查找系统错误
   * 规则: 
   * 1. 支付状态为PAID但订单支付状态未更新
   * 2. 已付金额与支付记录总额不匹配
   * 3. 有交易号但状态不是PAID
   */
  private async findSystemErrors() {
    const systemErrors: any[] = [];

    // 1. 查找支付状态为PAID但订单状态异常的
    const paidPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.FULLY_PAID,
        paidAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
        },
      },
      include: {
        order: {
          include: {
            payments: true,
            user: {
              select: { nickname: true, phone: true },
            },
          },
        },
      },
    });

    for (const payment of paidPayments) {
      const order = payment.order;
      
      // 计算所有已支付的金额总和
      const totalPaid = order.payments
        .filter(p => p.status === 'FULLY_PAID')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // 检查订单的paidAmount是否与实际支付总额一致
      if (Math.abs(totalPaid - Number(order.paidAmount)) > 0.01) {
        systemErrors.push({
          paymentId: payment.id,
          orderId: order.id,
          orderNo: order.orderNo,
          amount: Number(payment.amount),
          type: 'system_error' as const,
          reason: `订单已付金额(¥${order.paidAmount})与支付记录总额(¥${totalPaid.toFixed(2)})不匹配`,
          severity: 'high' as const,
          detectedAt: new Date(),
          customerInfo: {
            name: order.user?.nickname,
            phone: order.user?.phone,
          },
        });
      }

      // 检查订单支付状态
      if (totalPaid >= Number(order.totalAmount) && order.paymentStatus !== 'FULLY_PAID') {
        systemErrors.push({
          paymentId: payment.id,
          orderId: order.id,
          orderNo: order.orderNo,
          amount: Number(payment.amount),
          type: 'system_error' as const,
          reason: `订单已全额支付(¥${totalPaid.toFixed(2)})但支付状态为${order.paymentStatus}`,
          severity: 'medium' as const,
          detectedAt: new Date(),
          customerInfo: {
            name: order.user?.nickname,
            phone: order.user?.phone,
          },
        });
      }
    }

    // 2. 查找有交易号但状态不是已支付或已退款的支付记录
    const inconsistentPayments = await this.prisma.payment.findMany({
      where: {
        transactionId: { not: null },
        status: { notIn: [PaymentStatus.FULLY_PAID, PaymentStatus.REFUNDED] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        order: {
          include: {
            user: {
              select: { nickname: true, phone: true },
            },
          },
        },
      },
    });

    for (const payment of inconsistentPayments) {
      systemErrors.push({
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNo: payment.order.orderNo,
        amount: Number(payment.amount),
        type: 'system_error' as const,
        reason: `存在第三方交易号(${payment.transactionId})但支付状态为${payment.status}`,
        severity: 'high' as const,
        detectedAt: new Date(),
        customerInfo: {
          name: payment.order.user?.nickname,
          phone: payment.order.user?.phone,
        },
      });
    }

    return systemErrors;
  }
}

