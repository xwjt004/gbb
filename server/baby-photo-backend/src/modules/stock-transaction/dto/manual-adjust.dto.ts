import { IsInt, IsString, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 手工调整库存 DTO
 */
export class ManualAdjustDto {
  @ApiProperty({ description: '商品ID', example: 1 })
  @IsNotEmpty({ message: '商品ID不能为空' })
  @Type(() => Number)
  @IsInt({ message: '商品ID必须是整数' })
  productId: number;

  @ApiProperty({ 
    description: '调整数量（正数=增加，负数=减少）', 
    example: 10 
  })
  @IsNotEmpty({ message: '调整数量不能为空' })
  @Type(() => Number)
  @IsInt({ message: '调整数量必须是整数' })
  quantity: number;

  @ApiPropertyOptional({ description: '调整原因', example: '盘点后手工调整' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '操作人ID', example: 1 })
  @IsNotEmpty({ message: '操作人ID不能为空' })
  @Type(() => Number)
  @IsInt({ message: '操作人ID必须是整数' })
  operatorId: number;
}
