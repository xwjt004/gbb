import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class QueryComplaintDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '优先级', required: false })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ description: '投诉编号', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
