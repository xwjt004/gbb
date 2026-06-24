import { IsOptional, IsString, Length, Matches, IsUrl, IsEnum, IsInt, IsArray, ArrayNotEmpty, MaxLength } from 'class-validator';

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateUserDto {
  @IsString({ message: '用户名不能为空' })
  @Length(3, 50, { message: '用户名长度3~50字符' })
  username!: string;

  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string; // 创建时可指定密码，未指定则后续通过重置密码设置

  @IsOptional()
  @IsString()
  @Length(1, 50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  realName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(MALE|FEMALE)$/, { message: '性别格式错误' })
  gender?: string;

  @IsOptional()
  @IsString()
  birthDate?: string; // 前端传 YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Length(1, 50)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  workHistory?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+86)?1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  wechatOfficialId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}
