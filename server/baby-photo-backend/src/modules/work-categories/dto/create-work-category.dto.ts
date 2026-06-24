import { IsOptional, IsString, IsInt } from 'class-validator';

export class CreateWorkCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class QueryWorkCategoryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
