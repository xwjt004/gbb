import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsPhoneNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UserSearchDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  nickname?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  wechatId?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsString()
  fuzzy?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsEnum(['active','inactive','pending','deleted','ACTIVE','INACTIVE'])
  status?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVip?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum([
    'created_at_asc',
    'created_at_desc',
    'nickname_asc',
    'nickname_desc',
    'last_login_asc',
    'last_login_desc',
  ])
  sort?: string = 'created_at_desc';
}
