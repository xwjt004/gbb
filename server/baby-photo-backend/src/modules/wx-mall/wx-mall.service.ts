import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueryPackagesDto } from './dto/query-packages.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CalculateDiyDto } from './dto/calculate-diy.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WxMallService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取商品分类列表
   */
  async getProductCategories() {
    const categories = await this.prisma.productCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        sortOrder: true,
      },
    });

    return {
      code: 200,
      message: '查询成功',
      data: categories,
    };
  }

  /**
   * 获取套系分类列表
   */
  async getPackageCategories() {
    const categories = await this.prisma.packageCategory.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        color: true,
        sortOrder: true,
      },
    });

    return {
      code: 200,
      message: '查询成功',
      data: categories,
    };
  }

  /**
   * 获取首页数据
   */
  async getHomeData() {
    // 获取热门套系 (前6个)
    const hotPackages = await this.prisma.package.findMany({
      where: {
        isOnSale: true,
        status: 'ACTIVE',
      },
      orderBy: {
        salesVolume: 'desc',
      },
      take: 6,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        isPopular: true,
        salesVolume: true,
        baseSales: true,
      },
    });

    // 获取推荐商品 (前8个)
    const recommendProducts = await this.prisma.product.findMany({
      where: {
        isOnSale: true,
        status: 'ACTIVE',
      },
      orderBy: {
        salesVolume: 'desc',
      },
      take: 8,
      select: {
        id: true,
        name: true,
        description: true,
        salePrice: true,
        marketPrice: true,
        images: true,
        stockQuantity: true,
        salesVolume: true,
        baseSales: true,
      },
    });

    // 转换商品数据格式
    const formattedProducts = recommendProducts.map(product => ({
      ...product,
      price: product.salePrice,
      stock: product.stockQuantity,
      salesCount: (product.baseSales || 0) + (product.salesVolume || 0), // 展示销量 = 基础销量 + 实际销量
      thumbnail: ((product.images as string[])?.[0]) || '',
    }));

    // 获取统计信息
    const stats = {
      totalPackages: await this.prisma.package.count({ where: { isOnSale: true } }),
      totalProducts: await this.prisma.product.count({ where: { isOnSale: true } }),
      totalOrders: await this.prisma.order.count(),
    };

    // 确保数组字段不为 null
    const safePackages = hotPackages.map(pkg => ({
      ...pkg,
      images: (pkg.images as string[]) || [],
    }));

    // 从店铺信息获取轮播图配置
    const shopInfo = await this.prisma.shopInfo.findFirst({
      select: { banners: true, bannerInterval: true },
    });

    let banners: any[];
    if (shopInfo?.banners && Array.isArray(shopInfo.banners) && shopInfo.banners.length > 0) {
      banners = shopInfo.banners;
    } else {
      // 默认空轮播
      banners = [];
    }

    return {
      hotPackages: safePackages,
      recommendProducts: formattedProducts,
      stats,
      banners,
      bannerInterval: shopInfo?.bannerInterval || 4000,
    };
  }

  /**
   * 获取套系列表
   */
  async getPackages(query: QueryPackagesDto) {
    const { category, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', isPopular } = query;

    const where: any = {
      // 默认只返回上架且激活的套系
      isOnSale: true,
      status: 'ACTIVE',
    };

    // 热门筛选
    if (isPopular !== undefined) {
      where.isPopular = isPopular;
    }

    // 分类筛选
    if (category) {
      where.categoryId = parseInt(category);
    }

    // 关键词搜索
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分页
    const skip = (page - 1) * limit;

    // 查询数据
    const [items, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          packageCategory: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
      }),
      this.prisma.package.count({ where }),
    ]);

    // 确保数组字段不为 null
    const safeItems = items.map(item => ({
      ...item,
      includes: (item.includes as string[]) || [],
      images: (item.images as string[]) || [],
      tags: (item.tags as string[]) || [],
      detailImages: (item.detailImages as string[]) || [],
    }));

    return {
      packages: safeItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取套系详情
   */
  async getPackageById(id: number) {
    const packageData = await this.prisma.package.findUnique({
      where: { id },
      include: {
        packageProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                salePrice: true,
                images: true,
                specification: true,
                unit: true,
              },
            },
          },
        },
        packageServices: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
                duration: true,
              },
            },
          },
        },
      },
    });

    if (!packageData) {
      throw new NotFoundException(`套系 ID ${id} 不存在`);
    }

    if (!packageData.isOnSale || packageData.status !== 'ACTIVE') {
      throw new BadRequestException('该套系已下架');
    }

    return {
      ...packageData,
      includes: (packageData.includes as string[]) || [],
      images: (packageData.images as string[]) || [],
      tags: (packageData.tags as string[]) || [],
    };
  }

  /**
   * 获取商品列表
   */
  async getProducts(query: QueryProductsDto) {
    const { category, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {
      isOnSale: true,
      status: 'ACTIVE',
    };

    // 关键词搜索
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分类筛选（通过分类 code 查找对应的 categoryId）
    if (category) {
      const cat = await this.prisma.productCategory.findUnique({
        where: { code: category },
        select: { id: true },
      });
      if (cat) {
        where.categoryId = cat.id;
      }
    }

    // 分页
    const skip = (page - 1) * limit;

    // 查询数据
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          productNo: true,
          name: true,
          description: true,
          salePrice: true,
          marketPrice: true,
          images: true,
          specification: true,
          unit: true,
          stockQuantity: true,
          salesVolume: true,
          baseSales: true,
          createdAt: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // 转换字段名以匹配前端期望
    const formattedItems = items.map(item => ({
      ...item,
      price: item.salePrice,
      stock: item.stockQuantity,
      salesCount: (item.baseSales || 0) + (item.salesVolume || 0), // 展示销量 = 基础销量 + 实际销量
      thumbnail: ((item.images as string[])?.[0]) || '',
    }));

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取商品详情
   */
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`商品 ID ${id} 不存在`);
    }

    if (!product.isOnSale || product.status !== 'ACTIVE') {
      throw new BadRequestException('该商品已下架');
    }

    // 转换字段名以匹配前端期望
    return {
      ...product,
      price: product.salePrice, // 前端期望 price 字段
      stock: product.stockQuantity, // 前端期望 stock 字段
      salesCount: (product.baseSales || 0) + (product.salesVolume || 0), // 展示销量 = 基础销量 + 实际销量
      thumbnail: ((product.images as string[])?.[0]) || '', // 第一张图片作为缩略图
    };
  }

  /**
   * 计算 DIY 套系价格
   */
  async calculateDiyPrice(dto: CalculateDiyDto) {
    const { items } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('DIY 套系至少需要包含一个商品');
    }

    // 获取所有商品信息
    const productIds = items.map((item) => parseInt(item.productId));
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isOnSale: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        stockQuantity: true,
        isTrackStock: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('部分商品不存在或已下架');
    }

    // 创建商品 ID 到商品对象的映射
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 计算总价
    let totalPrice = new Decimal(0);
    const itemDetails = items.map((item) => {
      const productId = parseInt(item.productId);
      const product = productMap.get(productId);

      if (!product) {
        throw new BadRequestException(`商品 ${item.productId} 不存在`);
      }

      // 检查库存 (如果追踪库存)
      if (product.isTrackStock && product.stockQuantity < item.quantity) {
        throw new BadRequestException(`商品 ${product.name} 库存不足`);
      }

      const itemTotal = new Decimal(product.salePrice.toString()).mul(item.quantity);
      totalPrice = totalPrice.add(itemTotal);

      return {
        productId: product.id,
        productName: product.name,
        price: product.salePrice.toNumber(),
        quantity: item.quantity,
        subtotal: itemTotal.toNumber(),
        type: item.type,
      };
    });

    // DIY 套系可以有折扣 (例如 95折)
    const discount = 0.95;
    const discountedPrice = totalPrice.mul(discount);
    const discountAmount = totalPrice.sub(discountedPrice);

    return {
      items: itemDetails,
      originalPrice: totalPrice.toNumber(),
      discount: discount,
      discountAmount: discountAmount.toNumber(),
      finalPrice: discountedPrice.toNumber(),
      name: dto.name,
      notes: dto.notes,
    };
  }

  /**
   * 获取可用的预约时间槽
   */
  async getAvailableTimeSlots(date: string) {
    if (!date) {
      throw new BadRequestException('日期参数不能为空');
    }

    // 解析日期
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 查询该日期的所有时间槽
    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'AVAILABLE', // 使用 status 字段而不是 isActive
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // 格式化返回数据
    const slots = timeSlots.map((slot) => {
      const availableCount = slot.capacity - slot.bookedCount;
      
      // 将时间转换为北京时区格式 (HH:mm)
      const formatTimeToBeijing = (time: Date) => {
        // 创建一个新的Date对象，加上8小时时区偏移
        const beijingTime = new Date(time.getTime() + 8 * 60 * 60 * 1000);
        const hours = beijingTime.getUTCHours().toString().padStart(2, '0');
        const minutes = beijingTime.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      return {
        id: slot.id,
        startTime: formatTimeToBeijing(slot.startTime),
        endTime: formatTimeToBeijing(slot.endTime),
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        availableCount,
        available: availableCount > 0,
        isHoliday: slot.isHoliday || false,
        priceMultiplier: slot.priceMultiplier || 1,
      };
    });

    return {
      date,
      slots,
    };
  }

  /**
   * 搜索商品和套系
   */
  async search(keyword: string, type?: 'package' | 'product' | 'all') {
    const searchType = type || 'all';
    const results: any = {
      packages: [],
      products: [],
    };

    if (searchType === 'package' || searchType === 'all') {
      results.packages = await this.prisma.package.findMany({
        where: {
          isOnSale: true,
          status: 'ACTIVE',
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          category: true,
        },
      });
    }

    if (searchType === 'product' || searchType === 'all') {
      results.products = await this.prisma.product.findMany({
        where: {
          isOnSale: true,
          status: 'ACTIVE',
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          productNo: true,
          name: true,
          description: true,
          salePrice: true,
          images: true,
        },
      });
    }

    return {
      keyword,
      results,
      total: results.packages.length + results.products.length,
    };
  }
}
