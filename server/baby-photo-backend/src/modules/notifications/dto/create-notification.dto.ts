import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: '通知类型', enum: ['PUSH', 'EMAIL', 'SYSTEM', 'WECHAT'] })
  @IsNotEmpty({ message: '通知类型不能为空' })
  @IsEnum(['PUSH', 'EMAIL', 'SYSTEM', 'WECHAT'], { message: '通知类型必须是 PUSH, EMAIL, SYSTEM 或 WECHAT' })
  type: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';

  @ApiProperty({ description: '通知标题' })
  @IsNotEmpty({ message: '通知标题不能为空' })
  @IsString({ message: '通知标题必须是字符串' })
  title: string;

  @ApiProperty({ description: '通知内容' })
  @IsNotEmpty({ message: '通知内容不能为空' })
  @IsString({ message: '通知内容必须是字符串' })
  content: string;

  @ApiProperty({ description: '接收者（邮箱或用户ID）', required: false })
  @IsOptional()
  @IsString({ message: '接收者必须是字符串' })
  recipient?: string;
}
