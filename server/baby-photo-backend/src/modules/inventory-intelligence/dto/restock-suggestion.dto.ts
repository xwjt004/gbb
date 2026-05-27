import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RestockSuggestionQueryDto {
  @ApiPropertyOptional({ description: 'Filter by urgency: HIGH, MEDIUM, LOW' })
  @IsOptional()
  @IsString()
  urgency?: string;

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

export class ConvertSuggestionDto {
  @ApiPropertyOptional({ description: 'Supplier ID for the purchase order' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
