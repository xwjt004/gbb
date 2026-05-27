import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WxLoginDto {
  @ApiProperty({
    description: '微信登录凭证code',
    example: '071xyz...',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: '加密的用户数据',
    required: false,
  })
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @ApiProperty({
    description: '加密算法的初始向量',
    required: false,
  })
  @IsOptional()
  @IsString()
  iv?: string;
}
