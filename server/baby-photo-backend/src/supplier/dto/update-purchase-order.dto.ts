import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PurchaseOrderStatus } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @IsString()
  @IsOptional()
  approver?: string;

  @IsString()
  @IsOptional()
  approvalRemark?: string;
}
