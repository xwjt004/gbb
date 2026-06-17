import { IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateAlbumDto {
  @IsOptional()
  @IsString()
  wxUserId?: string;

  @IsEnum(['SAMPLE', 'ALBUM'])
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
}

export class QueryAlbumDto {
  @IsOptional()
  @IsString()
  wxUserId?: string;

  @IsOptional()
  @IsEnum(['SAMPLE', 'ALBUM'])
  albumType?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
