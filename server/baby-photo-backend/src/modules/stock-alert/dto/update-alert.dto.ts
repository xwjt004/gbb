import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * 更新预警DTO
 * 主要用于处理预警（标记为已解决、已忽略等）
 */
export class UpdateAlertDto {
  @ApiProperty({ 
    description: '预警状态', 
    enum: ['PENDING', 'PROCESSING', 'RESOLVED', 'IGNORED'],
    example: 'RESOLVED',
    required: false 
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'RESOLVED', 'IGNORED'], { 
    message: '状态必须是 PENDING, PROCESSING, RESOLVED 或 IGNORED' 
  })
  status?: string;

  @ApiProperty({ 
    description: '优先级', 
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'HIGH',
    required: false 
  })
  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'], { 
    message: '优先级必须是 HIGH, MEDIUM 或 LOW' 
  })
  priority?: string;

  @ApiProperty({ description: '处理说明', example: '已补充库存', required: false })
  @IsOptional()
  @IsString({ message: '处理说明必须是字符串' })
  handleNote?: string;
}
