import {
  IsArray,
  IsBoolean,
  IsDate,
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
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ProductItemDto {
  @ApiProperty({ description: '商品ID' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  productId: number;

  @ApiProperty({ description: '数量', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}

export class ServiceItemDto {
  @ApiProperty({ description: '服务项目ID（有则关联已有服务，无则新建）', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  serviceId?: number;

  @ApiProperty({ description: '服务名称（新建服务时必填）', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '数量', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ description: '服务图片URL（新建服务时可选）', required: false })
  @IsOptional()
  @IsString()
  image?: string;
}

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

  @ApiProperty({ description: '促销价格', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  promotionPrice?: number;

  @ApiProperty({ description: '促销开始时间', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  promotionStart?: Date;

  @ApiProperty({ description: '促销结束时间', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  promotionEnd?: Date;

  @ApiProperty({ description: '团购最少人数', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  groupMinCount?: number;

  @ApiProperty({ description: '团购价格', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  groupPrice?: number;

  @ApiProperty({ description: '团购说明（如：3人成团享8折优惠）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  groupBuyDescription?: string;

  @ApiProperty({ description: '团购海报标题', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  posterTitle?: string;

  @ApiProperty({ description: '团购海报内容描述', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  posterContent?: string;

  @ApiProperty({ description: '团购海报背景（颜色值或背景图URL）', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  posterBackground?: string;

  @ApiProperty({ description: '团购海报宣传照片', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  posterImages?: string[];

  @ApiProperty({ description: '关联商品列表（含数量）', type: [ProductItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products?: ProductItemDto[];

  @ApiProperty({ description: '关联服务项目ID列表', type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  serviceIds?: number[];

  @ApiProperty({ description: '关联服务项目列表（含数量）', type: [ServiceItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services?: ServiceItemDto[];

  @ApiProperty({ description: '关联商品ID列表（兼容旧版）', type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  productIds?: number[];
}
