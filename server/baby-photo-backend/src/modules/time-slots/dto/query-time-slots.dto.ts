import { IsOptional, IsDateString, IsBoolean, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TimeSlotStatus } from './create-time-slot.dto';

export class QueryTimeSlotsDto {
  @ApiProperty({
    description: '开始日期',
    required: false,
    example: '2024-08-15',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: '结束日期',
    required: false,
    example: '2024-08-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: '是否已被预订',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isBooked?: boolean;

  @ApiProperty({
    description: '时间槽状态',
    enum: TimeSlotStatus,
    required: false,
    example: TimeSlotStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TimeSlotStatus)
  status?: TimeSlotStatus;

  @ApiProperty({
    description: '是否为节假日',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isHoliday?: boolean;

  @ApiProperty({
    description: '是否只显示有余量的时间槽',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasCapacity?: boolean;

  @ApiProperty({
    description: '备注搜索关键词',
    required: false,
    example: '上午',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: '排序方式',
    enum: ['date_asc', 'date_desc', 'time_asc', 'time_desc'],
    required: false,
    default: 'date_asc',
  })
  @IsOptional()
  @IsEnum(['date_asc', 'date_desc', 'time_asc', 'time_desc'])
  sortBy?: string;

  @ApiProperty({
    description: '页码',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: '每页数量',
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
