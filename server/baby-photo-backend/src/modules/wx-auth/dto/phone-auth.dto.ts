import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhoneAuthDto {
  @ApiProperty({
    description: '手机号获取凭证code',
    example: '071xyz...',
  })
  @IsString()
  code: string;
}
