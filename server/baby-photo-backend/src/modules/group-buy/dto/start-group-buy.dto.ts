import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StartGroupBuyDto {
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

  @ApiProperty({ description: '成团人数', required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  minCount?: number;
}
