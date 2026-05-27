import { Module } from '@nestjs/common';
import { WxAddressService } from './wx-address.service';
import { WxAddressController } from './wx-address.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

/**
 * 微信地址管理模块
 * 提供收货地址的增删改查功能
 */
@Module({
  imports: [PrismaModule],
  providers: [WxAddressService],
  controllers: [WxAddressController],
  exports: [WxAddressService], // 导出服务，供其他模块使用（如wx-order）
})
export class WxAddressModule {}
