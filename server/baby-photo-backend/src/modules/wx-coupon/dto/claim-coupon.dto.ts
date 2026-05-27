import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 领取优惠券 DTO
 */
export class ClaimCouponDto {
  @ApiProperty({
    description: '优惠券码',
    example: 'SAVE50',
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

/**
 * 优惠券响应 DTO
 */
export class CouponResponseDto {
  @ApiProperty({ description: '优惠券ID' })
  id!: string;

  @ApiProperty({ description: '优惠券码' })
  code!: string;

  @ApiProperty({ description: '优惠券名称' })
  name!: string;

  @ApiProperty({ description: '描述', required: false })
  description?: string | null;

  @ApiProperty({ description: '折扣类型', enum: ['PERCENTAGE', 'FIXED'] })
  discountType!: string;

  @ApiProperty({ description: '折扣值' })
  discountValue!: number;

  @ApiProperty({ description: '最低消费金额' })
  minAmount!: number;

  @ApiProperty({ description: '最大折扣金额', required: false })
  maxDiscount?: number | null;

  @ApiProperty({ description: '开始时间' })
  startTime!: Date;

  @ApiProperty({ description: '结束时间' })
  endTime!: Date;

  @ApiProperty({ description: '使用上限' })
  usageLimit!: number;

  @ApiProperty({ description: '已使用次数' })
  usedCount!: number;

  @ApiProperty({ description: '状态' })
  status!: string;

  @ApiProperty({ description: '是否已领取', required: false })
  isClaimed?: boolean;

  @ApiProperty({ description: '是否已使用', required: false })
  isUsed?: boolean;

  @ApiProperty({ description: '是否已过期', required: false })
  isExpired?: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt!: Date;
}

/**
 * 我的优惠券响应 DTO
 */
export class MyCouponResponseDto extends CouponResponseDto {
  @ApiProperty({ description: '领取时间' })
  claimedAt!: Date;

  @ApiProperty({ description: '使用时间', required: false })
  usedAt?: Date | null;
}
