import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class SelectedItemDto {
  @ApiProperty({ description: '商品/服务ID' })
  @IsNumber()
  id: number;

  @ApiProperty({ description: '商品/服务类型', enum: ['product', 'service'] })
  @IsString()
  type: 'product' | 'service';

  @ApiProperty({ description: '商品/服务名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '单价' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: '数量', default: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: '小计' })
  @IsNumber()
  subtotal: number;
}

class CustomerInfoDto {
  @ApiProperty({ description: '客户姓名' })
  @IsString()
  name: string;

  @ApiProperty({ description: '联系电话' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDiyPackageDto {
  @ApiProperty({ description: '套系名称' })
  @IsString()
  packageName: string;

  @ApiProperty({ description: '客户ID', required: false })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiProperty({ description: '客户信息', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;

  @ApiProperty({ description: '选中的商品和服务列表', type: [SelectedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedItemDto)
  selectedItems: SelectedItemDto[];

  @ApiProperty({ description: '原始总价' })
  @IsNumber()
  originalAmount: number;

  @ApiProperty({ description: '套系过期时间', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
