import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 优惠券状态枚举
 */
export enum CouponStatusQuery {
  AVAILABLE = 'AVAILABLE',    // 可领取
  CLAIMED = 'CLAIMED',         // 已领取
  USED = 'USED',               // 已使用
  EXPIRED = 'EXPIRED',         // 已过期
}

/**
 * 查询优惠券列表 DTO
 */
export class QueryCouponsDto {
  @ApiPropertyOptional({
    description: '优惠券状态筛选',
    enum: CouponStatusQuery,
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(CouponStatusQuery)
  status?: CouponStatusQuery;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * 查询我的优惠券 DTO
 */
export class QueryMyCouponsDto {
  @ApiPropertyOptional({
    description: '优惠券状态筛选',
    enum: ['AVAILABLE', 'USED', 'EXPIRED'],
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'USED', 'EXPIRED'])
  status?: 'AVAILABLE' | 'USED' | 'EXPIRED';

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * 查询可用优惠券 DTO (用于结算时)
 */
export class QueryAvailableCouponsDto {
  @ApiProperty({
    description: '订单金额',
    example: 500.00,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amount!: number;
}
