import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';

export class BulkUpdateStatusDto {
  @ApiProperty({ description: '要更新的套餐ID列表', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  ids: number[];

  @ApiProperty({ description: '目标状态', enum: ['ACTIVE','INACTIVE'] })
  @IsEnum(['ACTIVE','INACTIVE'])
  status: 'ACTIVE' | 'INACTIVE';
}