import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsArray, ArrayNotEmpty, IsInt, IsDate, IsEnum } from 'class-validator';
import { UserStatusEnum } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  roleIds?: number[];
}
