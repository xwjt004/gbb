import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// 物流方式枚举
export enum ShippingMethod {
  LAND = 'LAND',       // 陆运
  AIR = 'AIR',         // 空运
  SEA = 'SEA',         // 海运
  EXPRESS = 'EXPRESS', // 快递
}

// 物流状态枚举
export enum ShippingStatus {
  PREPARING = 'PREPARING',   // 备货中
  SHIPPED = 'SHIPPED',       // 已发货
  IN_TRANSIT = 'IN_TRANSIT', // 在途中
  ARRIVED = 'ARRIVED',       // 已到达
  DELIVERED = 'DELIVERED',   // 已交付
  DELAYED = 'DELAYED',       // 延迟
  EXCEPTION = 'EXCEPTION',   // 异常
}

// 异常类型枚举
export enum ExceptionType {
  DAMAGED = 'DAMAGED',       // 破损
  LOST = 'LOST',             // 丢失
  WRONG_ROUTE = 'WRONG_ROUTE', // 路线错误
  CUSTOMS = 'CUSTOMS',       // 海关问题
  OTHER = 'OTHER',           // 其他
}

// 创建在途商品DTO
export class CreateInTransitDto {
  @IsString()
  @IsNotEmpty({ message: '采购订单ID不能为空' })
  purchaseOrderId: string;

  @IsInt()
  @Min(1, { message: '总数量必须大于0' })
  @Type(() => Number)
  totalQuantity: number;

  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @IsOptional()
  @IsDateString()
  shippedDate?: string;

  @IsOptional()
  @IsString()
  shippedBy?: string;

  @IsOptional()
  @IsString()
  shippedFrom?: string;

  @IsOptional()
  @IsString()
  shippingCompany?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsEnum(ShippingMethod)
  shippingMethod?: ShippingMethod;

  @IsDateString()
  @IsNotEmpty({ message: '预计到货日期不能为空' })
  expectedDate: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estimatedDays?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 更新物流信息DTO
export class UpdateLogisticsDto {
  @IsOptional()
  @IsString()
  shippingCompany?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsEnum(ShippingStatus)
  shippingStatus?: ShippingStatus;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 更新物流状态DTO
export class UpdateShippingStatusDto {
  @IsEnum(ShippingStatus)
  @IsNotEmpty({ message: '物流状态不能为空' })
  shippingStatus: ShippingStatus;

  @IsOptional()
  @IsString()
  currentLocation?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 更新预计到货时间DTO
export class UpdateExpectedDateDto {
  @IsDateString()
  @IsNotEmpty({ message: '预计到货日期不能为空' })
  expectedDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  estimatedDays?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 标记延迟DTO
export class MarkDelayDto {
  @IsInt()
  @Min(1, { message: '延迟天数必须大于0' })
  @Type(() => Number)
  delayDays: number;

  @IsString()
  @IsNotEmpty({ message: '延迟原因不能为空' })
  delayReason: string;
}

// 报告异常DTO
export class ReportExceptionDto {
  @IsEnum(ExceptionType)
  @IsNotEmpty({ message: '异常类型不能为空' })
  exceptionType: ExceptionType;

  @IsString()
  @IsNotEmpty({ message: '异常描述不能为空' })
  exceptionDesc: string;
}

// 处理异常DTO
export class HandleExceptionDto {
  @IsBoolean()
  @IsNotEmpty()
  exceptionHandled: boolean;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 确认到货DTO
export class ConfirmArrivalDto {
  @IsDateString()
  @IsNotEmpty({ message: '实际到货日期不能为空' })
  actualDate: string;

  @IsInt()
  @Min(1, { message: '收货数量必须大于0' })
  @Type(() => Number)
  receivedQuantity: number;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

// 查询在途商品DTO
export class QueryInTransitDto {
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsEnum(ShippingStatus)
  shippingStatus?: ShippingStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isDelayed?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasException?: boolean;

  @IsOptional()
  @IsDateString()
  expectedStartDate?: string;

  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number = 20;
}
