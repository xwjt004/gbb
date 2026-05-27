	import { IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseOrderStatus } from './create-purchase-order.dto';

export enum ShippingStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  RECEIVED = 'RECEIVED',
}

export class QueryPurchaseOrderDto {
  @IsOptional()
  @IsString()
  purchaseNo?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsEnum(ShippingStatus)
  shippingStatus?: ShippingStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
