import { IsOptional, IsString, Length, Matches, IsUrl, IsEnum, IsInt } from 'class-validator';

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// 说明:
// 使用全局 ValidationPipe(whitelist:true) 时, 只有带有验证装饰器的字段才会保留。
// 之前移除装饰器导致 nickname 被剥离, 写入数据库为 null。这里恢复最小必要校验。

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  openid?: string; // 可选，未提供时由服务端生成

  @IsString({ message: '昵称不能为空' })
  @Length(1, 50, { message: '昵称长度1~50字符' })
  nickname!: string; // 必填

  @IsOptional()
  @IsUrl({}, { message: '头像必须是合法URL' })
  avatar?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+86)?1[3-9]\d{9}$/,{ message: '手机号格式不正确' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum; // 前端通常不传, 默认 ACTIVE

  @IsOptional()
  @IsInt()
  roleId?: number;
}
