import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Min,
  Length,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 支付渠道枚举（与前端 PaymentMethod 对齐）
 */
export enum PaymentChannel {
  WECHAT = 'WECHAT',
  ALIPAY = 'ALIPAY',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class CreatePaymentDto {
  @ApiProperty({ description: '订单编号', minLength: 1, maxLength: 100 })
  @IsNotEmpty({ message: '订单编号不能为空' })
  @IsString({ message: '订单编号必须是字符串' })
  @Length(1, 100, { message: '订单编号长度必须在1-100之间' })
  orderNo: string;

  @ApiProperty({
    description: '支付类型',
    enum: Object.values(PaymentChannel),
    example: PaymentChannel.WECHAT,
  })
  @IsNotEmpty({ message: '支付类型不能为空' })
  @IsEnum(PaymentChannel, { message: '支付类型必须是 WECHAT, ALIPAY, CASH 或 BANK_TRANSFER' })
  paymentType: PaymentChannel;

  @ApiProperty({
    description: '支付金额（免费订单可为0，其他订单必须 >= 0.01）',
    example: 299.0,
    minimum: 0,
  })
  @IsNotEmpty({ message: '支付金额不能为空' })
  @IsNumber({}, { message: '支付金额必须是数字' })
  @Type(() => Number)
  @ValidateIf((o) => o.amount > 0)
  @Min(0.01, { message: '支付金额必须大于等于0.01（免费订单除外）' })
  amount: number;

  @ApiProperty({
    description: '订单描述',
    example: '这是一个测试订单',
    required: false,
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: '订单描述必须是字符串' })
  @Length(1, 200, { message: '订单描述长度必须在1-200之间' })
  description?: string;

  @ApiProperty({
    description: '幂等键（Idempotency-Key），防止重复创建。也可通过请求头传递。',
    required: false,
    minLength: 10,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '幂等键必须是字符串' })
  @Length(10, 100, { message: '幂等键长度必须在10-100之间' })
  idempotencyKey?: string;
}
