import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsInt, 
  MinLength, 
  MaxLength,
  Min 
} from 'class-validator';

export class CreatePackageCategoryDto {
  @ApiProperty({ description: '分类名称', example: '儿童写真' })
  @IsString()
  @MinLength(1, { message: '分类名称不能为空' })
  @MaxLength(50, { message: '分类名称不能超过50个字符' })
  name: string;

  @ApiPropertyOptional({ description: '分类描述', example: '适合0-12岁儿童的写真套餐' })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: '分类描述不能超过200个字符' })
  description?: string;

  @ApiPropertyOptional({ description: '图标名称或URL', example: 'camera' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '分类颜色', example: '#1890ff' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '排序顺序', example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '状态', example: 'ACTIVE', default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
