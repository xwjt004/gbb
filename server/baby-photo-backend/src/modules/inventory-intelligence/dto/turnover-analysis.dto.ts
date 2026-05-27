import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TurnoverQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;
}
