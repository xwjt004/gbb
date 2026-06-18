import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({ description: '用户openid' })
  @IsString()
  @Length(1, 100)
  userOpenid: string;

  @ApiProperty({ description: '套餐ID', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  packageId?: number;

  @ApiProperty({ description: 'DIY套系ID', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  diyPackageId?: number;

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

  @ApiProperty({ description: '总金额' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount: number;

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
    description: '支付类型',
    enum: ['DEPOSIT', 'FULL'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['DEPOSIT', 'FULL'])
  paymentType?: string;

  @ApiProperty({ description: '是否同意支付协议', required: false })
  @IsOptional()
  @Type(() => Boolean)
  agreementAccepted?: boolean;

  @ApiProperty({ description: '支付协议版本号', required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  agreementVersion?: string;

  @ApiProperty({ description: '同意支付协议的时间', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  agreementAcceptedAt?: Date;

  @ApiProperty({ description: '支付摘要（JSON 快照）', required: false })
  @IsOptional()
  @IsObject()
  paymentSummary?: Record<string, any>;

  @ApiProperty({ description: '优惠券ID', required: false })
  @IsOptional()
  @IsString()
  couponId?: string;

  @ApiProperty({ description: '微信用户ID（用于优惠券核销）', required: false })
  @IsOptional()
  @IsString()
  wxUserId?: string;

  @ApiProperty({ description: '团购活动ID（来自团购参团流程）', required: false })
  @IsOptional()
  @IsString()
  groupBuyActivityId?: string;
}
