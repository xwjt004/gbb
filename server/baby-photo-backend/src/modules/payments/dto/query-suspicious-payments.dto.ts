import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 可疑支付检测类型
 */
export enum SuspiciousPaymentType {
  DUPLICATE = 'duplicate',       // 重复支付
  OVERPAYMENT = 'overpayment',   // 超额支付
  SYSTEM_ERROR = 'system_error', // 系统错误
  ALL = 'all',                   // 全部
}

/**
 * 可疑支付严重级别
 */
export enum SuspiciousPaymentSeverity {
  HIGH = 'high',     // 高风险
  MEDIUM = 'medium', // 中风险
  LOW = 'low',       // 低风险
  ALL = 'all',       // 全部
}

export class QuerySuspiciousPaymentsDto {
  @ApiPropertyOptional({
    description: '检测类型',
    enum: SuspiciousPaymentType,
    default: SuspiciousPaymentType.ALL,
  })
  @IsOptional()
  @IsEnum(SuspiciousPaymentType, { message: '检测类型必须是 duplicate, overpayment, system_error 或 all' })
  type?: SuspiciousPaymentType = SuspiciousPaymentType.ALL;

  @ApiPropertyOptional({
    description: '严重级别',
    enum: SuspiciousPaymentSeverity,
    default: SuspiciousPaymentSeverity.ALL,
  })
  @IsOptional()
  @IsEnum(SuspiciousPaymentSeverity, { message: '严重级别必须是 high, medium, low 或 all' })
  severity?: SuspiciousPaymentSeverity = SuspiciousPaymentSeverity.ALL;

  @ApiPropertyOptional({
    description: '页码（从1开始）',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页条数（最大100）',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数必须大于等于1' })
  @Max(100, { message: '每页条数不能超过100' })
  limit?: number = 20;
}
