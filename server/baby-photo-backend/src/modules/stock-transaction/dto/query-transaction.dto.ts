import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 库存流水查询 DTO
 */
export class QueryTransactionDto {
  @ApiPropertyOptional({ description: '商品ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ 
    description: '变动类型',
    enum: ['INBOUND', 'OUTBOUND', 'CHECK_IN', 'CHECK_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'MANUAL_ADJUST']
  })
  @IsOptional()
  @IsString()
  transactionType?: string;

  @ApiPropertyOptional({ 
    description: '关联类型',
    enum: ['OUTBOUND', 'CHECK', 'TRANSFER']
  })
  @IsOptional()
  @IsString()
  refType?: string;

  @ApiPropertyOptional({ description: '关联单据ID' })
  @IsOptional()
  @IsString()
  refId?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2025-11-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2025-11-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '操作人ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  operatorId?: number;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
