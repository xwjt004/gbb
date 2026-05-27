import { IsOptional, IsString, IsNumber, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PackageSearchDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ description: '套餐名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '状态过滤 (ACTIVE/INACTIVE)', required: false, enum: ['ACTIVE','INACTIVE'] })
  @IsOptional()
  @IsEnum(['ACTIVE','INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ description: '是否热门', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? 'true' : value === 'false' ? 'false' : undefined))
  isPopular?: string;

  @ApiProperty({ description: '最低价格', required: false })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({ description: '最高价格', required: false })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: '排序方式',
    enum: [
      'price_asc',
      'price_desc',
      'name_asc',
      'name_desc',
      'created_at_asc',
      'created_at_desc',
      'popularity',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'price_asc',
    'price_desc',
    'name_asc',
    'name_desc',
    'created_at_asc',
    'created_at_desc',
    'popularity',
  ])
  sort?: string = 'created_at_desc';
  
  @ApiProperty({ description: '套餐分类', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '套餐分类ID', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiProperty({ description: '套餐标签（用逗号分隔）', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

}
