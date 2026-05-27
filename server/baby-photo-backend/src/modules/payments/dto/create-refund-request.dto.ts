import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum RefundType {
  FULL = 'FULL',      // 全额退款
  PARTIAL = 'PARTIAL', // 部分退款
}

export enum RefundMethod {
  ORIGINAL = 'ORIGINAL', // 原路退回
  CASH = 'CASH',         // 现金退款
  BANK = 'BANK',         // 银行转账
}

export class CreateRefundRequestDto {
  @IsNotEmpty({ message: '订单号不能为空' })
  @IsString()
  orderNo: string;

  @IsNotEmpty({ message: '退款类型不能为空' })
  @IsEnum(RefundType, { message: '退款类型必须是 FULL 或 PARTIAL' })
  refundType: RefundType;

  @IsNotEmpty({ message: '退款金额不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '退款金额必须是数字' })
  @Min(0.01, { message: '退款金额必须大于0' })
  refundAmount: number;

  @IsNotEmpty({ message: '退款原因不能为空' })
  @IsString()
  refundReason: string;

  @IsOptional()
  @IsEnum(RefundMethod, { message: '退款方式必须是 ORIGINAL、CASH 或 BANK' })
  refundMethod?: RefundMethod;

  @IsOptional()
  @IsString()
  applicantType?: string; // 申请人类型：USER/ADMIN

  @IsOptional()
  @IsString()
  applicantId?: string; // 申请人ID

  @IsOptional()
  @IsString()
  applicantName?: string; // 申请人姓名

  @IsOptional()
  @IsString()
  notes?: string; // 备注

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[]; // 附件URL数组
}
