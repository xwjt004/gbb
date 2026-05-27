import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { CartItemType } from '@prisma/client';

@Injectable()
export class WxCartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户购物车列表
   * @param wxUserId 微信用户ID
   */
  async getCart(wxUserId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { wxUserId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            salePrice: true,
            marketPrice: true,
            images: true,
            stockQuantity: true,
            isOnSale: true,
            specification: true,
            unit: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            deposit: true,
            images: true,
            category: true,
            isOnSale: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算总价和总数量
    let totalAmount = 0;
    let totalQuantity = 0;

    const items = cartItems.map((item) => {
      let price = 0;
      let itemName = '';
      let itemImage: string | null = null;
      let isAvailable = true;

      switch (item.itemType) {
        case CartItemType.PRODUCT:
          if (item.product) {
            price = Number(item.product.salePrice);
            itemName = item.product.name;
            itemImage = (item.product.images as string[])?.[0] || null;
            isAvailable = item.product.isOnSale && item.product.stockQuantity >= item.quantity;
          }
          break;
        case CartItemType.PACKAGE:
          if (item.package) {
            price = Number(item.package.price);
            itemName = item.package.name;
            itemImage = item.package.images?.[0] || null;
            isAvailable = item.package.isOnSale;
          }
          break;
        case CartItemType.DIY_COMPONENT:
          // DIY组件存储在 diyComponents JSON字段中
          if (item.diyComponents) {
            const diyData = item.diyComponents as any;
            price = Number(diyData.totalPrice || 0);
            itemName = diyData.name || 'DIY组合';
            isAvailable = true;
          }
          break;
      }

      const subtotal = price * item.quantity;
      totalAmount += subtotal;
      totalQuantity += item.quantity;

      return {
        id: item.id,
        itemType: item.itemType,
        quantity: item.quantity,
        price,
        subtotal,
        isSelected: item.isSelected,
        isAvailable,
        itemName,
        itemImage,
        product: item.product,
        package: item.package,
        diyComponents: item.diyComponents,
        createdAt: item.createdAt,
      };
    });

    return {
      items,
      summary: {
        totalAmount,
        totalQuantity,
        itemCount: items.length,
      },
    };
  }

  /**
   * 添加商品到购物车
   * @param wxUserId 微信用户ID
   * @param dto 添加购物车DTO
   */
  async addToCart(wxUserId: string, dto: AddToCartDto) {
    // 验证商品/套系是否存在
    await this.validateCartItem(dto);

    // 检查是否已存在相同的购物车项
    const existingItem = await this.findExistingCartItem(wxUserId, dto);

    if (existingItem) {
      // 如果已存在,则更新数量
      const newQuantity = existingItem.quantity + dto.quantity;
      return this.updateCart(wxUserId, existingItem.id, {
        quantity: newQuantity,
      });
    }

    // 创建新的购物车项
    const data: any = {
      wxUserId,
      itemType: dto.itemType,
      quantity: dto.quantity,
    };

    if (dto.itemType === CartItemType.PRODUCT) {
      data.productId = dto.productId;
    } else if (dto.itemType === CartItemType.PACKAGE) {
      data.packageId = dto.packageId;
    } else if (dto.itemType === CartItemType.DIY_COMPONENT) {
      // DIY组件数据存储到 diyComponents 字段
      data.diyComponents = dto.remark ? { remark: dto.remark } : null;
    }

    const cartItem = await this.prisma.cartItem.create({
      data,
      include: {
        product: true,
        package: true,
      },
    });

    return {
      message: '已添加到购物车',
      cartItem,
    };
  }

  /**
   * 更新购物车项
   * @param wxUserId 微信用户ID
   * @param id 购物车项ID
   * @param dto 更新DTO
   */
  async updateCart(wxUserId: string, id: string, dto: UpdateCartDto) {
    // 验证购物车项是否属于当前用户
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }

    if (cartItem.wxUserId !== wxUserId) {
      throw new ForbiddenException('无权操作此购物车项');
    }

    // 如果是商品,检查库存
    if (cartItem.itemType === CartItemType.PRODUCT && cartItem.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: cartItem.productId },
        select: { stockQuantity: true, isTrackStock: true },
      });

      if (product?.isTrackStock && product.stockQuantity < dto.quantity) {
        throw new BadRequestException('库存不足');
      }
    }

    // 更新购物车项
    const updated = await this.prisma.cartItem.update({
      where: { id },
      data: {
        quantity: dto.quantity,
      },
      include: {
        product: true,
        package: true,
      },
    });

    return {
      message: '购物车已更新',
      cartItem: updated,
    };
  }

  /**
   * 删除购物车项
   * @param wxUserId 微信用户ID
   * @param id 购物车项ID
   */
  async removeFromCart(wxUserId: string, id: string) {
    // 验证购物车项是否属于当前用户
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      throw new NotFoundException('购物车项不存在');
    }

    if (cartItem.wxUserId !== wxUserId) {
      throw new ForbiddenException('无权操作此购物车项');
    }

    await this.prisma.cartItem.delete({
      where: { id },
    });

    return {
      message: '已从购物车移除',
    };
  }

  /**
   * 清空购物车
   * @param wxUserId 微信用户ID
   */
  async clearCart(wxUserId: string) {
    const result = await this.prisma.cartItem.deleteMany({
      where: { wxUserId },
    });

    return {
      message: '购物车已清空',
      deletedCount: result.count,
    };
  }

  /**
   * 验证购物车项是否有效
   */
  private async validateCartItem(dto: AddToCartDto) {
    switch (dto.itemType) {
      case CartItemType.PRODUCT:
        if (!dto.productId) {
          throw new BadRequestException('商品ID不能为空');
        }
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
          select: { id: true, isOnSale: true, stockQuantity: true, isTrackStock: true },
        });
        if (!product) {
          throw new NotFoundException('商品不存在');
        }
        if (!product.isOnSale) {
          throw new BadRequestException('商品已下架');
        }
        if (product.isTrackStock && product.stockQuantity < dto.quantity) {
          throw new BadRequestException('库存不足');
        }
        break;

      case CartItemType.PACKAGE:
        if (!dto.packageId) {
          throw new BadRequestException('套系ID不能为空');
        }
        const pkg = await this.prisma.package.findUnique({
          where: { id: dto.packageId },
          select: { id: true, isOnSale: true },
        });
        if (!pkg) {
          throw new NotFoundException('套系不存在');
        }
        if (!pkg.isOnSale) {
          throw new BadRequestException('套系已下架');
        }
        break;

      case CartItemType.DIY_COMPONENT:
        // DIY组件可以直接添加,不需要额外验证
        break;

      default:
        throw new BadRequestException('无效的购物车项类型');
    }
  }

  /**
   * 查找已存在的购物车项
   */
  private async findExistingCartItem(wxUserId: string, dto: AddToCartDto) {
    const where: any = {
      wxUserId,
      itemType: dto.itemType,
    };

    switch (dto.itemType) {
      case CartItemType.PRODUCT:
        where.productId = dto.productId;
        break;
      case CartItemType.PACKAGE:
        where.packageId = dto.packageId;
        break;
      case CartItemType.DIY_COMPONENT:
        // DIY组件不检查重复,每次都创建新项
        return null;
    }

    return this.prisma.cartItem.findFirst({ where });
  }
}
