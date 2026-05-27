import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CartItemType } from '@prisma/client';

/**
 * 添加到购物车 DTO
 */
export class AddToCartDto {
  @ApiProperty({
    description: '购物车项类型',
    enum: CartItemType,
    example: 'PRODUCT',
  })
  @IsEnum(CartItemType, { message: '购物车项类型无效' })
  itemType: CartItemType;

  @ApiPropertyOptional({
    description: '商品ID (当itemType为PRODUCT时必填)',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '商品ID必须是整数' })
  productId?: number;

  @ApiPropertyOptional({
    description: '套系ID (当itemType为PACKAGE时必填)',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '套系ID必须是整数' })
  packageId?: number;

  @ApiProperty({
    description: '数量',
    example: 1,
    default: 1,
  })
  @IsInt({ message: '数量必须是整数' })
  @Min(1, { message: '数量至少为1' })
  quantity: number;

  @ApiPropertyOptional({
    description: '备注 (用于DIY组件时存储额外信息)',
    example: '请尽快发货',
  })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}
