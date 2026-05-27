import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StockAlertService } from '../stock-alert/stock-alert.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { QueryRuleDto } from './dto/query-rule.dto';

@Injectable()
export class AutomationRulesService {
  private readonly logger = new Logger(AutomationRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly stockAlertService: StockAlertService,
  ) {}

  async create(dto: CreateRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        conditions: dto.conditions || undefined,
        actions: dto.actions,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async findAll(query: QueryRuleDto) {
    const { page = 1, pageSize = 20, trigger, enabled } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (trigger) where.trigger = trigger;
    if (enabled !== undefined) where.enabled = enabled;

    const [items, total] = await Promise.all([
      this.prisma.automationRule.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.automationRule.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    };
  }

  async findOne(id: number) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('规则不存在');
    return { code: 200, data: rule };
  }

  async update(id: number, dto: UpdateRuleDto) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('规则不存在');
    return this.prisma.automationRule.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('规则不存在');
    await this.prisma.automationRule.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }

  async toggle(id: number) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('规则不存在');
    return this.prisma.automationRule.update({
      where: { id },
      data: { enabled: !rule.enabled },
    });
  }

  /**
   * 评估并执行匹配的自动化规则
   */
  async evaluate(trigger: string, context: Record<string, any>) {
    this.logger.log(`评估自动化规则: trigger=${trigger}`);

    const rules = await this.prisma.automationRule.findMany({
      where: { trigger, enabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    for (const rule of rules) {
      try {
        if (!this.evaluateConditions(rule.conditions as any[], context)) {
          continue;
        }
        await this.executeActions(rule.actions as any[], context);
        this.logger.log(`规则执行成功: ${rule.name} (id=${rule.id})`);
      } catch (err) {
        this.logger.error(`规则执行失败: ${rule.name} (id=${rule.id})`, err);
      }
    }
  }

  private evaluateConditions(conditions: any[] | null, context: Record<string, any>): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every((cond) => {
      const actualValue = context[cond.field];
      switch (cond.operator) {
        case '>': return Number(actualValue) > Number(cond.value);
        case '>=': return Number(actualValue) >= Number(cond.value);
        case '<': return Number(actualValue) < Number(cond.value);
        case '<=': return Number(actualValue) <= Number(cond.value);
        case '==': return String(actualValue) === String(cond.value);
        case '!=': return String(actualValue) !== String(cond.value);
        case 'contains': return String(actualValue).includes(String(cond.value));
        default: return true;
      }
    });
  }

  private async executeActions(actions: any[], context: Record<string, any>) {
    for (const action of actions) {
      switch (action.type) {
        case 'SEND_NOTIFICATION': {
          const params = action.params || {};
          await this.notificationsService.create({
            type: 'SYSTEM',
            title: params.title || '系统通知',
            content: this.interpolate(params.content, context),
            recipient: context.wxUser?.openid || context.wxUserId || params.recipient || '',
          });
          break;
        }
        case 'UPDATE_ORDER_STATUS': {
          const params = action.params || {};
          if (context.order?.id) {
            await this.prisma.order.update({
              where: { id: context.order.id },
              data: { orderStatus: params.status },
            });
          }
          break;
        }
        case 'CREATE_STOCK_ALERT': {
          const params = action.params || {};
          if (context.product?.id) {
            await this.stockAlertService.createAlert({
              productId: context.product.id,
              alertType: params.alertType || 'LOW_STOCK',
              currentStock: context.currentStock || 0,
              threshold: params.threshold || 0,
              priority: params.priority || 'MEDIUM',
            });
          }
          break;
        }
        case 'SEND_COUPON': {
          const params = action.params || {};
          const wxUserId = context.wxUserId;
          const couponId = params.couponId;
          if (wxUserId && couponId) {
            const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
            if (coupon?.status === 'ACTIVE') {
              const count = await this.prisma.userCoupon.count({ where: { wxUserId, couponId } });
              if (count < (coupon.perUserLimit || 1)) {
                await this.prisma.userCoupon.create({
                  data: {
                    wxUserId,
                    couponId,
                    status: 'UNUSED',
                    expiredAt: coupon.endTime,
                  },
                });
              }
            }
          }
          break;
        }
        default:
          this.logger.warn(`未知动作类型: ${action.type}`);
      }
    }
  }

  private interpolate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(context[key] ?? context.order?.[key] ?? `{{${key}}}`);
    });
  }
}
