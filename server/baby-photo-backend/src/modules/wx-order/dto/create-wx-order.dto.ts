import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 订单项 DTO（用于立即购买场景）
 */
export class OrderItemDto {
  @ApiProperty({
    description: '项目类型',
    example: 'PRODUCT',
    enum: ['PRODUCT', 'PACKAGE'],
  })
  @IsEnum(['PRODUCT', 'PACKAGE'], { message: '项目类型必须是 PRODUCT 或 PACKAGE' })
  itemType: 'PRODUCT' | 'PACKAGE';

  @ApiPropertyOptional({
    description: '商品ID（当类型为PRODUCT时必填）',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '商品ID必须是整数' })
  productId?: number;

  @ApiPropertyOptional({
    description: '套系ID（当类型为PACKAGE时必填）',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '套系ID必须是整数' })
  packageId?: number;

  @ApiProperty({
    description: '数量',
    example: 1,
  })
  @IsInt({ message: '数量必须是整数' })
  @Min(1, { message: '数量至少为1' })
  quantity: number;
}

/**
 * 从购物车创建订单 DTO
 */
export class CreateWxOrderDto {
  @ApiPropertyOptional({
    description: '购物车项ID列表（从购物车结算时使用）',
    example: ['cart-uuid-1', 'cart-uuid-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: '购物车项ID必须是数组' })
  @IsString({ each: true, message: '每个购物车项ID必须是字符串' })
  cartItemIds?: string[];

  @ApiPropertyOptional({
    description: '订单项列表（立即购买时使用）',
    type: [OrderItemDto],
  })
  @IsOptional()
  @IsArray({ message: '订单项必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  @ApiProperty({
    description: '收货地址ID',
    example: 'address-uuid',
  })
  @IsUUID('4', { message: '收货地址ID格式无效' })
  shippingAddressId: string;

  @ApiProperty({
    description: '预约日期',
    example: '2024-12-01T10:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate({ message: '预约日期格式无效' })
  appointmentDate: Date;

  @ApiProperty({
    description: '时间段ID',
    example: 1,
  })
  @IsInt({ message: '时间段ID必须是整数' })
  timeSlotId: number;

  @ApiPropertyOptional({
    description: '优惠券ID',
    example: 'coupon-uuid',
  })
  @IsOptional()
  @IsString({ message: '优惠券ID必须是字符串' })
  couponId?: string;

  @ApiPropertyOptional({
    description: '儿童数量',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: '儿童数量必须是整数' })
  @Min(1, { message: '儿童数量至少为1' })
  childrenCount?: number;

  @ApiPropertyOptional({
    description: '客户姓名',
    example: '张三',
  })
  @IsOptional()
  @IsString({ message: '客户姓名必须是字符串' })
  customerName?: string;

  @ApiPropertyOptional({
    description: '客户电话',
    example: '13800138000',
  })
  @IsOptional()
  @IsString({ message: '客户电话必须是字符串' })
  customerPhone?: string;

  @ApiPropertyOptional({
    description: '订单备注',
    example: '请准备粉色背景布',
  })
  @IsOptional()
  @IsString({ message: '订单备注必须是字符串' })
  notes?: string;
}

/**
 * 预约创建订单 DTO（直接下单，不需要购物车和收货地址）
 */
export class CreateBookingOrderDto {
  @ApiProperty({
    description: '套系ID',
    example: 1,
  })
  @IsInt({ message: '套系ID必须是整数' })
  packageId: number;

  @ApiProperty({
    description: '预约日期',
    example: '2024-12-01T10:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate({ message: '预约日期格式无效' })
  appointmentDate: Date;

  @ApiProperty({
    description: '时间段ID',
    example: 1,
  })
  @IsInt({ message: '时间段ID必须是整数' })
  timeSlotId: number;

  @ApiPropertyOptional({
    description: '团购活动ID',
    example: 'activity-uuid',
  })
  @IsOptional()
  @IsString({ message: '团购活动ID必须是字符串' })
  groupBuyActivityId?: string;

  @ApiPropertyOptional({
    description: '支付类型：DEPOSIT（定金）或 FULL（全款）',
    example: 'FULL',
    default: 'FULL',
  })
  @IsOptional()
  @IsEnum(['DEPOSIT', 'FULL'], { message: '支付类型必须是 DEPOSIT 或 FULL' })
  paymentType?: 'DEPOSIT' | 'FULL' = 'FULL';

  @ApiPropertyOptional({
    description: '儿童数量',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt({ message: '儿童数量必须是整数' })
  @Min(1, { message: '儿童数量至少为1' })
  childrenCount?: number;

  @ApiPropertyOptional({
    description: '客户姓名',
    example: '张三',
  })
  @IsOptional()
  @IsString({ message: '客户姓名必须是字符串' })
  customerName?: string;

  @ApiPropertyOptional({
    description: '客户电话',
    example: '13800138000',
  })
  @IsOptional()
  @IsString({ message: '客户电话必须是字符串' })
  customerPhone?: string;

  @ApiPropertyOptional({
    description: '订单备注',
    example: '请准备粉色背景布',
  })
  @IsOptional()
  @IsString({ message: '订单备注必须是字符串' })
  notes?: string;
}

/**
 * 查询我的订单 DTO
 */
export class QueryMyOrdersDto {
  @ApiPropertyOptional({
    description: '订单状态',
    example: 'PENDING',
  })
  @IsOptional()
  @IsString({ message: '订单状态必须是字符串' })
  orderStatus?: string;

  @ApiPropertyOptional({
    description: '支付状态',
    example: 'PENDING',
  })
  @IsOptional()
  @IsString({ message: '支付状态必须是字符串' })
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码至少为1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量至少为1' })
  limit?: number = 10;
}
