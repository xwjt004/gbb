import { IsDateString, IsString, Matches, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TimeSlotStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export class CreateTimeSlotDto {
  @ApiProperty({
    description: '预约日期',
    example: '2024-08-15',
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: '开始时间',
    example: '09:00:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: '开始时间格式必须为 HH:MM:SS',
  })
  startTime: string;

  @ApiProperty({
    description: '结束时间',
    example: '11:00:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: '结束时间格式必须为 HH:MM:SS',
  })
  endTime: string;

  @ApiProperty({
    description: '容量',
    example: 3,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: '容量至少为1' })
  @Max(100, { message: '容量不能超过100' })
  capacity?: number;

  @ApiProperty({
    description: '状态',
    enum: TimeSlotStatus,
    example: TimeSlotStatus.AVAILABLE,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeSlotStatus, { message: '状态必须是有效的枚举值' })
  status?: TimeSlotStatus;

  @ApiProperty({
    description: '价格倍数',
    example: 1.0,
    minimum: 0.1,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: '价格倍数不能低于0.1' })
  @Max(10, { message: '价格倍数不能超过10' })
  priceMultiplier?: number;

  @ApiProperty({
    description: '是否为节假日',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isHoliday?: boolean;

  @ApiProperty({
    description: '备注',
    example: '上午时段',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
