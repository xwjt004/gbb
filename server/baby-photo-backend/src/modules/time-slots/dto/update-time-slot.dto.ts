import { PartialType } from '@nestjs/mapped-types';
import { CreateTimeSlotDto } from './create-time-slot.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimeSlotDto extends PartialType(CreateTimeSlotDto) {
  @ApiProperty({
    description: '是否已被预订',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isBooked?: boolean;
}
