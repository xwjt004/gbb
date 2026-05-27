import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOutboundItemDto {
  @ApiProperty({ description: '商品ID' })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ description: '出库数量' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateOutboundDto {
  @ApiProperty({ 
    description: '出库类型',
    enum: ['ORDER', 'DAMAGE', 'TRANSFER', 'OTHER'],
    example: 'ORDER'
  })
  @IsString()
  @IsNotEmpty()
  outboundType: string;

  @ApiProperty({ description: '出库日期', example: '2025-11-05' })
  @IsDateString()
  @IsNotEmpty()
  outboundDate: string;

  @ApiPropertyOptional({ description: '关联订单ID（订单出库时必填）' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: '出库明细', type: [CreateOutboundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOutboundItemDto)
  items: CreateOutboundItemDto[];

  @ApiPropertyOptional({ description: '出库备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
