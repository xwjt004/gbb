import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsArray } from 'class-validator';

export class UpdateMemberLevelDto {
  @ApiProperty({ description: '等级名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '最小成长值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  minGrowth?: number;

  @ApiProperty({ description: '最大成长值', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxGrowth?: number;

  @ApiProperty({ description: '权益列表', required: false })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiProperty({ description: '等级图标', required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
