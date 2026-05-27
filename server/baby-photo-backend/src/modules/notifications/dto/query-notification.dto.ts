import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';

export class QueryNotificationDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  pageSize?: number = 20;

  @ApiProperty({ description: '通知类型', enum: ['PUSH', 'EMAIL', 'SYSTEM'], required: false })
  @IsOptional()
  @IsEnum(['PUSH', 'EMAIL', 'SYSTEM'], { message: '通知类型必须是 PUSH, EMAIL 或 SYSTEM' })
  type?: string;

  @ApiProperty({ description: '状态', enum: ['PENDING', 'SENT', 'FAILED'], required: false })
  @IsOptional()
  @IsEnum(['PENDING', 'SENT', 'FAILED'], { message: '状态必须是 PENDING, SENT 或 FAILED' })
  status?: string;
}
