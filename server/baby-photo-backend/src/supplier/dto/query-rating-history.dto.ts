import { IsInt, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRatingHistoryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 20;
}
