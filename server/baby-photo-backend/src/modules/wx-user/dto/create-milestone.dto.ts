import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty({ description: '幸福空间类型（出生/百天/周岁/二周岁/三周岁/四周岁/五周岁/幼儿园/小学/初中/高中/大学/硕士/博士等）', example: '出生' })
  @IsString()
  type: string;

  @ApiProperty({ description: '记录日期', required: false })
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiProperty({ description: '身高(cm)', required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({ description: '体重(kg)', required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ description: '爱好/特长', required: false })
  @IsOptional()
  @IsString()
  hobby?: string;

  @ApiProperty({ description: '照片URL', required: false })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ description: '妈妈祝福语', required: false })
  @IsOptional()
  @IsString()
  momBlessing?: string;

  @ApiProperty({ description: '爸爸祝福语', required: false })
  @IsOptional()
  @IsString()
  dadBlessing?: string;

  @ApiProperty({ description: '长辈祝福语', required: false })
  @IsOptional()
  @IsString()
  elderBlessing?: string;
}
