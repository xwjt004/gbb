import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, Min, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateMemberLevelDto {
  @ApiProperty({ description: '等级（数字）' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  level: number;

  @ApiProperty({ description: '等级名称' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: '最小成长值' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  minGrowth: number;

  @ApiProperty({ description: '最大成长值' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  maxGrowth: number;

  @ApiProperty({ description: '权益列表', required: false })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiProperty({ description: '等级图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
