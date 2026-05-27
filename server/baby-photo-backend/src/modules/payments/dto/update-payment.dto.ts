import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentDto } from './create-payment.dto';
import { IsOptional, IsEnum, IsString, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiProperty({
    description: '支付状态',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDING', 'REFUNDED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDING', 'REFUNDED'])
  status?: string;

  @ApiProperty({
    description: '第三方交易ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: '支付完成时间',
    example: '2024-08-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paidAt?: Date;

  @ApiProperty({
    description: '退款时间',
    example: '2024-08-15T10:30:00Z',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  refundedAt?: Date;

  @ApiProperty({
    description: '退款原因',
    example: '用户申请退款',
    required: false,
  })
  @IsOptional()
  @IsString()
  refundReason?: string;

  @ApiProperty({
    description: '退款备注',
    example: '支付宝退款处理',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
