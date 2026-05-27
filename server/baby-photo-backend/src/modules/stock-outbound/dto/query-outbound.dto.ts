import { IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryOutboundDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ 
    description: '出库单状态',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    description: '出库类型',
    enum: ['ORDER', 'DAMAGE', 'TRANSFER', 'OTHER']
  })
  @IsOptional()
  @IsString()
  outboundType?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-11-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-11-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '关键词搜索（出库单号）' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
