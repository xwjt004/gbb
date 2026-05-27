import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsInt, 
  IsBoolean, 
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: '商品编号', example: 'PROD-ALBUM-8F' })
  @IsString()
  @IsNotEmpty({ message: '商品编号不能为空' })
  @MaxLength(50, { message: '商品编号最长50个字符' })
  productNo: string;

  @ApiProperty({ description: '商品名称', example: '8寸方相册' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(100, { message: '商品名称最长100个字符' })
  name: string;

  @ApiProperty({ description: '分类ID', example: 1 })
  @IsInt({ message: '分类ID必须是整数' })
  @IsNotEmpty({ message: '分类ID不能为空' })
  categoryId: number;

  @ApiProperty({ description: '规格', example: '8寸', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  specification?: string;

  @ApiProperty({ description: '单位', example: '本', required: false, default: '件' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: '成本价', example: 50.00, required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  costPrice?: number;

  @ApiProperty({ description: '销售价', example: 150.00 })
  @IsNumber()
  @IsNotEmpty({ message: '销售价不能为空' })
  @Min(0)
  @Type(() => Number)
  salePrice: number;

  @ApiProperty({ description: '市场价', example: 200.00, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  marketPrice?: number;

  @ApiProperty({ description: '库存数量', example: 100, required: false, default: 0 })
  @IsInt({ message: '库存数量必须是整数' })
  @IsOptional()
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({ description: '低库存预警值', example: 10, required: false, default: 10 })
  @IsInt({ message: '低库存预警值必须是整数' })
  @IsOptional()
  @Min(0)
  lowStock?: number;

  @ApiProperty({ description: '最低库存', example: 5, required: false })
  @IsInt({ message: '最低库存必须是整数' })
  @IsOptional()
  @Min(0)
  minStock?: number;

  @ApiProperty({ description: '最高库存', example: 1000, required: false })
  @IsInt({ message: '最高库存必须是整数' })
  @IsOptional()
  @Min(0)
  maxStock?: number;

  @ApiProperty({ description: '再订货点', example: 20, required: false })
  @IsInt({ message: '再订货点必须是整数' })
  @IsOptional()
  @Min(0)
  reorderPoint?: number;

  @ApiProperty({ description: '是否追踪库存', example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isTrackStock?: boolean;

  @ApiProperty({ description: '商品描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: '商品详情富文本内容', 
    required: false,
    example: {
      blocks: [
        { type: 'text', content: '<p>商品介绍</p>' },
        { type: 'image', url: 'https://...', caption: '图片说明' },
        { type: 'video', url: 'https://...', poster: 'https://...', caption: '视频说明' }
      ]
    }
  })
  @IsOptional()
  detailContent?: any;

  @ApiProperty({ description: '商品图片数组', required: false, example: ['image1.jpg', 'image2.jpg'] })
  @IsOptional()
  images?: any;

  @ApiProperty({ description: '扩展属性', required: false, example: { material: 'PU皮', pages: 20 } })
  @IsOptional()
  attributes?: any;

  @ApiProperty({ description: '品牌', required: false, example: 'Canon' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  brand?: string;

  @ApiProperty({ description: '型号', required: false, example: 'EOS R5' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  model?: string;

  @ApiProperty({ description: '基础销量（营销展示用）', example: 100, required: false, default: 0 })
  @IsInt({ message: '基础销量必须是整数' })
  @IsOptional()
  @Min(0)
  baseSales?: number;

  @ApiProperty({ 
    description: '商品状态', 
    example: 'ACTIVE', 
    enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    required: false,
    default: 'ACTIVE'
  })
  @IsString()
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  status?: string;

  @ApiProperty({ description: '是否启用', example: true, required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: '是否推荐', example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}
