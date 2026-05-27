import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ChangePackageDto {
  @ApiProperty({ description: '新套餐ID' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  newPackageId: number;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
