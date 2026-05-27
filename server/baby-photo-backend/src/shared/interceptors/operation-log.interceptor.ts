import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { OperationLogsService } from '../../modules/operation-logs/operation-logs.service';
import * as jwt from 'jsonwebtoken';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const MODULE_MAP: Record<string, string> = {
  users: '用户',
  orders: '订单',
  payments: '支付',
  packages: '套餐',
  'package-categories': '套餐分类',
  products: '商品',
  'product-categories': '商品分类',
  'service-items': '服务项目',
  'time-slots': '时间槽',
  'diy-packages': 'DIY套系',
  'discount-rules': '优惠规则',
  files: '文件',
  'shop-info': '店铺信息',
  'print-settings': '打印设置',
  'system-backup': '数据备份',
  notifications: '通知',
  'stock-alert': '库存预警',
  'stock-check': '库存盘点',
  'stock-outbound': '出库',
  'stock-transfer': '调拨',
  'stock-transaction': '库存流水',
  supplier: '供应商',
  'operation-logs': '操作日志',
};

function extractModule(path: string): string {
  // /api/v1/orders/xxx -> orders
  const parts = path.replace(/^\/api\/v1\//, '').split('/');
  const key = parts[0] || 'unknown';
  return MODULE_MAP[key] || key;
}

function extractAction(method: string, path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('/cancel')) return '取消';
  if (lowerPath.includes('/confirm')) return '确认';
  if (lowerPath.includes('/approve')) return '审批';
  if (lowerPath.includes('/reject') || lowerPath.includes('/refuse')) return '驳回';
  if (lowerPath.includes('/refund')) return '退款';
  if (lowerPath.includes('/restore')) return '恢复';

  switch (method) {
    case 'POST':
      return '新增';
    case 'PUT':
    case 'PATCH':
      return '修改';
    case 'DELETE':
      return '删除';
    default:
      return method;
  }
}

function extractOperator(req: Request): { id?: string; name?: string } {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return {};

  try {
    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const payload = jwt.verify(token, secret) as any;
    return {
      id: payload.sub || payload.id,
      name: payload.username || payload.nickname || payload.phone,
    };
  } catch {
    return {};
  }
}

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OperationLogInterceptor.name);

  constructor(private readonly logsService: OperationLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const method = request.method;

    // 仅记录增删改操作
    if (!MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    const start = Date.now();
    const path = request.originalUrl || request.url;
    const operator = extractOperator(request);
    const ip = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || request.ip || '-';

    // 脱敏：排除密码类字段
    const params = { ...request.body };
    if (params.password) params.password = '******';
    if (params.confirmPassword) params.confirmPassword = '******';
    if (params.token) params.token = '******';

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const response = http.getResponse<Response>();

          this.logsService.create({
            module: extractModule(path),
            action: extractAction(method, path),
            operatorId: operator.id,
            operatorName: operator.name,
            method,
            path,
            params: Object.keys(params).length > 0 ? params : undefined,
            ip,
            duration,
            statusCode: response.statusCode,
          }).catch((err) => {
            this.logger.error(`记录操作日志失败: ${err.message}`);
          });
        },
        error: () => {
          const duration = Date.now() - start;
          const response = http.getResponse<Response>();

          this.logsService.create({
            module: extractModule(path),
            action: extractAction(method, path),
            operatorId: operator.id,
            operatorName: operator.name,
            method,
            path,
            params: Object.keys(params).length > 0 ? params : undefined,
            ip,
            duration,
            statusCode: response.statusCode,
          }).catch((err) => {
            this.logger.error(`记录操作日志(失败)失败: ${err.message}`);
          });
        },
      }),
    );
  }
}
