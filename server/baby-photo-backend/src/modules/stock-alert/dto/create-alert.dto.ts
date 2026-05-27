import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';

/**
 * 创建预警DTO
 * 通常由系统自动创建，也可以手动创建
 */
export class CreateAlertDto {
  @ApiProperty({ description: '商品ID', example: 1 })
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsInt({ message: '商品ID必须是整数' })
  @Min(1, { message: '商品ID必须大于0' })
  productId: number;

  @ApiProperty({ 
    description: '预警类型', 
    enum: ['LOW_STOCK', 'HIGH_STOCK', 'OUT_OF_STOCK'],
    example: 'LOW_STOCK' 
  })
  @IsNotEmpty({ message: '预警类型不能为空' })
  @IsString({ message: '预警类型必须是字符串' })
  alertType: string;

  @ApiProperty({ description: '当前库存', example: 5 })
  @IsNotEmpty({ message: '当前库存不能为空' })
  @IsInt({ message: '当前库存必须是整数' })
  @Min(0, { message: '当前库存不能为负数' })
  currentStock: number;

  @ApiProperty({ description: '预警阈值', example: 10 })
  @IsNotEmpty({ message: '预警阈值不能为空' })
  @IsInt({ message: '预警阈值必须是整数' })
  @Min(0, { message: '预警阈值不能为负数' })
  threshold: number;

  @ApiProperty({ 
    description: '优先级', 
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'MEDIUM',
    required: false,
    default: 'MEDIUM'
  })
  @IsString({ message: '优先级必须是字符串' })
  priority?: string = 'MEDIUM';
}
