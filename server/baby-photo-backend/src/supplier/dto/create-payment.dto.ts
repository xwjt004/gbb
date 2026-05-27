import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { PaymentStatus } from '../../shared/enums/payment-status.enum';

/**
 * 付款方式
 */
export enum PaymentMethod {
  CASH = 'CASH',               // 现金
  BANK_TRANSFER = 'BANK_TRANSFER', // 银行转账
  ALIPAY = 'ALIPAY',           // 支付宝
  WECHAT = 'WECHAT',           // 微信支付
  CHECK = 'CHECK',             // 支票
  OTHER = 'OTHER',             // 其他
}

/**
 * 创建供应商付款记录DTO
 */
export class CreateSupplierPaymentDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @IsString()
  @IsOptional()
  transactionNo?: string;      // 交易流水号

  @IsString()
  @IsOptional()
  bankName?: string;           // 银行名称

  @IsString()
  @IsOptional()
  bankAccount?: string;        // 银行账号

  @IsString()
  @IsOptional()
  payee?: string;              // 收款人

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 查询付款记录DTO
 */
export class QueryPaymentDto {
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
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
