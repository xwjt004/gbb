import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsInt, 
  IsBoolean, 
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceItemDto {
  @ApiProperty({ description: '服务编号', example: 'SRV-STUDIO-01' })
  @IsString()
  @IsNotEmpty({ message: '服务编号不能为空' })
  @MaxLength(50, { message: '服务编号最长50个字符' })
  serviceNo: string;

  @ApiProperty({ description: '服务名称', example: '室内影棚拍摄' })
  @IsString()
  @IsNotEmpty({ message: '服务名称不能为空' })
  @MaxLength(100, { message: '服务名称最长100个字符' })
  name: string;

  @ApiProperty({ description: '服务分类', example: '拍摄场地' })
  @IsString()
  @IsNotEmpty({ message: '服务分类不能为空' })
  @MaxLength(50, { message: '服务分类最长50个字符' })
  category: string;

  @ApiProperty({ description: '基础价格', example: 500.00, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiProperty({ description: '单价（按次/小时）', example: 200.00, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiProperty({ description: '计价单位', example: '小时', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  priceUnit?: string;

  @ApiProperty({ description: '服务描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '服务时长（分钟）', example: 120, required: false })
  @IsInt({ message: '服务时长必须是整数' })
  @IsOptional()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: '服务要求', required: false, example: { space: '100平米', equipment: ['灯光', '背景布'] } })
  @IsOptional()
  requirements?: any;

  @ApiProperty({ description: '服务图片数组', required: false, example: ['image1.jpg', 'image2.jpg'] })
  @IsOptional()
  images?: any;

  @ApiProperty({ description: '是否启用', example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '是否必选', example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}
