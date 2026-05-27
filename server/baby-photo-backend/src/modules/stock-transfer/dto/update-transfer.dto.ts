import { PartialType } from '@nestjs/mapped-types';
import { CreateTransferDto } from './create-transfer.dto';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export class UpdateTransferDto extends PartialType(CreateTransferDto) {
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  approvalNote?: string;

  @IsString()
  @IsOptional()
  shippingNote?: string;

  @IsString()
  @IsOptional()
  receivingNote?: string;
}
