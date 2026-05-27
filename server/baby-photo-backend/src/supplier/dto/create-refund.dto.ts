import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
} from 'class-validator';

/**
 * 退款类型
 */
export enum RefundType {
  QUALITY_ISSUE = 'QUALITY_ISSUE',     // 质量问题
  WRONG_GOODS = 'WRONG_GOODS',         // 发错货
  EXCESS_PAYMENT = 'EXCESS_PAYMENT',   // 多付款
  ORDER_CANCEL = 'ORDER_CANCEL',       // 订单取消
  OTHER = 'OTHER',                     // 其他
}

/**
 * 退款状态
 */
export enum RefundStatus {
  PENDING = 'PENDING',         // 待审批
  APPROVED = 'APPROVED',       // 已批准
  REJECTED = 'REJECTED',       // 已拒绝
  COMPLETED = 'COMPLETED',     // 已完成
}

/**
 * 创建退款申请DTO
 */
export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @IsNumber()
  @Min(0.01)
  refundAmount: number;

  @IsEnum(RefundType)
  refundType: RefundType;

  @IsString()
  @IsNotEmpty()
  reason: string;              // 退款原因

  @IsString()
  @IsOptional()
  paymentId?: string;          // 关联的付款记录ID

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 审批退款DTO
 */
export class ApproveRefundDto {
  @IsString()
  @IsNotEmpty()
  approver: string;

  @IsString()
  @IsOptional()
  approvalRemark?: string;
}

/**
 * 拒绝退款DTO
 */
export class RejectRefundDto {
  @IsString()
  @IsNotEmpty()
  approver: string;

  @IsString()
  @IsNotEmpty()
  rejectReason: string;
}

/**
 * 完成退款DTO
 */
export class CompleteRefundDto {
  @IsString()
  @IsNotEmpty()
  transactionNo: string;       // 退款交易流水号

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 查询退款记录DTO
 */
export class QueryRefundDto {
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsEnum(RefundType)
  refundType?: RefundType;

  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;
}
