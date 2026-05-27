import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 采购订单状态
 */
export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',           // 草稿
  PENDING = 'PENDING',       // 待审批
  APPROVED = 'APPROVED',     // 已审批
  REJECTED = 'REJECTED',     // 已驳回
  IN_TRANSIT = 'IN_TRANSIT', // 在途
  RECEIVED = 'RECEIVED',     // 已收货
  CANCELLED = 'CANCELLED',   // 已取消
}

/**
 * 采购订单明细项
 */
export class PurchaseOrderItemDto {
  @IsNumber()
  @Min(1)
  @IsOptional()  // 改为可选，新建商品时可能没有 productId
  productId?: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 创建采购订单DTO
 */
export class CreatePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsDateString()
  @IsNotEmpty()
  purchaseDate: string;

  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  freight?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}
