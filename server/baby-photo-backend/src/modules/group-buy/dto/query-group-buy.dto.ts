import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryGroupBuyDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '状态: ACTIVE / SUCCESS / FAILED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '创建时间-开始 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '创建时间-结束 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '套餐名称关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
