import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StatusChangeLogService } from '../../shared/services/status-change-log.service';
import { OrderStatus, PaymentStatus } from '../../shared/enums/status.enum';
import { OrderStatusValidator } from '../../shared/validators/order-status.validator';

@Injectable()
export class StatusMonitoringService {
  private readonly logger = new Logger(StatusMonitoringService.name);

  constructor(
    private prisma: PrismaService,
    private statusChangeLogService: StatusChangeLogService,
  ) {}

  /**
   * 获取状态组合分布
   */
  async getStatusDistribution() {
    try {
      const distribution = await this.prisma.order.groupBy({
        by: ['orderStatus', 'paymentStatus'],
        _count: true,
        orderBy: {
          _count: {
            orderStatus: 'desc',
          },
        },
      });

      const result = distribution.map(item => ({
        orderStatus: item.orderStatus,
        paymentStatus: item.paymentStatus,
        count: item._count,
        combination: `${item.orderStatus}+${item.paymentStatus}`,
        isValid: OrderStatusValidator.isValidCombination(
          item.orderStatus as OrderStatus,
          item.paymentStatus as PaymentStatus
        ),
        description: OrderStatusValidator.getStatusCombinationDescription(
          item.orderStatus as OrderStatus,
          item.paymentStatus as PaymentStatus
        ),
      }));

      const totalOrders = result.reduce((sum, item) => sum + item.count, 0);
      const validCombinations = result.filter(item => item.isValid);
      const invalidCombinations = result.filter(item => !item.isValid);

      return {
        summary: {
          totalOrders,
          validCombinations: validCombinations.length,
          invalidCombinations: invalidCombinations.length,
          validOrdersCount: validCombinations.reduce((sum, item) => sum + item.count, 0),
          invalidOrdersCount: invalidCombinations.reduce((sum, item) => sum + item.count, 0),
        },
        distribution: result,
        validCombinations,
        invalidCombinations,
      };
    } catch (error) {
      this.logger.error(`获取状态分布失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取状态转换统计
   */
  async getStatusTransitionStats(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const transitions = await this.statusChangeLogService.getStatusChangeStats(
        startDate,
        new Date()
      );

      // 获取每日转换趋势
      const dailyStats = await this.getDailyTransitionTrend(days);

      // 获取最频繁的转换路径
      const transitionPaths = await this.getTransitionPaths(startDate);

      return {
        period: {
          days,
          startDate,
          endDate: new Date(),
        },
        summary: transitions,
        dailyTrend: dailyStats,
        transitionPaths,
      };
    } catch (error) {
      this.logger.error(`获取状态转换统计失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取异常状态订单
   */
  async getAbnormalOrders() {
    try {
      // 查找所有订单的状态组合
      const orders = await this.prisma.order.findMany({
        select: {
          id: true,
          orderNo: true,
          orderStatus: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              phone: true,
              nickname: true,
            },
          },
        },
      });

      // 筛选出异常状态的订单
      const abnormalOrders = orders.filter(order =>
        !OrderStatusValidator.isValidCombination(
          order.orderStatus as OrderStatus,
          order.paymentStatus as PaymentStatus
        )
      );

      // 获取频繁状态变更的订单
      const frequentChanges = await this.statusChangeLogService.getAbnormalStatusChanges(24);

      return {
        invalidStatusOrders: abnormalOrders.map(order => ({
          ...order,
          reason: `无效的状态组合: ${order.orderStatus}+${order.paymentStatus}`,
          severity: 'high',
        })),
        frequentChangeOrders: frequentChanges.frequentChanges.map(item => ({
          orderId: item.orderId,
          changeCount: item.changeCount,
          reason: `24小时内状态变更超过${item.changeCount}次`,
          severity: 'medium',
        })),
        summary: {
          totalAbnormal: abnormalOrders.length + frequentChanges.frequentChanges.length,
          invalidStatus: abnormalOrders.length,
          frequentChanges: frequentChanges.frequentChanges.length,
        },
      };
    } catch (error) {
      this.logger.error(`获取异常订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取订单状态时间线
   */
  async getOrderStatusTimeline(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNo: true,
          orderStatus: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!order) {
        throw new Error('订单不存在');
      }

      const statusHistory = await this.statusChangeLogService.getOrderStatusHistory(orderId);

      return {
        order,
        timeline: statusHistory.map(log => ({
          id: log.id,
          timestamp: log.createdAt,
          fieldName: log.fieldName,
          oldValue: log.oldValue,
          newValue: log.newValue,
          operator: log.operator,
          reason: log.reason,
          description: `${log.fieldName === 'orderStatus' ? '订单状态' : '支付状态'}: ${log.oldValue} → ${log.newValue}`,
        })),
        currentStatus: {
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          isValid: OrderStatusValidator.isValidCombination(
            order.orderStatus as OrderStatus,
            order.paymentStatus as PaymentStatus
          ),
        },
      };
    } catch (error) {
      this.logger.error(`获取订单时间线失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取仪表板统计数据
   */
  async getDashboardStats() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [
        totalOrders,
        todayOrders,
        yesterdayOrders,
        statusDistribution,
        todayTransitions,
        abnormalOrders,
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { createdAt: { gte: today } } }),
        this.prisma.order.count({ 
          where: { 
            createdAt: { 
              gte: yesterday, 
              lt: today 
            } 
          } 
        }),
        this.getStatusDistribution(),
        this.statusChangeLogService.getStatusChangeStats(today, now),
        this.getAbnormalOrders(),
      ]);

      return {
        overview: {
          totalOrders,
          todayOrders,
          yesterdayOrders,
          orderGrowth: yesterdayOrders > 0 ? 
            ((todayOrders - yesterdayOrders) / yesterdayOrders * 100).toFixed(1) : 
            '0',
        },
        statusHealth: {
          validCombinations: statusDistribution.summary.validCombinations,
          invalidCombinations: statusDistribution.summary.invalidCombinations,
          healthScore: statusDistribution.summary.totalOrders > 0 ?
            ((statusDistribution.summary.validOrdersCount / statusDistribution.summary.totalOrders) * 100).toFixed(1) :
            '100',
        },
        todayActivity: {
          totalTransitions: todayTransitions.totalChanges,
          orderStatusChanges: todayTransitions.orderStatusChanges,
          paymentStatusChanges: todayTransitions.paymentStatusChanges,
        },
        alerts: {
          abnormalOrders: abnormalOrders.summary.totalAbnormal,
          invalidStatus: abnormalOrders.summary.invalidStatus,
          frequentChanges: abnormalOrders.summary.frequentChanges,
        },
      };
    } catch (error) {
      this.logger.error(`获取仪表板数据失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取状态告警信息
   */
  async getStatusAlerts() {
    try {
      const abnormalOrders = await this.getAbnormalOrders();
      const alerts: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        count: number;
        severity: string;
        createdAt: Date;
      }> = [];

      // 无效状态组合告警
      if (abnormalOrders.summary.invalidStatus > 0) {
        alerts.push({
          id: 'invalid-status',
          type: 'error',
          title: '发现无效状态组合',
          message: `有 ${abnormalOrders.summary.invalidStatus} 个订单处于无效状态组合`,
          count: abnormalOrders.summary.invalidStatus,
          severity: 'high',
          createdAt: new Date(),
        });
      }

      // 频繁状态变更告警
      if (abnormalOrders.summary.frequentChanges > 0) {
        alerts.push({
          id: 'frequent-changes',
          type: 'warning',
          title: '检测到频繁状态变更',
          message: `有 ${abnormalOrders.summary.frequentChanges} 个订单在24小时内频繁变更状态`,
          count: abnormalOrders.summary.frequentChanges,
          severity: 'medium',
          createdAt: new Date(),
        });
      }

      // 检查是否有长时间待支付的订单
      const timeout = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const timeoutOrders = await this.prisma.order.count({
        where: {
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PENDING_PAYMENT' as any,
          createdAt: { lt: timeout },
        },
      });

      if (timeoutOrders > 0) {
        alerts.push({
          id: 'timeout-payment',
          type: 'warning',
          title: '支付超时订单',
          message: `有 ${timeoutOrders} 个订单支付超过24小时`,
          count: timeoutOrders,
          severity: 'medium',
          createdAt: new Date(),
        });
      }

      return {
        alerts,
        summary: {
          total: alerts.length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
        },
      };
    } catch (error) {
      this.logger.error(`获取状态告警失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取每日转换趋势
   */
  private async getDailyTransitionTrend(days: number) {
    const result: Array<{
      date: string;
      totalChanges: number;
      orderStatusChanges: number;
      paymentStatusChanges: number;
    }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const stats = await this.statusChangeLogService.getStatusChangeStats(date, nextDate);
      
      result.push({
        date: date.toISOString().split('T')[0],
        totalChanges: stats.totalChanges,
        orderStatusChanges: stats.orderStatusChanges,
        paymentStatusChanges: stats.paymentStatusChanges,
      });
    }

    return result;
  }

  /**
   * 获取状态转换路径
   */
  private async getTransitionPaths(startDate: Date) {
    const logs = await this.prisma.statusChangeLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        fieldName: true,
        oldValue: true,
        newValue: true,
      },
    });

    const pathCounts = new Map<string, number>();
    
    logs.forEach(log => {
      const path = `${log.oldValue} → ${log.newValue}`;
      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
    });

    return Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 取前10个最频繁的转换路径
  }
}
