import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ToggleFavoriteDto, CheckFavoriteDto } from './dto/toggle-favorite.dto';

@Injectable()
export class WxFavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 切换收藏状态（已收藏则取消，未收藏则添加）
   */
  async toggle(wxUserId: string, dto: ToggleFavoriteDto) {
    const { itemType, packageId, productId } = dto;

    // 验证项目存在
    if (itemType === 'PACKAGE') {
      if (!packageId) {
        throw new BadRequestException('套系ID不能为空');
      }
      const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
      if (!pkg) {
        throw new NotFoundException('套系不存在');
      }
    } else if (itemType === 'PRODUCT') {
      if (!productId) {
        throw new BadRequestException('商品ID不能为空');
      }
      const product = await this.prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundException('商品不存在');
      }
    }

    // 查找是否已收藏
    const where: any = { wxUserId };
    if (itemType === 'PACKAGE') {
      where.packageId = packageId;
    } else {
      where.productId = productId;
    }

    const existing = await this.prisma.userFavorite.findFirst({ where });

    if (existing) {
      // 已收藏则取消
      await this.prisma.userFavorite.delete({ where: { id: existing.id } });
      return { favorited: false, message: '已取消收藏' };
    }

    // 未收藏则添加
    const data: any = { wxUserId };
    if (itemType === 'PACKAGE') {
      data.packageId = packageId;
    } else {
      data.productId = productId;
    }

    await this.prisma.userFavorite.create({ data });
    return { favorited: true, message: '收藏成功' };
  }

  /**
   * 获取用户的收藏列表
   */
  async getMyFavorites(wxUserId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.userFavorite.findMany({
        where: { wxUserId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              deposit: true,
              images: true,
              description: true,
              status: true,
              isOnSale: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              salePrice: true,
              images: true,
              status: true,
              isOnSale: true,
            },
          },
        },
      }),
      this.prisma.userFavorite.count({ where: { wxUserId } }),
    ]);

    const formattedItems = items.map((item) => {
      const isPackage = !!item.packageId;
      const target = isPackage ? item.package : item.product;

      return {
        id: item.id,
        itemType: isPackage ? 'PACKAGE' : 'PRODUCT',
        itemId: isPackage ? item.packageId : item.productId,
        name: target?.name || '',
        price: isPackage ? Number((target as any)?.price || 0) : Number((target as any)?.salePrice || 0),
        deposit: isPackage ? Number((target as any)?.deposit || 0) : undefined,
        image: (target?.images as string[])?.[0] || '',
        description: (target as any)?.description || '',
        isAvailable: target?.isOnSale !== false && target?.status !== 'INACTIVE',
        createdAt: item.createdAt,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 检查是否已收藏
   */
  async check(wxUserId: string, dto: CheckFavoriteDto) {
    const { packageId, productId } = dto;

    const where: any = { wxUserId };
    if (packageId) where.packageId = packageId;
    if (productId) where.productId = productId;

    if (!packageId && !productId) {
      throw new BadRequestException('请提供套系ID或商品ID');
    }

    const existing = await this.prisma.userFavorite.findFirst({ where });

    return { favorited: !!existing };
  }

  /**
   * 批量检查收藏状态（用于列表页）
   */
  async batchCheck(wxUserId: string, packageIds: number[]) {
    if (!packageIds.length) return {};

    const favorites = await this.prisma.userFavorite.findMany({
      where: {
        wxUserId,
        packageId: { in: packageIds },
      },
      select: { packageId: true },
    });

    const favoriteMap: Record<number, boolean> = {};
    for (const f of favorites) {
      if (f.packageId) favoriteMap[f.packageId] = true;
    }

    return favoriteMap;
  }
}
