import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreateGroupBuyDto {
  @ApiPropertyOptional({ description: '套餐ID（与商品ID二选一）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  packageId?: number;

  @ApiPropertyOptional({ description: '商品ID（与套餐ID二选一）' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  productId?: number;

  @ApiProperty({ description: '开团人用户ID' })
  @IsString()
  creatorUserId: string;

  @ApiPropertyOptional({ description: '成团人数', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Type(() => Number)
  minCount?: number;

  @ApiPropertyOptional({ description: '参团人数上限（不填=不限制）' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Type(() => Number)
  maxCount?: number;
}
