import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty({ description: '优惠券ID' })
  @IsString()
  couponId: string;

  @ApiProperty({ description: '微信用户ID（核销用户优惠券记录）', required: false })
  @IsOptional()
  @IsString()
  wxUserId?: string;
}
