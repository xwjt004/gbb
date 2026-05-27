import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WxUserInfo {
  @IsOptional()
  @IsString()
  nickName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class UsersWxLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WxUserInfo)
  userInfo?: WxUserInfo;
}
