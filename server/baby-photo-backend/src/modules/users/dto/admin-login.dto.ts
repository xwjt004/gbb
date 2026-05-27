import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ description: '管理员用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: '管理员密码', example: 'admin123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
