import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateComplaintDto {
  @ApiProperty({ description: '投诉标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '投诉描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: '优先级', required: false })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ description: '处理人 ID', required: false })
  @IsOptional()
  handlerId?: number;

  @ApiProperty({ description: '处理结果说明', required: false })
  @IsOptional()
  @IsString()
  resolution?: string;
}
