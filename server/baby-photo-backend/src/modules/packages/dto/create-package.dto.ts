import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePackageDto {
  @ApiProperty({ description: '套餐名称' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: '套餐描述', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @ApiProperty({ description: '套餐价格' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ description: '定金金额', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deposit?: number;

  @ApiProperty({ description: '拍摄时长（分钟）' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  durationMinutes: number;

  @ApiProperty({
    description: '套餐包含内容',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[];

  @ApiProperty({ description: '图片列表', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: '套餐分类', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  category?: string;

  @ApiProperty({ description: '套餐分类ID（关联到分类表）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  categoryId?: number;

  @ApiProperty({ description: '是否热门套餐', required: false })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiProperty({ description: '套餐标签', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // 可选：初始状态（ACTIVE / INACTIVE），若不提供默认由服务层设定
  @ApiProperty({ description: '状态', required: false, enum: ['ACTIVE','INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: string;
}
