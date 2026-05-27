import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';

export class CreateSeasonalPriceDto {
  @ApiProperty({ description: '套餐ID' })
  @IsNumber()
  packageId: number;

  @ApiProperty({ description: '开始日期', example: '2026-01-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期', example: '2026-02-28' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: '价格', example: 299.00 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '标签（如旺季、淡季）', required: false })
  @IsOptional()
  @IsString()
  label?: string;
}
