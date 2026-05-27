import {
  IsDateString,
  IsArray,
  IsString,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class TimeRange {
  @ApiProperty({ description: '开始时间', example: '09:00:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ description: '结束时间', example: '11:00:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ description: '容量', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  capacity?: number;
}

export class CreateBatchTimeSlotsDto {
  @ApiProperty({
    description: '日期列表',
    example: ['2024-08-15', '2024-08-16', '2024-08-17'],
    type: [String],
  })
  @IsArray()
  @IsDateString({}, { each: true })
  dates!: string[];

  @ApiProperty({
    description: '时间段列表',
    type: [TimeRange],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRange)
  timeRanges!: TimeRange[];
}
