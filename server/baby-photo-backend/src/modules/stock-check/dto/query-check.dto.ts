import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsDateString } from 'class-validator';

/**
 * 查询盘点单DTO
 */
export class QueryCheckDto {
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
    description: '盘点状态', 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
    example: 'PENDING',
    required: false 
  })
  @IsOptional()
  @IsString({ message: '状态必须是字符串' })
  status?: string;

  @ApiProperty({ 
    description: '盘点类型', 
    enum: ['FULL', 'PARTIAL', 'SPOT'],
    example: 'PARTIAL',
    required: false 
  })
  @IsOptional()
  @IsString({ message: '盘点类型必须是字符串' })
  checkType?: string;

  @ApiProperty({ description: '开始日期', example: '2025-11-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: '开始日期格式不正确' })
  startDate?: string;

  @ApiProperty({ description: '结束日期', example: '2025-11-30', required: false })
  @IsOptional()
  @IsDateString({}, { message: '结束日期格式不正确' })
  endDate?: string;

  @ApiProperty({ description: '盘点单号（模糊查询）', example: 'CHK-20251105', required: false })
  @IsOptional()
  @IsString({ message: '盘点单号必须是字符串' })
  checkNo?: string;
}
