import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCreateGroupBuyDto {
  @ApiProperty({ description: '套餐ID' })
  @IsInt()
  @Type(() => Number)
  packageId: number;

  @ApiProperty({ description: '开团人用户ID' })
  @IsString()
  creatorUserId: string;

  @ApiPropertyOptional({ description: '成团人数', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Type(() => Number)
  minCount?: number;
}
