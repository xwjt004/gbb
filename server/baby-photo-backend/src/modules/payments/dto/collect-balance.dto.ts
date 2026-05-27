import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CollectBalanceDto {
  @ApiProperty({ description: '订单ID' })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: '收取金额',
    example: 88.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: '支付方式',
    enum: ['WECHAT', 'ALIPAY', 'CASH', 'BANK_TRANSFER'],
    example: 'CASH',
  })
  @IsString()
  @IsEnum(['WECHAT', 'ALIPAY', 'CASH', 'BANK_TRANSFER'])
  paymentType: string;

  @ApiProperty({
    description: '备注',
    example: '收取尾款',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BalanceInfoDto {
  @ApiProperty({ description: '订单总额' })
  totalAmount: number;

  @ApiProperty({ description: '已付金额' })
  paidAmount: number;

  @ApiProperty({ description: '剩余金额' })
  remainingAmount: number;

  @ApiProperty({ description: '多收款金额（已付金额超过订单总额的部分）' })
  overpaidAmount: number;

  @ApiProperty({ description: '是否为免费订单（订单总额为0）' })
  isFreeOrder: boolean;

  @ApiProperty({ description: '是否已全额支付' })
  isFullyPaid: boolean;

  @ApiProperty({ description: '是否多收款（已付金额超过订单总额）' })
  isOverpaid: boolean;

  @ApiProperty({ description: '支付状态（PENDING/PARTIAL/PAID/FREE/OVERPAID）' })
  paymentStatus: string;

  @ApiProperty({ description: '支付记录' })
  payments: any[];
}
