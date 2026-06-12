import { IsString, IsOptional, IsNotEmpty, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShopInfoDto {
  @ApiProperty({ description: '店铺名称', example: '美好时光摄影店' })
  @IsString()
  @IsNotEmpty({ message: '店铺名称不能为空' })
  @MaxLength(200, { message: '店铺名称不能超过200个字符' })
  shopName: string;

  @ApiProperty({ description: '店铺地址', example: '北京市朝阳区XX路XX号' })
  @IsString()
  @IsNotEmpty({ message: '店铺地址不能为空' })
  @MaxLength(500, { message: '店铺地址不能超过500个字符' })
  address: string;

  @ApiProperty({ description: '手机号码', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号码不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式不正确' })
  phone: string;

  @ApiPropertyOptional({ description: '固定电话', example: '010-12345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3,4}-?\d{7,8}$/, { message: '固定电话格式不正确' })
  telephone?: string;

  @ApiPropertyOptional({ description: '店铺照片URL' })
  @IsOptional()
  @IsString()
  shopPhoto?: string;

  @ApiPropertyOptional({ description: '店铺位置图URL' })
  @IsOptional()
  @IsString()
  locationMap?: string;

  @ApiPropertyOptional({ description: '纬度', example: 41.1300 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: '经度', example: 121.1400 })
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: '店铺经营项目' })
  @IsOptional()
  @IsString()
  businessScope?: string;

  @ApiPropertyOptional({ description: '微信号', example: 'wechat_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '微信号不能超过100个字符' })
  wechatId?: string;

  @ApiPropertyOptional({ description: '抖音号', example: 'douyin_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '抖音号不能超过100个字符' })
  douyinId?: string;

  @ApiPropertyOptional({ description: '快手号', example: 'kuaishou_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '快手号不能超过100个字符' })
  kuaishouId?: string;

  @ApiPropertyOptional({ description: '小红书号', example: 'xiaohongshu_123' })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '小红书号不能超过100个字符' })
  xiaohongshuId?: string;

  @ApiPropertyOptional({ description: '营业执照号' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessLicense?: string;

  @ApiPropertyOptional({ description: '营业时间', example: '周一至周日 9:00-18:00' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessHours?: string;

  @ApiPropertyOptional({ description: '店铺简介' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '网页商城首页滚动字幕' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storefrontMarquee?: string;

  @ApiPropertyOptional({ description: '轮播图列表（最多5张）', type: 'array', example: [{ image: '/uploads/banner1.jpg', title: '标题', link: '/pages/packages/list' }] })
  @IsOptional()
  banners?: any;

  @ApiPropertyOptional({ description: '轮播播放间隔（毫秒）', example: 4000 })
  @IsOptional()
  bannerInterval?: number;
}
