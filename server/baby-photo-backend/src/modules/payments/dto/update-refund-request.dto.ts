import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CreateRefundRequestDto } from './create-refund-request.dto';

export enum RefundStatus {
  PENDING = 'PENDING',       // 待审批
  APPROVED = 'APPROVED',     // 已审批
  REJECTED = 'REJECTED',     // 已拒绝
  PROCESSING = 'PROCESSING', // 处理中
  COMPLETED = 'COMPLETED',   // 已完成
  FAILED = 'FAILED',         // 退款失败
  CANCELLED = 'CANCELLED',   // 已取消
}

export class UpdateRefundRequestDto extends PartialType(CreateRefundRequestDto) {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsString()
  rejectedBy?: string;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsOptional()
  @IsString()
  refundedBy?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
