import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckinDto {
  @ApiProperty({ description: '签到状态', enum: ['CHECKED_IN', 'NO_SHOW'] })
  @IsString()
  @IsIn(['CHECKED_IN', 'NO_SHOW'])
  status: 'CHECKED_IN' | 'NO_SHOW';
}
