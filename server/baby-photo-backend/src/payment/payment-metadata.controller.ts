/**
 * 支付元数据Controller - 提供枚举配置API
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as ApiDoc, ApiBearerAuth } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../modules/auth/guards/admin-jwt-auth.guard';

// 枚举配置版本号（每次枚举变更时更新）
const METADATA_VERSION = '1.0.0';

@ApiTags('支付元数据')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('payments/metadata')
export class PaymentMetadataController {
  /**
   * 获取所有支付相关枚举配置
   */
  @Get()
  @ApiOperation({ summary: '获取元数据枚举配置' })
  @ApiDoc({ status: 200, description: '返回所有枚举配置' })
  getMetadata() {
    return {
      paymentStatus: {
        name: '支付状态',
        items: [
          {
            value: 'PENDING',
            label: '待支付',
            color: 'orange',
            icon: 'ClockCircleOutlined',
            description: '订单已创建，等待支付',
            order: 1,
          },
          {
            value: 'PROCESSING',
            label: '处理中',
            color: 'blue',
            icon: 'SyncOutlined',
            description: '支付正在处理中',
            order: 2,
          },
          {
            value: 'FULLY_PAID',
            label: '支付成功',
            color: 'green',
            icon: 'CheckCircleOutlined',
            description: '支付已完成',
            order: 3,
          },
          {
            value: 'PARTIAL',
            label: '部分支付',
            color: 'cyan',
            icon: 'DollarOutlined',
            description: '订单已部分支付（定金）',
            order: 4,
          },
          {
            value: 'OVERPAID',
            label: '超额支付',
            color: 'gold',
            icon: 'DollarOutlined',
            description: '支付金额超过订单总额',
            order: 5,
          },
          {
            value: 'FREE',
            label: '免费订单',
            color: 'lime',
            icon: 'GiftOutlined',
            description: '免费订单，无需支付',
            order: 6,
          },
          {
            value: 'FAILED',
            label: '支付失败',
            color: 'red',
            icon: 'CloseCircleOutlined',
            description: '支付失败',
            order: 7,
          },
          {
            value: 'CANCELLED',
            label: '已取消',
            color: 'default',
            icon: 'CloseCircleOutlined',
            description: '支付已取消',
            order: 8,
          },
          {
            value: 'REFUNDING',
            label: '退款中',
            color: 'orange',
            icon: 'SyncOutlined',
            description: '退款正在处理中',
            order: 9,
          },
          {
            value: 'REFUNDED',
            label: '已退款',
            color: 'purple',
            icon: 'UndoOutlined',
            description: '已完成退款',
            order: 10,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
      paymentMethod: {
        name: '支付方式',
        items: [
          {
            value: 'WECHAT',
            label: '微信支付',
            color: 'green',
            description: '微信扫码/小程序支付',
            order: 1,
          },
          {
            value: 'ALIPAY',
            label: '支付宝',
            color: 'blue',
            description: '支付宝扫码/网页支付',
            order: 2,
          },
          {
            value: 'CASH',
            label: '现金支付',
            color: 'orange',
            description: '现场现金支付',
            order: 3,
          },
          {
            value: 'BANK_TRANSFER',
            label: '银行转账',
            color: 'purple',
            description: '银行卡转账',
            order: 4,
          },
          {
            value: 'POS',
            label: 'POS机刷卡',
            color: 'cyan',
            description: 'POS机刷卡支付',
            order: 5,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
      refundStatus: {
        name: '退款状态',
        items: [
          {
            value: 'PENDING',
            label: '待审批',
            color: 'orange',
            icon: 'ClockCircleOutlined',
            description: '退款申请待审批',
            order: 1,
          },
          {
            value: 'APPROVED',
            label: '已审批',
            color: 'blue',
            icon: 'CheckCircleOutlined',
            description: '退款申请已审批',
            order: 2,
          },
          {
            value: 'PROCESSING',
            label: '处理中',
            color: 'cyan',
            icon: 'SyncOutlined',
            description: '退款正在处理中',
            order: 3,
          },
          {
            value: 'COMPLETED',
            label: '已完成',
            color: 'green',
            icon: 'CheckCircleOutlined',
            description: '退款已完成',
            order: 4,
          },
          {
            value: 'FAILED',
            label: '退款失败',
            color: 'red',
            icon: 'CloseCircleOutlined',
            description: '退款失败',
            order: 5,
          },
          {
            value: 'CANCELLED',
            label: '已取消',
            color: 'default',
            icon: 'CloseCircleOutlined',
            description: '退款申请已取消',
            order: 6,
          },
          {
            value: 'REJECTED',
            label: '已拒绝',
            color: 'volcano',
            icon: 'StopOutlined',
            description: '退款申请已拒绝',
            order: 7,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
      refundType: {
        name: '退款类型',
        items: [
          {
            value: 'FULL',
            label: '全额退款',
            color: 'red',
            description: '退还全部金额',
            order: 1,
          },
          {
            value: 'PARTIAL',
            label: '部分退款',
            color: 'orange',
            description: '退还部分金额',
            order: 2,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
      refundMethod: {
        name: '退款方式',
        items: [
          {
            value: 'ORIGINAL',
            label: '原路退回',
            color: 'blue',
            description: '退回原支付账户',
            order: 1,
          },
          {
            value: 'CASH',
            label: '现金退款',
            color: 'orange',
            description: '现场现金退款',
            order: 2,
          },
          {
            value: 'BANK_TRANSFER',
            label: '银行转账',
            color: 'purple',
            description: '银行卡转账退款',
            order: 3,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
      orderStatus: {
        name: '订单状态',
        items: [
          {
            value: 'PENDING',
            label: '待确认',
            color: 'orange',
            icon: 'ClockCircleOutlined',
            description: '订单待确认',
            order: 1,
          },
          {
            value: 'CONFIRMED',
            label: '已确认',
            color: 'blue',
            icon: 'CheckCircleOutlined',
            description: '订单已确认',
            order: 2,
          },
          {
            value: 'IN_PROGRESS',
            label: '进行中',
            color: 'cyan',
            icon: 'SyncOutlined',
            description: '订单进行中',
            order: 3,
          },
          {
            value: 'COMPLETED',
            label: '已完成',
            color: 'green',
            icon: 'CheckCircleOutlined',
            description: '订单已完成',
            order: 4,
          },
          {
            value: 'CANCELLED',
            label: '已取消',
            color: 'red',
            icon: 'CloseCircleOutlined',
            description: '订单已取消',
            order: 5,
          },
        ],
        updatedAt: new Date().toISOString(),
        version: METADATA_VERSION,
      },
    };
  }

  /**
   * 获取元数据版本号
   */
  @Get('version')
  @ApiOperation({ summary: '获取元数据版本号' })
  @ApiDoc({ status: 200, description: '返回当前版本号' })
  getVersion() {
    return {
      version: METADATA_VERSION,
      updatedAt: new Date().toISOString(),
    };
  }
}
