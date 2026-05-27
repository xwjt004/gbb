import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { CreateDiyPackageDto } from './create-diy-package.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateDiyPackageDto extends PartialType(CreateDiyPackageDto) {
  @ApiProperty({ description: '套系状态', enum: ['DRAFT', 'CONFIRMED', 'ORDERED'], required: false })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
}
