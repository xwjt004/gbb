import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ description: '分类名称', example: '相册类' })
  @IsString()
  @IsNotEmpty({ message: '分类名称不能为空' })
  @MaxLength(50, { message: '分类名称最长50个字符' })
  name: string;

  @ApiProperty({ description: '分类编码', example: 'ALBUM' })
  @IsString()
  @IsNotEmpty({ message: '分类编码不能为空' })
  @MaxLength(20, { message: '分类编码最长20个字符' })
  code: string;

  @ApiProperty({ description: '分类描述', example: '各类相册产品', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '排序值', example: 1, required: false, default: 0 })
  @IsInt({ message: '排序值必须是整数' })
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ description: '是否启用', example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
