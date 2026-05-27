import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsDateString } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ description: '优惠券编码' })
  @IsString()
  couponCode: string;

  @ApiProperty({ description: '优惠券名称' })
  @IsString()
  couponName: string;

  @ApiProperty({ description: '优惠券类型', enum: ['REGISTER', 'PROMOTION', 'REBATE', 'BIRTHDAY'] })
  @IsEnum(['REGISTER', 'PROMOTION', 'REBATE', 'BIRTHDAY'])
  couponType: string;

  @ApiProperty({ description: '折扣类型', enum: ['PERCENT', 'FIXED'] })
  @IsEnum(['PERCENT', 'FIXED'])
  discountType: string;

  @ApiProperty({ description: '折扣值', example: 90 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiProperty({ description: '最低消费金额', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({ description: '最大折扣金额（百分比类型时）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ description: '总数量' })
  @IsNumber()
  @Min(1)
  totalCount: number;

  @ApiProperty({ description: '每人限领', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  perUserLimit?: number;

  @ApiProperty({ description: '适用类型', required: false, default: 'ALL' })
  @IsOptional()
  @IsString()
  applicableType?: string;

  @ApiProperty({ description: '适用商品ID列表', required: false })
  @IsOptional()
  applicableIds?: number[];

  @ApiProperty({ description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: '结束时间' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
