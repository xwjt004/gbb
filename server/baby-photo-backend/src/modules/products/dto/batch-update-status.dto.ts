import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';

export class ProductBatchUpdateStatusDto {
  @ApiProperty({ description: '商品ID数组', example: [1, 2, 3] })
  @IsArray()
  @IsNotEmpty({ message: '商品ID数组不能为空' })
  productIds: number[];

  @ApiProperty({ 
    description: '商品状态', 
    enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    example: 'INACTIVE'
  })
  @IsEnum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'])
  @IsNotEmpty({ message: '状态不能为空' })
  status: string;
}
