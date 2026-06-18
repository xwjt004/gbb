import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateGroupBuyTierDto {
  @ApiProperty({ description: '达到该人数时适用此价格', example: 3 })
  @IsInt()
  @Min(2)
  minCount: number;

  @ApiProperty({ description: '阶梯价格', example: 299.00 })
  @IsNumber()
  @Min(0.01)
  price: number;
}

export class UpdateGroupBuyTierDto {
  @ApiPropertyOptional({ description: '达到该人数时适用此价格', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(2)
  minCount?: number;

  @ApiPropertyOptional({ description: '阶梯价格', example: 199.00 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;
}
