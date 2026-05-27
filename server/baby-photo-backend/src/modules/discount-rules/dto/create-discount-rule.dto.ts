import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateDiscountRuleDto {
  @ApiProperty({ description: '规则名称', example: '中等价位折扣' })
  @IsString()
  name: string;

  @ApiProperty({ description: '价格区间起始值', example: 100 })
  @IsNumber()
  @Min(0)
  minAmount: number;

  @ApiProperty({ description: '价格区间结束值', example: 200 })
  @IsNumber()
  @Min(0)
  maxAmount: number;

  @ApiProperty({ description: '折扣比例 (0-1之间)', example: 0.98 })
  @IsNumber()
  @Min(0)
  @Max(1)
  discountRate: number;

  @ApiProperty({ description: '规则描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '是否启用', default: true })
  @IsOptional()
  isActive?: boolean;
}
