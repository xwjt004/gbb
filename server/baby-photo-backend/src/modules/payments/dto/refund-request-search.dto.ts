import { IsOptional, IsString, IsEnum, IsDateString, IsNotEmpty, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { RefundType } from './create-refund-request.dto';

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class RefundRequestSearchDto {
  @ApiPropertyOptional({ description: '订单号' })
  @IsOptional()
  @IsString({ message: '订单号必须是字符串' })
  orderNo?: string;

  @ApiPropertyOptional({ description: '退款申请编号' })
  @IsOptional()
  @IsString({ message: '退款申请编号必须是字符串' })
  refundNo?: string;

  @ApiPropertyOptional({ description: '退款状态', enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus, { message: '退款状态必须是有效的枚举值' })
  status?: RefundStatus;

  @ApiPropertyOptional({ description: '申请人ID' })
  @IsOptional()
  @IsString({ message: '申请人ID必须是字符串' })
  applicantId?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01' })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式必须是 ISO 8601 格式' })
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-12-31' })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式必须是 ISO 8601 格式' })
  endDate?: string;

  @ApiPropertyOptional({ description: '页码（从1开始）', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量（最大100）', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于等于1' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: '退款类型', enum: RefundType })
  @IsOptional()
  @IsEnum(RefundType, { message: '退款类型必须是有效的枚举值' })
  refundType?: RefundType;
}

export class ApproveRefundRequestDto {
  @ApiPropertyOptional({ description: '审批人ID' })
  @IsOptional()
  @IsString({ message: '审批人ID必须是字符串' })
  approvedBy?: string;

  @ApiPropertyOptional({ description: '审批备注', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '审批备注必须是字符串' })
  @Length(0, 500, { message: '审批备注不能超过500字符' })
  notes?: string;
}

export class RejectRefundRequestDto {
  @ApiPropertyOptional({ description: '拒绝人ID' })
  @IsOptional()
  @IsString({ message: '拒绝人ID必须是字符串' })
  rejectedBy?: string;

  @ApiProperty({ description: '拒绝原因（必填）', minLength: 1, maxLength: 500 })
  @IsNotEmpty({ message: '拒绝原因不能为空' })
  @IsString({ message: '拒绝原因必须是字符串' })
  @Length(1, 500, { message: '拒绝原因长度必须在1-500之间' })
  rejectReason: string;
}

export class ProcessRefundRequestDto {
  @ApiPropertyOptional({ description: '退款操作人ID' })
  @IsOptional()
  @IsString({ message: '退款操作人ID必须是字符串' })
  refundedBy?: string;

  @ApiPropertyOptional({ description: '第三方退款交易号', maxLength: 200 })
  @IsOptional()
  @IsString({ message: '第三方退款交易号必须是字符串' })
  @Length(0, 200, { message: '第三方退款交易号不能超过200字符' })
  transactionId?: string;

  @ApiPropertyOptional({ description: '退款备注', maxLength: 500 })
  @IsOptional()
  @IsString({ message: '退款备注必须是字符串' })
  @Length(0, 500, { message: '退款备注不能超过500字符' })
  notes?: string;
}
