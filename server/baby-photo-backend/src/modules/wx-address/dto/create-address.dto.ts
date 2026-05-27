import { IsString, IsNotEmpty, IsBoolean, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建收货地址 DTO
 */
export class CreateAddressDto {
  @ApiProperty({
    description: '收货人姓名',
    example: '张三',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: '收货人姓名必须是字符串' })
  @IsNotEmpty({ message: '收货人姓名不能为空' })
  @Length(2, 50, { message: '收货人姓名长度必须在2-50个字符之间' })
  receiverName: string;

  @ApiProperty({
    description: '联系电话',
    example: '13800138000',
  })
  @IsString({ message: '联系电话必须是字符串' })
  @IsNotEmpty({ message: '联系电话不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({
    description: '省份',
    example: '北京市',
  })
  @IsString({ message: '省份必须是字符串' })
  @IsNotEmpty({ message: '省份不能为空' })
  @Length(2, 50, { message: '省份长度必须在2-50个字符之间' })
  province: string;

  @ApiProperty({
    description: '城市',
    example: '北京市',
  })
  @IsString({ message: '城市必须是字符串' })
  @IsNotEmpty({ message: '城市不能为空' })
  @Length(2, 50, { message: '城市长度必须在2-50个字符之间' })
  city: string;

  @ApiProperty({
    description: '区县',
    example: '朝阳区',
  })
  @IsString({ message: '区县必须是字符串' })
  @IsNotEmpty({ message: '区县不能为空' })
  @Length(2, 50, { message: '区县长度必须在2-50个字符之间' })
  district: string;

  @ApiProperty({
    description: '详细地址',
    example: '望京街道xxx小区x号楼x单元xxx室',
  })
  @IsString({ message: '详细地址必须是字符串' })
  @IsNotEmpty({ message: '详细地址不能为空' })
  @Length(5, 200, { message: '详细地址长度必须在5-200个字符之间' })
  detail: string;

  @ApiPropertyOptional({
    description: '邮政编码',
    example: '100000',
  })
  @IsOptional()
  @IsString({ message: '邮政编码必须是字符串' })
  @Matches(/^\d{6}$/, { message: '邮政编码格式不正确' })
  postalCode?: string;

  @ApiPropertyOptional({
    description: '是否设为默认地址',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: '是否默认必须是布尔值' })
  isDefault?: boolean;
}
