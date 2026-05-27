import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 质检状态枚举
 */
export enum QualityStatus {
  PENDING = 'PENDING',           // 待质检
  IN_PROGRESS = 'IN_PROGRESS',   // 质检中
  PASSED = 'PASSED',             // 质检通过
  FAILED = 'FAILED',             // 质检不通过
  PARTIAL = 'PARTIAL',           // 部分通过
}

/**
 * 入库状态枚举
 */
export enum InboundStatus {
  PENDING = 'PENDING',           // 待入库
  IN_PROGRESS = 'IN_PROGRESS',   // 入库中
  COMPLETED = 'COMPLETED',       // 已完成
  CANCELLED = 'CANCELLED',       // 已取消
}

/**
 * 不合格原因类型枚举
 */
export enum RejectReason {
  DAMAGED = 'DAMAGED',           // 破损
  EXPIRED = 'EXPIRED',           // 过期
  WRONG_SPECS = 'WRONG_SPECS',   // 规格不符
  WRONG_QUANTITY = 'WRONG_QUANTITY', // 数量不符
  QUALITY_ISSUE = 'QUALITY_ISSUE',   // 质量问题
  OTHER = 'OTHER',               // 其他
}

/**
 * 入库商品明细 DTO
 */
export class InboundItemDto {
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  @IsOptional()
  specification?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  orderedQuantity: number;

  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  qualifiedQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rejectedQuantity?: number;

  @IsString()
  @IsOptional()
  batchNo?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 创建入库记录 DTO
 */
export class CreateInboundDto {
  @IsString()
  @IsNotEmpty()
  inTransitId: string;

  @IsNumber()
  @Min(0)
  totalQuantity: number;

  @IsString()
  @IsOptional()
  receivedBy?: string;

  @IsDateString()
  @IsOptional()
  receivedDate?: string;

  @IsString()
  @IsOptional()
  warehouseLocation?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InboundItemDto)
  @IsOptional()
  items?: InboundItemDto[];

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 开始质检 DTO
 */
export class StartQualityCheckDto {
  @IsString()
  @IsOptional()
  inspectorId?: string;

  @IsString()
  @IsNotEmpty()
  inspectorName: string;

  @IsDateString()
  @IsOptional()
  checkStartTime?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 质检明细 DTO
 */
export class QualityCheckItemDto {
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsNumber()
  @Min(0)
  receivedQuantity: number;

  @IsNumber()
  @Min(0)
  qualifiedQuantity: number;

  @IsNumber()
  @Min(0)
  rejectedQuantity: number;

  @IsEnum(RejectReason)
  @IsOptional()
  rejectReason?: RejectReason;

  @IsString()
  @IsOptional()
  rejectDesc?: string;

  @IsString()
  @IsOptional()
  batchNo?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 完成质检 DTO
 */
export class CompleteQualityCheckDto {
  @IsEnum(QualityStatus)
  qualityStatus: QualityStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore: number;

  @IsNumber()
  @Min(0)
  qualifiedQuantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rejectedQuantity?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QualityCheckItemDto)
  @IsOptional()
  checkDetails?: QualityCheckItemDto[];

  @IsString()
  @IsOptional()
  checkResult?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 确认入库 DTO
 */
export class ConfirmInboundDto {
  @IsNumber()
  @Min(0)
  inboundQuantity: number;

  @IsString()
  @IsNotEmpty()
  warehouseLocation: string;

  @IsString()
  @IsOptional()
  confirmedBy?: string;

  @IsDateString()
  @IsOptional()
  confirmedDate?: string;

  @IsBoolean()
  @IsOptional()
  updateInventory?: boolean;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 取消入库 DTO
 */
export class CancelInboundDto {
  @IsString()
  @IsNotEmpty()
  cancelReason: string;

  @IsString()
  @IsOptional()
  cancelledBy?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

/**
 * 查询入库记录 DTO
 */
export class QueryInboundDto {
  @IsString()
  @IsOptional()
  inboundNo?: string;

  @IsString()
  @IsOptional()
  inTransitId?: string;

  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @IsEnum(InboundStatus)
  @IsOptional()
  status?: InboundStatus;

  @IsEnum(QualityStatus)
  @IsOptional()
  qualityStatus?: QualityStatus;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;
}

/**
 * 更新入库记录 DTO
 */
export class UpdateInboundDto {
  @IsString()
  @IsOptional()
  warehouseLocation?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
