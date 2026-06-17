import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class StartGroupBuyDto {
  @ApiProperty({ description: '套餐ID' })
  @IsInt()
  packageId: number;

  @ApiProperty({ description: '成团人数', required: false, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  minCount?: number;
}
