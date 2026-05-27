import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsNotEmpty({ message: '模板名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '通知类型', enum: ['PUSH', 'EMAIL', 'SYSTEM', 'WECHAT'] })
  @IsNotEmpty({ message: '通知类型不能为空' })
  @IsString()
  type: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';

  @ApiProperty({ description: '模板标题' })
  @IsNotEmpty({ message: '模板标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({ description: '模板内容，使用 {{变量名}} 占位' })
  @IsNotEmpty({ message: '模板内容不能为空' })
  @IsString()
  content: string;

  @ApiProperty({ description: '变量名列表', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
