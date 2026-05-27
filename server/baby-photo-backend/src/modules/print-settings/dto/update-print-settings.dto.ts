import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrintSettingsDto {
  @IsBoolean()
  @IsOptional()
  showShopName?: boolean; // 显示店铺名称

  @IsBoolean()
  @IsOptional()
  showAddress?: boolean; // 显示地址

  @IsBoolean()
  @IsOptional()
  showPhone?: boolean; // 显示手机号码

  @IsBoolean()
  @IsOptional()
  showTelephone?: boolean; // 显示固定电话

  @IsBoolean()
  @IsOptional()
  showWechatId?: boolean; // 显示微信号

  @IsBoolean()
  @IsOptional()
  showDouyinId?: boolean; // 显示抖音号

  @IsBoolean()
  @IsOptional()
  showKuaishouId?: boolean; // 显示快手号

  @IsBoolean()
  @IsOptional()
  showXiaohongshuId?: boolean; // 显示小红书号

  @IsBoolean()
  @IsOptional()
  showBusinessScope?: boolean; // 显示经营项目

  @IsBoolean()
  @IsOptional()
  showBusinessHours?: boolean; // 显示营业时间
}
