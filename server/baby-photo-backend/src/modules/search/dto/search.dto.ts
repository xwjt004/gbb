import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';

export class SearchUserByPhoneDto {
  @ApiProperty({
    description: '用户手机号码',
    example: '13800138000',
    required: true,
  })
  @IsString()
  phone: string;
}

export class SearchUserByNicknameDto {
  @ApiProperty({
    description: '用户昵称',
    example: '张三',
  })
  @IsString()
  nickname: string;

  @ApiProperty({
    description: '是否启用模糊查找',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  fuzzy?: boolean;
}

export class DateRangeSearchDto {
  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: '结束日期',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

export enum PriceSortOrder {
  ASC = 'price_asc',
  DESC = 'price_desc',
}

export class PriceRangeSearchDto {
  @ApiProperty({
    description: '最低价格',
    example: 500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiProperty({
    description: '最高价格',
    example: 1500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiProperty({
    description: '价格排序方式',
    enum: PriceSortOrder,
    example: PriceSortOrder.ASC,
    default: PriceSortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(PriceSortOrder)
  sort?: PriceSortOrder;
}

export class SearchPackageByNameDto {
  @ApiProperty({
    description: '套系名称',
    example: '儿童写真套系A',
  })
  @IsString()
  package_name: string;

  @ApiProperty({
    description: '是否启用模糊查找',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  fuzzy?: boolean;
}

export enum PaymentStatus {
  PENDING = 'PENDING',           // 待支付
  PROCESSING = 'PROCESSING',     // 处理中
  PAID = 'PAID',                // 已支付
  FAILED = 'FAILED',            // 支付失败
  CANCELLED = 'CANCELLED',       // 已取消
  REFUNDING = 'REFUNDING',       // 退款中
  REFUNDED = 'REFUNDED',         // 已退款
}

export class SearchByPaymentStatusDto {
  @ApiProperty({
    description: '支付状态',
    enum: PaymentStatus,
    example: PaymentStatus.PAID,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}

// 响应 DTO
export class UserSearchResultDto {
  @ApiProperty({ description: '用户 OpenID' })
  openid: string;

  @ApiProperty({ description: '用户昵称' })
  nickname: string;

  @ApiProperty({ description: '手机号码' })
  phone: string;

  @ApiProperty({ description: '头像 URL' })
  avatar: string;

  @ApiProperty({ description: '注册时间' })
  createdAt: Date;

  @ApiProperty({ description: '订单统计' })
  _count: {
    orders: number;
  };
}

export class OrderSearchResultDto {
  @ApiProperty({ description: '订单号' })
  order_no: string;

  @ApiProperty({ description: '用户信息' })
  user: {
    nickname: string;
    phone: string;
    avatar?: string;
  };

  @ApiProperty({ description: '套系信息' })
  package: {
    name: string;
    price: number;
  };

  @ApiProperty({ description: '预约日期' })
  appointment_date: Date;

  @ApiProperty({ description: '订单状态' })
  order_status: string;

  @ApiProperty({ description: '支付状态' })
  payment_status: string;

  @ApiProperty({ description: '总金额' })
  total_amount: number;
}

export class PackageSearchResultDto {
  @ApiProperty({ description: '套系 ID' })
  id: number;

  @ApiProperty({ description: '套系名称' })
  name: string;

  @ApiProperty({ description: '套系描述' })
  description: string;

  @ApiProperty({ description: '套系价格' })
  price: number;

  @ApiProperty({ description: '定金金额' })
  deposit: number;

  @ApiProperty({ description: '拍摄时长（分钟）' })
  durationMinutes: number;

  @ApiProperty({ description: '套系包含项目' })
  includes: string[];

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

export class SearchResponseDto<T> {
  @ApiProperty({ description: '响应状态码', example: 200 })
  code: number;

  @ApiProperty({ description: '响应消息', example: '查找成功' })
  message?: string;

  @ApiProperty({ description: '查找结果数据' })
  data: T[];

  @ApiProperty({ description: '分页信息' })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
