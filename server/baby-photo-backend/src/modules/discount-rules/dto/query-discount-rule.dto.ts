import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsNumber, IsString, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryDiscountRuleDto {
  @ApiProperty({ description: '规则名称关键字', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
    }
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '页码', required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
