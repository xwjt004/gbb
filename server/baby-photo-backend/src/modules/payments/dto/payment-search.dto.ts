import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsPhoneNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PaymentSearchDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsPhoneNumber('CN')
  phone?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsOptional()
  @IsEnum(['PENDING_PAYMENT', 'PARTIAL_PAID', 'FULLY_PAID', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDING', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsEnum(['WECHAT', 'ALIPAY', 'CASH', 'BANK_TRANSFER'])
  paymentType?: string;

  @IsOptional()
  @IsString()
  paymentNo?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeUnpaidOrders?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
