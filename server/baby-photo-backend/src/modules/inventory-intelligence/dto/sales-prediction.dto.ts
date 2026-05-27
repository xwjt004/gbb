import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictionQueryDto {
  @ApiPropertyOptional({ description: 'Forecast method: MA or ES', default: 'MA' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Lookback/forecast periods in days', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  periods?: number;

  @ApiPropertyOptional({ description: 'Exponential smoothing alpha (0.1-0.5)', default: 0.3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(0.5)
  alpha?: number;

  @ApiPropertyOptional({ description: 'Filter by product IDs' })
  @IsOptional()
  productIds?: number[];

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class ProductPredictionQueryDto {
  @ApiPropertyOptional({ description: 'Forecast method: MA or ES', default: 'MA' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Lookback/forecast periods in days', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  periods?: number;

  @ApiPropertyOptional({ description: 'Exponential smoothing alpha (0.1-0.5)', default: 0.3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(0.5)
  alpha?: number;
}
