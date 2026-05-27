import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 更新盘点单明细项DTO
 */
export class UpdateCheckItemDto {
  @ApiProperty({ description: '明细项ID（更新时需要）', required: false })
  @IsOptional()
  @IsString({ message: '明细项ID必须是字符串' })
  id?: string;

  @ApiProperty({ description: '商品ID', required: false })
  @IsOptional()
  @IsInt({ message: '商品ID必须是整数' })
  @Min(1, { message: '商品ID必须大于0' })
  productId?: number;

  @ApiProperty({ description: '系统库存数量', required: false })
  @IsOptional()
  @IsInt({ message: '系统库存数量必须是整数' })
  @Min(0, { message: '系统库存数量不能为负数' })
  systemQuantity?: number;

  @ApiProperty({ description: '实际盘点数量', required: false })
  @IsOptional()
  @IsInt({ message: '实际盘点数量必须是整数' })
  @Min(0, { message: '实际盘点数量不能为负数' })
  actualQuantity?: number;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

/**
 * 更新盘点单DTO
 * 只允许更新备注和明细项
 */
export class UpdateCheckDto {
  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;

  @ApiProperty({ description: '盘点明细（可选）', type: [UpdateCheckItemDto], required: false })
  @IsOptional()
  @IsArray({ message: '盘点明细必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => UpdateCheckItemDto)
  items?: UpdateCheckItemDto[];
}
