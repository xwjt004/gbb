import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty } from 'class-validator';
import { TimeSlotStatus } from './create-time-slot.dto';

export class BatchUpdateStatusDto {
  @ApiProperty({
    description: '时间槽ID数组',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNotEmpty()
  ids: number[];

  @ApiProperty({
    description: '新状态',
    enum: TimeSlotStatus,
    example: TimeSlotStatus.UNAVAILABLE,
  })
  @IsEnum(TimeSlotStatus)
  status: TimeSlotStatus;
}

export class BatchDeleteDto {
  @ApiProperty({
    description: '要删除的时间槽ID数组',
    example: [1, 2, 3],
  })
  @IsArray()
  @IsNotEmpty()
  ids: number[];
}
