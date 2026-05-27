import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SafetyStockQueryDto {
  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

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

export class BatchCalculateDto {
  @ApiPropertyOptional({ description: 'Service level (0-1)', default: 0.95 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(0.999)
  serviceLevel?: number;

  @ApiPropertyOptional({ description: 'Demand lookback period in days', default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  demandPeriodDays?: number;
}

export class UpdateSafetyStockDto {
  @ApiPropertyOptional({ description: 'Service level (0-1)', default: 0.95 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(0.999)
  serviceLevel?: number;

  @ApiPropertyOptional({ description: 'Demand lookback period in days', default: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  demandPeriodDays?: number;
}
