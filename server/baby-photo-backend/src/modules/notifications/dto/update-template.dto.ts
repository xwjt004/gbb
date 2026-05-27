import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateTemplateDto {
  @ApiProperty({ description: '模板名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '通知类型', enum: ['PUSH', 'EMAIL', 'SYSTEM', 'WECHAT'], required: false })
  @IsOptional()
  @IsString()
  type?: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';

  @ApiProperty({ description: '模板标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '模板内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '变量名列表', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
