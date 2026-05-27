import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PackageCategory {
  BABY = 'BABY',
  CHILDREN = 'CHILDREN',
  FAMILY = 'FAMILY',
  MATERNITY = 'MATERNITY',
  BIRTHDAY = 'BIRTHDAY',
  OTHER = 'OTHER',
}

export class QueryPackagesDto {
  @IsOptional()
  @IsEnum(PackageCategory)
  category?: PackageCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  status?: string;
}
