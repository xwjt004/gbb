import { IsOptional, IsString, IsEnum, IsNumber, IsDateString } from 'class-validator';

export class UpdateWxUserDto {
  @IsOptional()
  @IsString()
  memberLevel?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'BANNED'])
  status?: string;

  @IsOptional()
  @IsString()
  realName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  zodiac?: string;

  @IsOptional()
  @IsString()
  constellation?: string;

  @IsOptional()
  @IsDateString()
  hundredDaysDate?: string;

  @IsOptional()
  @IsDateString()
  firstBirthdayDate?: string;

  @IsOptional()
  @IsString()
  graspGift?: string;

  @IsOptional()
  @IsString()
  handFootPrint?: string;

  @IsOptional()
  @IsString()
  walletPhoto?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsOptional()
  @IsString()
  talent?: string;
}
