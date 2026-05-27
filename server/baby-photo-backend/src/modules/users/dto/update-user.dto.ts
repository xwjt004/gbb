import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsDate, IsEnum } from 'class-validator';

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @IsOptional()
  @IsEnum(UserStatusEnum)
  status?: UserStatusEnum;
}
