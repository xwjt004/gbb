import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsInt, IsNumber, Min, IsDateString, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryDiyPackageDto {
  @ApiProperty({ description: '套系名称关键字', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '客户ID', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiProperty({ description: '套系状态', enum: ['DRAFT', 'CONFIRMED', 'ORDERED'], required: false })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'CONFIRMED' | 'ORDERED';

  @ApiProperty({ description: '开始日期 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: '结束日期 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: '排序字段', enum: ['orderCount', 'totalSalesAmount', 'createdAt'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['orderCount', 'totalSalesAmount', 'createdAt'])
  sortBy?: string;

  @ApiProperty({ description: '排序方向', enum: ['asc', 'desc'], required: false, default: 'desc' })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ description: '页码', required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
