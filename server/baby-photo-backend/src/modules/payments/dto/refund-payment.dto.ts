import { IsNumber, IsOptional, IsString, IsNotEmpty, Min, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RefundPaymentDto {
  @ApiProperty({
    description: '退款金额（必须大于0.01）',
    minimum: 0.01,
    example: 100.0,
  })
  @IsNotEmpty({ message: '退款金额不能为空' })
  @IsNumber({}, { message: '退款金额必须是数字' })
  @Type(() => Number)
  @Min(0.01, { message: '退款金额必须大于0.01' })
  refundAmount: number;

  @ApiPropertyOptional({
    description: '退款原因',
    minLength: 1,
    maxLength: 200,
    example: '用户申请退款',
  })
  @IsOptional()
  @IsString({ message: '退款原因必须是字符串' })
  @Length(1, 200, { message: '退款原因长度必须在1-200之间' })
  refundReason?: string;
}
