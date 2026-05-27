import { IsOptional, IsEnum, IsNumber, Min, IsString, IsDate, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @ApiProperty({ description: '套餐ID', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  packageId?: number;

  @ApiProperty({ description: '时间段ID', required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timeSlotId?: number;

  @ApiProperty({ description: '预约日期', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  appointmentDate?: Date;

  @ApiProperty({ description: '总金额', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount?: number;

  @ApiProperty({ description: '定金金额', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  depositAmount?: number;

  @ApiProperty({ description: '儿童数量', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  childrenCount?: number;

  @ApiProperty({ description: '客户姓名', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  customerName?: string;

  @ApiProperty({ description: '客户电话', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  customerPhone?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;

  @ApiProperty({
    description: '订单状态',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  orderStatus?: string;

  @ApiProperty({
    description: '支付状态',
    enum: ['CREATED', 'PAID_DEPOSIT', 'PAID_FULL', 'REFUNDED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['CREATED', 'PAID_DEPOSIT', 'PAID_FULL', 'REFUNDED'])
  paymentStatus?: string;

  @ApiProperty({ description: '已支付金额', minimum: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paidAmount?: number;

  @ApiProperty({ description: '操作人', required: false })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiProperty({ description: '变更原因', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reason?: string;
}
