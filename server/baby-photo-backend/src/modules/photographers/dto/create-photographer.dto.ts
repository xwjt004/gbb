import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';

export class CreatePhotographerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class QueryPhotographerDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
