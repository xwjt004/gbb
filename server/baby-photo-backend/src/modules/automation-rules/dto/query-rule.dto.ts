import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryRuleDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;
}
