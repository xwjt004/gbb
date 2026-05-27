import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

/**
 * 创建盘点单明细项DTO
 */
export class CreateCheckItemDto {
  @ApiProperty({ description: '商品ID', example: 1 })
  @IsNotEmpty({ message: '商品ID不能为空' })
  @IsInt({ message: '商品ID必须是整数' })
  @Min(1, { message: '商品ID必须大于0' })
  productId: number;

  @ApiProperty({ description: '系统库存数量', example: 100 })
  @IsNotEmpty({ message: '系统库存数量不能为空' })
  @IsInt({ message: '系统库存数量必须是整数' })
  @Min(0, { message: '系统库存数量不能为负数' })
  systemQuantity: number;

  @ApiProperty({ description: '实际盘点数量', example: 95, required: false })
  @IsOptional()
  @IsInt({ message: '实际盘点数量必须是整数' })
  @Min(0, { message: '实际盘点数量不能为负数' })
  actualQuantity?: number;

  @ApiProperty({ description: '备注', example: '部分商品损坏', required: false })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

/**
 * 创建盘点单DTO
 */
export class CreateCheckDto {
  @ApiProperty({ description: '盘点日期', example: '2025-11-05T10:00:00' })
  @IsNotEmpty({ message: '盘点日期不能为空' })
  @IsDateString({}, { message: '盘点日期格式不正确' })
  checkDate: string;

  @ApiProperty({ description: '盘点类型', enum: ['FULL', 'PARTIAL', 'SPOT'], example: 'PARTIAL' })
  @IsNotEmpty({ message: '盘点类型不能为空' })
  @IsString({ message: '盘点类型必须是字符串' })
  checkType: string;

  @ApiProperty({ description: '盘点明细', type: [CreateCheckItemDto] })
  @IsNotEmpty({ message: '盘点明细不能为空' })
  @IsArray({ message: '盘点明细必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => CreateCheckItemDto)
  items: CreateCheckItemDto[];

  @ApiProperty({ description: '备注', example: '月度盘点', required: false })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}
