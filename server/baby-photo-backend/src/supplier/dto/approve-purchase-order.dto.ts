import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 审批采购订单DTO
 */
export class ApprovePurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  approver: string;

  @IsString()
  @IsOptional()
  approvalRemark?: string;
}

/**
 * 驳回采购订单DTO
 */
export class RejectPurchaseOrderDto {
  @IsString()
  @IsNotEmpty()
  approver: string;

  @IsString()
  @IsNotEmpty()
  rejectReason: string;
}
