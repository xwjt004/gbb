import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsDateString, IsEnum } from 'class-validator';

/**
 * 查询预警DTO
 */
export class QueryAlertDto {
  @ApiProperty({ description: '页码', example: 1, required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 20, required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  pageSize?: number = 20;

  @ApiProperty({ 
    description: '预警状态', 
    enum: ['PENDING', 'PROCESSING', 'RESOLVED', 'IGNORED'],
    example: 'PENDING',
    required: false 
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'RESOLVED', 'IGNORED'], { 
    message: '状态必须是 PENDING, PROCESSING, RESOLVED 或 IGNORED' 
  })
  status?: string;

  @ApiProperty({ 
    description: '预警类型', 
    enum: ['LOW_STOCK', 'HIGH_STOCK', 'OUT_OF_STOCK'],
    example: 'LOW_STOCK',
    required: false 
  })
  @IsOptional()
  @IsEnum(['LOW_STOCK', 'HIGH_STOCK', 'OUT_OF_STOCK'], { 
    message: '类型必须是 LOW_STOCK, HIGH_STOCK 或 OUT_OF_STOCK' 
  })
  alertType?: string;

  @ApiProperty({ 
    description: '优先级', 
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'HIGH',
    required: false 
  })
  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'], { 
    message: '优先级必须是 HIGH, MEDIUM 或 LOW' 
  })
  priority?: string;

  @ApiProperty({ description: '开始日期', example: '2025-11-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
  startDate?: string;

  @ApiProperty({ description: '结束日期', example: '2025-11-30', required: false })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
  endDate?: string;

  @ApiProperty({ description: '商品ID', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '商品ID必须是整数' })
  @Min(1, { message: '商品ID必须大于0' })
  productId?: number;

  @ApiProperty({ description: '预警编号（模糊查询）', example: 'ALT-20251105', required: false })
  @IsOptional()
  @IsString({ message: '预警编号必须是字符串' })
  alertNo?: string;
}
