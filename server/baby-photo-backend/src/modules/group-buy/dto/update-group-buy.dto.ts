import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGroupBuyDto {
  @ApiPropertyOptional({ description: '成团人数' })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Type(() => Number)
  minCount?: number;

  @ApiPropertyOptional({ description: '过期时间 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @ApiPropertyOptional({ description: '团购价（仅在套餐编辑中修改）' })
  @IsOptional()
  @IsNumber()
  groupPrice?: number;
}
