import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

export interface StatusChangeLogData {
  orderId: string;
  fieldName: 'orderStatus' | 'paymentStatus';
  oldValue: string;
  newValue: string;
  operator?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class StatusChangeLogService {
  private readonly logger = new Logger(StatusChangeLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 记录状态变更日志
   * @param logData 日志数据
   */
  async logStatusChange(logData: StatusChangeLogData): Promise<void> {
    try {
      await this.prisma.statusChangeLog.create({
        data: {
          orderId: logData.orderId,
          fieldName: logData.fieldName,
          oldValue: logData.oldValue,
          newValue: logData.newValue,
          operator: logData.operator,
          reason: logData.reason,
          ip: logData.ip,
          userAgent: logData.userAgent,
        },
      });

      this.logger.log(
        `状态变更已记录: 订单${logData.orderId} ${logData.fieldName} ${logData.oldValue} → ${logData.newValue}`,
      );
    } catch (error) {
      this.logger.error(`记录状态变更日志失败: ${error.message}`, error.stack);
      // 不抛出异常，避免影响主业务流程
    }
  }

  /**
   * 批量记录状态变更日志
   * @param logs 日志数据数组
   */
  async logStatusChanges(logs: StatusChangeLogData[]): Promise<void> {
    try {
      await this.prisma.statusChangeLog.createMany({
        data: logs.map(log => ({
          orderId: log.orderId,
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
          operator: log.operator,
          reason: log.reason,
          ip: log.ip,
          userAgent: log.userAgent,
        })),
      });

      this.logger.log(`批量记录了 ${logs.length} 条状态变更日志`);
    } catch (error) {
      this.logger.error(`批量记录状态变更日志失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取订单的状态变更历史
   * @param orderId 订单ID
   * @param limit 限制数量
   * @returns 状态变更历史
   */
  async getOrderStatusHistory(orderId: string, limit = 50) {
    return this.prisma.statusChangeLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 获取状态变更统计信息
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计信息
   */
  async getStatusChangeStats(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalChanges,
      orderStatusChanges,
      paymentStatusChanges,
      changesByOperator,
    ] = await Promise.all([
      this.prisma.statusChangeLog.count({ where }),
      this.prisma.statusChangeLog.count({
        where: { ...where, fieldName: 'orderStatus' },
      }),
      this.prisma.statusChangeLog.count({
        where: { ...where, fieldName: 'paymentStatus' },
      }),
      this.prisma.statusChangeLog.groupBy({
        by: ['operator'],
        where,
        _count: true,
        orderBy: { _count: { operator: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalChanges,
      orderStatusChanges,
      paymentStatusChanges,
      changesByOperator: changesByOperator.map(item => ({
        operator: item.operator,
        count: item._count,
      })),
    };
  }

  /**
   * 获取异常状态变更记录
   * @param hours 过去多少小时内
   * @returns 异常状态变更记录
   */
  async getAbnormalStatusChanges(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // 查找频繁状态变更的订单（可能有问题）
    const frequentChanges = await this.prisma.statusChangeLog.groupBy({
      by: ['orderId'],
      where: {
        createdAt: { gte: since },
      },
      _count: true,
      having: {
        orderId: { _count: { gt: 5 } }, // 超过5次变更认为异常
      },
      orderBy: { _count: { orderId: 'desc' } },
    });

    return {
      frequentChanges: frequentChanges.map(item => ({
        orderId: item.orderId,
        changeCount: item._count,
      })),
    };
  }
}
