import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsInt, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string; // 供应商名称

  @IsString()
  @IsOptional()
  @MaxLength(100)
  shortName?: string; // 简称

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contactPerson: string; // 联系人

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  contactPhone: string; // 联系电话

  @IsString()
  @IsOptional()
  @MaxLength(50)
  telephone?: string; // 固定电话

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  contactEmail?: string; // 联系邮箱

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string; // 地址

  // 社交媒体账号
  @IsString()
  @IsOptional()
  @MaxLength(100)
  wechatId?: string; // 微信号

  @IsString()
  @IsOptional()
  @MaxLength(100)
  douyinId?: string; // 抖音号

  @IsString()
  @IsOptional()
  @MaxLength(100)
  kuaishouId?: string; // 快手号

  @IsString()
  @IsOptional()
  @MaxLength(100)
  xiaohongshuId?: string; // 小红书号

  // 企业信息
  @IsString()
  @IsOptional()
  @MaxLength(100)
  legalPerson?: string; // 法人

  @IsString()
  @IsOptional()
  @MaxLength(100)
  businessLicense?: string; // 营业执照号

  @IsString()
  @IsOptional()
  @MaxLength(500)
  businessScope?: string; // 经营项目

  @IsString()
  @IsOptional()
  @MaxLength(100)
  taxId?: string; // 税号

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankAccount?: string; // 银行账号

  @IsString()
  @IsOptional()
  @MaxLength(200)
  bankName?: string; // 开户银行

  // 供应商类型
  @IsEnum(['PRODUCT', 'SERVICE', 'BOTH'])
  @IsOptional()
  supplierType?: string = 'PRODUCT'; // PRODUCT(商品), SERVICE(服务), BOTH(两者)

  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string; // 供应商类别

  @IsEnum(['ACTIVE', 'INACTIVE', 'BLACKLIST'])
  @IsOptional()
  status?: string = 'ACTIVE'; // ACTIVE(启用), INACTIVE(停用), BLACKLIST(黑名单)

  // 合作信息
  @IsEnum(['A+', 'A', 'B', 'C', 'D'])
  @IsOptional()
  creditLevel?: string = 'B'; // 信用等级

  @IsString()
  @IsOptional()
  @MaxLength(200)
  paymentTerms?: string; // 付款条件

  @IsInt()
  @IsOptional()
  @Min(1)
  deliveryDays?: number = 7; // 交货天数

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minOrderAmount?: number = 0; // 最小订货金额

  @IsString()
  @IsOptional()
  remark?: string; // 备注

  @IsInt()
  @IsOptional()
  createdBy?: number; // 创建人
}
