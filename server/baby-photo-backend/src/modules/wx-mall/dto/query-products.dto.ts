import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductCategory {
  PHOTO = 'PHOTO',
  ALBUM = 'ALBUM',
  FRAME = 'FRAME',
  DESK_STAND = 'DESK_STAND',
  ID_PHOTO = 'ID_PHOTO',
  VIDEO = 'VIDEO',
  DESIGN = 'DESIGN',
  OTHER = 'OTHER',
}

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  category?: string;

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
  limit?: number = 200;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
