import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsBoolean, IsEnum, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueryProductDto {
  @ApiProperty({ description: '分类ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({ description: '商品状态', enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'], required: false })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  status?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === true || value === false) return value;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: '是否推荐', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === true || value === false) return value;
    return undefined;
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ description: '搜索关键词（商品名称/编号）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '库存状态', enum: ['NORMAL', 'LOW', 'OUT'], required: false })
  @IsOptional()
  @IsEnum(['NORMAL', 'LOW', 'OUT'])
  stockStatus?: string;

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
