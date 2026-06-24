import { IsOptional, IsString, IsEnum, IsInt, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAlbumDto {
  @IsOptional()
  @IsString()
  wxUserId?: string;

  @IsEnum(['SAMPLE', 'ALBUM', 'PORTFOLIO'])
  albumType: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  photoUrls?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  photographerId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === 'true' || value === true))
  isPublic?: boolean;
}

export class QueryAlbumDto {
  @IsOptional()
  @IsString()
  wxUserId?: string;

  @IsOptional()
  @IsEnum(['SAMPLE', 'ALBUM', 'PORTFOLIO'])
  albumType?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  photographerId?: string;

  @IsOptional()
  @IsString()
  isPublic?: string;
}
