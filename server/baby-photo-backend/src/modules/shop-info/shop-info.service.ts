import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateShopInfoDto } from './dto/update-shop-info.dto';

@Injectable()
export class ShopInfoService {
  private readonly logger = new Logger(ShopInfoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取店铺信息
   * 如果不存在,返回默认空信息
   */
  async getShopInfo() {
    try {
      // 获取第一条记录(系统只有一条店铺信息)
      let shopInfo = await this.prisma.shopInfo.findFirst();

      // 如果不存在,创建默认记录
      if (!shopInfo) {
        this.logger.log('店铺信息不存在,创建默认记录');
        shopInfo = await this.prisma.shopInfo.create({
          data: {
            shopName: '未设置店铺名称',
            address: '未设置地址',
            phone: '13800138000',
          },
        });
      }

      return {
        code: 200,
        message: '查询成功',
        data: shopInfo,
      };
    } catch (error) {
      this.logger.error(`获取店铺信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新店铺信息
   */
  async updateShopInfo(updateDto: UpdateShopInfoDto) {
    try {
      // 查找现有记录
      const existing = await this.prisma.shopInfo.findFirst();

      let shopInfo;
      if (existing) {
        // 更新现有记录
        shopInfo = await this.prisma.shopInfo.update({
          where: { id: existing.id },
          data: updateDto,
        });
        this.logger.log(`更新店铺信息: ID=${existing.id}`);
      } else {
        // 创建新记录
        shopInfo = await this.prisma.shopInfo.create({
          data: updateDto,
        });
        this.logger.log('创建店铺信息');
      }

      return {
        code: 200,
        message: '更新成功',
        data: shopInfo,
      };
    } catch (error) {
      this.logger.error(`更新店铺信息失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 上传店铺图片
   * @param fieldName 字段名称: 'shopPhoto' | 'locationMap'
   * @param fileUrl 文件URL
   */
  async uploadShopImage(fieldName: 'shopPhoto' | 'locationMap', fileUrl: string) {
    try {
      const existing = await this.prisma.shopInfo.findFirst();

      if (!existing) {
        throw new NotFoundException('请先设置店铺基本信息');
      }

      const updateData: any = {};
      updateData[fieldName] = fileUrl;

      const shopInfo = await this.prisma.shopInfo.update({
        where: { id: existing.id },
        data: updateData,
      });

      this.logger.log(`上传店铺图片成功: ${fieldName} = ${fileUrl}`);

      return {
        code: 200,
        message: '上传成功',
        data: {
          [fieldName]: fileUrl,
        },
      };
    } catch (error) {
      this.logger.error(`上传店铺图片失败: ${error.message}`);
      throw error;
    }
  }
}

