import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

/**
 * 微信地址管理服务
 * 提供收货地址的增删改查功能
 */
@Injectable()
export class WxAddressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的所有地址
   * @param wxUserId 微信用户ID
   * @returns 地址列表（默认地址排在最前面）
   */
  async findAll(wxUserId: string) {
    const addresses = await this.prisma.shippingAddress.findMany({
      where: { wxUserId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      receiverName: addr.receiverName,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      detail: addr.detail,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt,
      updatedAt: addr.updatedAt,
    }));
  }

  /**
   * 获取单个地址详情
   * @param wxUserId 微信用户ID
   * @param id 地址ID
   */
  async findOne(wxUserId: string, id: string) {
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id,
        wxUserId,
      },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }

    return {
      id: address.id,
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * 创建新地址
   * @param wxUserId 微信用户ID
   * @param dto 创建地址DTO
   */
  async create(wxUserId: string, dto: CreateAddressDto) {
    // 如果设置为默认地址，先取消其他默认地址
    if (dto.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: {
          wxUserId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await this.prisma.shippingAddress.create({
      data: {
        wxUserId,
        receiverName: dto.receiverName,
        phone: dto.phone,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        postalCode: dto.postalCode,
        isDefault: dto.isDefault ?? false,
      },
    });

    return {
      id: address.id,
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * 更新地址
   * @param wxUserId 微信用户ID
   * @param id 地址ID
   * @param dto 更新地址DTO
   */
  async update(wxUserId: string, id: string, dto: UpdateAddressDto) {
    // 验证地址是否存在且属于当前用户
    const existingAddress = await this.prisma.shippingAddress.findFirst({
      where: {
        id,
        wxUserId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('地址不存在');
    }

    // 如果要设置为默认地址，先取消其他默认地址
    if (dto.isDefault && !existingAddress.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: {
          wxUserId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 更新地址
    const address = await this.prisma.shippingAddress.update({
      where: { id },
      data: {
        receiverName: dto.receiverName,
        phone: dto.phone,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        postalCode: dto.postalCode,
        isDefault: dto.isDefault,
      },
    });

    return {
      id: address.id,
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  /**
   * 删除地址
   * @param wxUserId 微信用户ID
   * @param id 地址ID
   */
  async remove(wxUserId: string, id: string) {
    // 验证地址是否存在且属于当前用户
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id,
        wxUserId,
      },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }

    await this.prisma.shippingAddress.delete({
      where: { id },
    });

    return {
      success: true,
      message: '地址删除成功',
    };
  }

  /**
   * 设置默认地址
   * @param wxUserId 微信用户ID
   * @param id 地址ID
   */
  async setDefault(wxUserId: string, id: string) {
    // 验证地址是否存在且属于当前用户
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id,
        wxUserId,
      },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }

    // 如果已经是默认地址，直接返回
    if (address.isDefault) {
      return {
        success: true,
        message: '该地址已是默认地址',
      };
    }

    // 取消其他默认地址，设置当前地址为默认
    await this.prisma.$transaction([
      this.prisma.shippingAddress.updateMany({
        where: {
          wxUserId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      }),
      this.prisma.shippingAddress.update({
        where: { id },
        data: {
          isDefault: true,
        },
      }),
    ]);

    return {
      success: true,
      message: '默认地址设置成功',
    };
  }

  /**
   * 获取默认地址
   * @param wxUserId 微信用户ID
   */
  async getDefault(wxUserId: string) {
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        wxUserId,
        isDefault: true,
      },
    });

    if (!address) {
      return null;
    }

    return {
      id: address.id,
      receiverName: address.receiverName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
