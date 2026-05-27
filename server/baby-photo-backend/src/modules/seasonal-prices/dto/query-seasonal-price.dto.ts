import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySeasonalPriceDto {
  @ApiProperty({ description: '套餐ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  packageId?: number;
}
