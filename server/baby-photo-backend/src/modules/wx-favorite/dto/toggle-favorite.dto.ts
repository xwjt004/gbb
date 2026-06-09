import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleFavoriteDto {
  @ApiProperty({
    description: '收藏类型',
    enum: ['PACKAGE', 'PRODUCT'],
    example: 'PACKAGE',
  })
  @IsEnum(['PACKAGE', 'PRODUCT'], { message: '收藏类型必须是 PACKAGE 或 PRODUCT' })
  itemType: 'PACKAGE' | 'PRODUCT';

  @ApiPropertyOptional({
    description: '套系ID（当itemType为PACKAGE时必填）',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '套系ID必须是整数' })
  packageId?: number;

  @ApiPropertyOptional({
    description: '商品ID（当itemType为PRODUCT时必填）',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: '商品ID必须是整数' })
  productId?: number;
}

export class CheckFavoriteDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  packageId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  productId?: number;
}
