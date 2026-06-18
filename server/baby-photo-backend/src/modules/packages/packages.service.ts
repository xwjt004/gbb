import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';
import { utils as XLSXUtils, write as XLSXWrite, WorkBook } from 'xlsx';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PackageSearchDto } from './dto/package-search.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 创建套餐
   */
  async create(createPackageDto: CreatePackageDto) {
    try {
      // 检查套餐名称是否已存在
      const existingPackage = await this.prisma.package.findFirst({
        where: { name: createPackageDto.name },
      });

      if (existingPackage) {
        throw new ConflictException('套餐名称已存在');
      }

      // 处理可选字段的默认值
      // 规范化 status（缺省为 ACTIVE）
      const normalizedStatus: 'ACTIVE' | 'INACTIVE' =
        createPackageDto.status?.toUpperCase() === 'INACTIVE'
          ? 'INACTIVE'
          : 'ACTIVE';

      const { productIds, products, serviceIds, services, ...restDto } = createPackageDto;
      const packageData: any = {
        ...restDto,
        status: normalizedStatus,
        deposit: createPackageDto.deposit ?? 0,
        includes: createPackageDto.includes ?? [],
        isPopular: createPackageDto.isPopular ?? false,
        tags: createPackageDto.tags ?? [],
      };

      const pkg = await this.prisma.package.create({
        data: packageData,
      });

      // 创建商品关联（支持新版 products 带数量，兼容旧版 productIds）
      const productItems = products || productIds?.map(id => ({ productId: id, quantity: 1 })) || [];
      if (productItems.length > 0) {
        await this.prisma.packageProduct.createMany({
          data: productItems.map(item => ({
            packageId: pkg.id,
            productId: item.productId,
            quantity: item.quantity ?? 1,
          })),
        });
      }

      // 创建服务项目关联（支持新建和已有服务，兼容旧版 serviceIds）
      const rawServiceItems: { serviceId?: number; name?: string; quantity?: number; image?: string }[] =
        services || serviceIds?.map(id => ({ serviceId: id, quantity: 1 })) || [];

      // 区分已有服务和待新建服务
      const resolvedLinks: { serviceId: number; quantity: number }[] = [];
      const toCreate: { name: string; quantity: number; image?: string }[] = [];

      for (const item of rawServiceItems) {
        if (item.serviceId) {
          resolvedLinks.push({ serviceId: item.serviceId, quantity: item.quantity ?? 1 });
        } else if (item.name) {
          toCreate.push({ name: item.name, quantity: item.quantity ?? 1, image: item.image });
        }
      }

      // 批量新建服务项目
      const createdServices = await Promise.all(
        toCreate.map((item, idx) =>
          this.prisma.serviceItem.create({
            data: {
              serviceNo: `AUTO-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
              name: item.name,
              category: 'CUSTOM',
              isActive: true,
              basePrice: 0,
              images: item.image ? [item.image] : [],
            },
          })
        )
      );
      createdServices.forEach((s, i) => resolvedLinks.push({ serviceId: s.id, quantity: toCreate[i].quantity }));

      if (resolvedLinks.length > 0) {
        await this.prisma.packageService.createMany({
          data: resolvedLinks.map(item => ({
            packageId: pkg.id,
            serviceId: item.serviceId,
            quantity: item.quantity,
          })),
        });
      }

      // 清除相关缓存
      await this.clearPackageListCache();

      this.logger.log(`套餐创建成功: ${pkg.id}`);

      return {
        code: 200,
        message: '套餐创建成功',
        data: pkg,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`创建套餐失败: ${error.message}`, error.stack);
      throw new BadRequestException('创建套餐失败');
    }
  }

  /**
   * 获取套餐列表（支持搜索和分页）
   */
  async findAll(searchDto: PackageSearchDto) {
    const {
      page = 1,
      limit = 20,
      name,
      minPrice,
      maxPrice,
      sort = 'created_at_desc',
      status,
      isPopular,
      categoryId,
    } = searchDto;

    try {
      const where: any = {};

      // 名称查询
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }

      // 价格范围查询
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      // 排序配置
      const orderBy = this.buildOrderBy(sort);

      // 状态过滤
      if (status) {
        where.status = status;
      }

      // 分类过滤（文本字段）
      if (searchDto.category) {
        where.category = searchDto.category;
      }

      // 分类ID过滤（新增）
      if (categoryId) {
        where.categoryId = categoryId;
      }

      // isPopular 过滤（直接使用数据库字段）
      if (isPopular === 'true') {
        where.isPopular = true;
      } else if (isPopular === 'false') {
        where.isPopular = false;
      }

      // 标签过滤
      if (searchDto.tags) {
        const tagList = searchDto.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tagList.length > 0) {
          where.tags = {
            hasSome: tagList,
          };
        }
      }

      const [packages, total] = await Promise.all([
        this.prisma.package.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: { select: { orders: true } },
            packageCategory: {
              select: {
                id: true,
                name: true,
                color: true,
                icon: true,
              },
            },
            packageProducts: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    specification: true,
                    unit: true,
                    salePrice: true,
                    images: true,
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
                    category: true,
                    basePrice: true,
                    images: true,
                  },
                },
              },
            },
          },
        }) as any,
        this.prisma.package.count({ where }),
      ]);

      const formattedPackages = packages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: Number(pkg.price),
        deposit: Number(pkg.deposit),
        duration_minutes: pkg.durationMinutes,
        includes: pkg.includes,
        images: pkg.images || [],
        category: pkg.category || '',
        categoryId: pkg.categoryId,
        packageCategory: pkg.packageCategory,
        tags: pkg.tags || [],
        status: pkg.status,
        is_popular: pkg.isPopular,
        order_count: pkg._count?.orders,
        created_at: pkg.createdAt,
        packageProducts: pkg.packageProducts || [],
        packageServices: pkg.packageServices || [],
        groupMinCount: pkg.groupMinCount || null,
        groupPrice: pkg.groupPrice ? Number(pkg.groupPrice) : null,
        groupBuyDescription: pkg.groupBuyDescription || '',
        posterTitle: pkg.posterTitle || '',
        posterContent: pkg.posterContent || '',
        posterBackground: pkg.posterBackground || '',
        posterImages: pkg.posterImages || [],
      }));      return {
        code: 200,
        message: '查询成功',
        data: {
          packages: formattedPackages,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询套餐列表失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 通过价格区间查找套餐
   */
  async findByPriceRange(
    minPrice?: number,
    maxPrice?: number,
    sort: string = 'price_asc',
  ) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'package-price-range',
        (minPrice || 0).toString(),
        (maxPrice || 'max').toString(),
        sort,
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const where: any = {};

          if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = {};
            if (minPrice !== undefined) where.price.gte = minPrice;
            if (maxPrice !== undefined) where.price.lte = maxPrice;
          }

          const orderBy = this.buildOrderBy(sort);

          const packages: any[] = await this.prisma.package.findMany({
            where,
            orderBy,
            include: { _count: { select: { orders: true } } },
          });

          if (packages.length === 0) {
            throw new NotFoundException('未找到符合条件的套餐');
          }

          const formattedPackages = packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price),
            deposit: Number(pkg.deposit),
            duration_minutes: pkg.durationMinutes,
            includes: pkg.includes,
            category: pkg.category || '',
            tags: pkg.tags || [],
            is_popular: pkg.isPopular,
            status: pkg.status,
            order_count: pkg._count?.orders,
            created_at: pkg.createdAt,
          }));

          return {
            code: 200,
            message: '查找成功',
            data: {
              packages: formattedPackages,
              search_criteria: {
                min_price: minPrice,
                max_price: maxPrice,
                sort: sort,
              },
            },
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `通过价格区间查找套餐失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('查找失败');
    }
  }

  /**
   * 通过名称查找套餐
   */
  async findByName(name: string, fuzzy: boolean = false) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'package-name',
        name,
        fuzzy.toString(),
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const where = fuzzy
            ? {
                name: {
                  contains: name,
                  mode: 'insensitive' as const,
                },
              }
            : { name };

          const packages: any[] = await this.prisma.package.findMany({
            where,
            include: { _count: { select: { orders: true } } },
            orderBy: { createdAt: 'desc' },
          });

          if (packages.length === 0) {
            throw new NotFoundException('未找到匹配的套餐');
          }

          const formattedPackages = packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price),
            deposit: Number(pkg.deposit),
            duration_minutes: pkg.durationMinutes,
            includes: pkg.includes,
            category: pkg.category || '',
            tags: pkg.tags || [],
            is_popular: pkg.isPopular,
            status: pkg.status,
            order_count: pkg._count?.orders,
            created_at: pkg.createdAt,
          }));

          return {
            code: 200,
            message: '查找成功',
            data: formattedPackages,
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`通过名称查找套餐失败: ${error.message}`, error.stack);
      throw new BadRequestException('查找失败');
    }
  }

  /**
   * 获取热门套餐
   */
  async getPopularPackages(limit: number = 10) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'popular-packages',
        limit.toString(),
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const packages: any[] = await this.prisma.package.findMany({
            include: { _count: { select: { orders: true } } },
            orderBy: { orders: { _count: 'desc' } },
            take: limit,
          });

          const formattedPackages = packages.map((pkg) => ({
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price),
            deposit: Number(pkg.deposit),
            duration_minutes: pkg.durationMinutes,
            includes: pkg.includes,
            category: pkg.category || '',
            tags: pkg.tags || [],
            is_popular: pkg.isPopular,
            order_count: pkg._count?.orders,
            popularity_score: this.calculatePopularityScore(pkg._count?.orders),
            status: pkg.status,
            created_at: pkg.createdAt,
          }));

          return {
            code: 200,
            message: '获取成功',
            data: formattedPackages,
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      this.logger.error(`获取热门套餐失败: ${error.message}`, error.stack);
      throw new BadRequestException('获取失败');
    }
  }

  /**
   * 获取套餐详情
   */
  async findOne(id: number) {
    try {
      const cacheKey = this.cacheService.getPackageCacheKey(id);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const pkg: any = await this.prisma.package.findUnique({
            where: { id },
            include: {
              orders: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                  orderNo: true,
                  totalAmount: true,
                  orderStatus: true,
                  createdAt: true,
                  user: { select: { nickname: true } },
                },
              },
              _count: { select: { orders: true } },
              packageCategory: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  icon: true,
                },
              },
              packageProducts: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      productNo: true,
                      specification: true,
                      unit: true,
                      salePrice: true,
                      images: true,
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
                      category: true,
                      basePrice: true,
                      images: true,
                    },
                  },
                },
              },
            },
          });

          if (!pkg) {
            throw new NotFoundException('套餐不存在');
          }

          const formattedPackage = {
            id: pkg.id,

            name: pkg.name,
            description: pkg.description,
            price: Number(pkg.price),

            deposit: Number(pkg.deposit),
            duration_minutes: pkg.durationMinutes,
            includes: pkg.includes,
            images: pkg.images || [],
            category: pkg.category || '',
            categoryId: pkg.categoryId,
            packageCategory: pkg.packageCategory,
            tags: pkg.tags || [],
            is_popular: pkg.isPopular,
            status: pkg.status,
            order_count: pkg._count?.orders,
            recent_orders: pkg.orders.map((order: any) => ({
              order_no: order.orderNo,
              total_amount: Number(order.totalAmount),
              order_status: order.orderStatus,
              customer_name: order.user.nickname,
              created_at: order.createdAt,
            })),
            packageProducts: pkg.packageProducts || [],
            packageServices: pkg.packageServices || [],
            created_at: pkg.createdAt,

            // 促销设置
            promotionPrice: pkg.promotionPrice ? Number(pkg.promotionPrice) : null,
            promotionStart: pkg.promotionStart || null,
            promotionEnd: pkg.promotionEnd || null,

            // 团购设置
            groupMinCount: pkg.groupMinCount,
            groupPrice: pkg.groupPrice ? Number(pkg.groupPrice) : null,
            groupBuyDescription: pkg.groupBuyDescription || '',
            posterTitle: pkg.posterTitle || '',
            posterContent: pkg.posterContent || '',
            posterBackground: pkg.posterBackground || '',
            posterImages: pkg.posterImages || [],
          };

          return {
            code: 200,
            message: '查询成功',
            data: formattedPackage,
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`获取套餐详情失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 更新套餐
   */
  async update(id: number, updatePackageDto: UpdatePackageDto) {
    try {
      // 检查套餐是否存在
      const existingPackage = await this.prisma.package.findUnique({
        where: { id },
      });

      if (!existingPackage) {
        throw new NotFoundException('套餐不存在');
      }

      // 如果更新名称，检查是否冲突
      if (
        updatePackageDto.name &&
        updatePackageDto.name !== existingPackage.name
      ) {
        const nameExists = await this.prisma.package.findFirst({
          where: {
            name: updatePackageDto.name,
            id: { not: id },
          },
        });

        if (nameExists) {
          throw new ConflictException('套餐名称已被使用');
        }
      }

      const { productIds, products, serviceIds, services, ...updateRest } = updatePackageDto;
      const updateData: any = { ...updateRest };
      if (updatePackageDto.status) {
        updateData.status =
          updatePackageDto.status.toUpperCase() === 'INACTIVE'
            ? 'INACTIVE'
            : 'ACTIVE';
      }

      const pkg = await this.prisma.package.update({
        where: { id },
        data: updateData,
      });

      // 同步商品关联（支持新版 products 带数量，兼容旧版 productIds）
      if (products !== undefined || productIds !== undefined) {
        const productItems = products || productIds?.map(id => ({ productId: id, quantity: 1 })) || [];
        await this.prisma.packageProduct.deleteMany({
          where: { packageId: id },
        });
        if (productItems.length > 0) {
          await this.prisma.packageProduct.createMany({
            data: productItems.map(item => ({
              packageId: id,
              productId: item.productId,
              quantity: item.quantity ?? 1,
            })),
          });
        }
      }

      // 同步服务项目关联（支持新建和已有服务，兼容旧版 serviceIds）
      if (services !== undefined || serviceIds !== undefined) {
        const rawServiceItems: { serviceId?: number; name?: string; quantity?: number; image?: string }[] =
          services || serviceIds?.map(id => ({ serviceId: id, quantity: 1 })) || [];

        // 区分已有服务和待新建服务
        const resolvedLinks: { serviceId: number; quantity: number }[] = [];
        const toCreate: { name: string; quantity: number; image?: string }[] = [];

        for (const item of rawServiceItems) {
          if (item.serviceId) {
            resolvedLinks.push({ serviceId: item.serviceId, quantity: item.quantity ?? 1 });
          } else if (item.name) {
            toCreate.push({ name: item.name, quantity: item.quantity ?? 1, image: item.image });
          }
        }

        // 批量新建服务项目
        const createdServices = await Promise.all(
          toCreate.map((item, idx) =>
            this.prisma.serviceItem.create({
              data: {
                serviceNo: `AUTO-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
                name: item.name,
                category: 'CUSTOM',
                isActive: true,
                basePrice: 0,
                images: item.image ? [item.image] : [],
              },
            })
          )
        );
        createdServices.forEach((s, i) => resolvedLinks.push({ serviceId: s.id, quantity: toCreate[i].quantity }));

        await this.prisma.packageService.deleteMany({
          where: { packageId: id },
        });
        if (resolvedLinks.length > 0) {
          await this.prisma.packageService.createMany({
            data: resolvedLinks.map(item => ({
              packageId: id,
              serviceId: item.serviceId,
              quantity: item.quantity,
            })),
          });
        }
      }

      // 清除缓存
      const cacheKey = this.cacheService.getPackageCacheKey(id);
      await this.cacheService.del(cacheKey);
      await this.clearPackageListCache();

      this.logger.log(`套餐更新成功: ${id}`);

      return {
        code: 200,
        message: '更新成功',
        data: pkg,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`更新套餐失败: ${error.message}`, error.stack);
      throw new BadRequestException('更新失败');
    }
  }

  /**
   * 删除套餐
   */
  async remove(id: number) {
    try {
      // 检查套餐是否存在
      const pkg = await this.prisma.package.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!pkg) {
        throw new NotFoundException('套餐不存在');
      }

      // 检查是否有相关订单
      if (pkg._count?.orders > 0) {
        throw new BadRequestException('套餐有相关订单，无法删除');
      }

      await this.prisma.package.delete({
        where: { id },
      });

      // 清除缓存
      const cacheKey = this.cacheService.getPackageCacheKey(id);
      await this.cacheService.del(cacheKey);
      await this.clearPackageListCache();

      this.logger.log(`套餐删除成功: ${id}`);

      return {
        code: 200,
        message: '删除成功',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`删除套餐失败: ${error.message}`, error.stack);
      throw new BadRequestException('删除失败');
    }
  }


  /**
   * 获取套餐统计信息
   */
  async getPackageStatistics(id: number) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'package-stats',
        id.toString(),
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const pkg = await this.prisma.package.findUnique({
            where: { id },
            include: {
              orders: {
                include: {
                  payments: {
                    where: { status: 'FULLY_PAID' },
                  },
                },
              },
            },
          });

          if (!pkg) {
            throw new NotFoundException('套餐不存在');
          }

          const totalOrders = pkg.orders.length;
          const completedOrders = pkg.orders.filter(
            (order) => order.orderStatus === 'COMPLETED',
          ).length;

          const totalRevenue = pkg.orders.reduce((sum, order) => {
            const paidAmount = order.payments.reduce(
              (paySum, payment) => paySum + Number(payment.amount),
              0,
            );
            return sum + paidAmount;
          }, 0);

          const averageOrderValue =
            totalOrders > 0 ? totalRevenue / totalOrders : 0;

          const statistics = {
            package_info: {
              id: pkg.id,
              name: pkg.name,
              price: Number(pkg.price),
            },
            order_statistics: {
              total_orders: totalOrders,
              completed_orders: completedOrders,
              completion_rate:
                totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
            },
            revenue_statistics: {
              total_revenue: totalRevenue,
              average_order_value: averageOrderValue,
            },
            popularity_metrics: {
              popularity_score: this.calculatePopularityScore(totalOrders),
              market_share: await this.calculateMarketShare(id, totalOrders),
            },
          };

          return {
            code: 200,
            message: '查询成功',
            data: statistics,
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`获取套餐统计信息失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  // 私有辅助方法

  private buildOrderBy(sort: string) {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' as const };
      case 'price_desc':
        return { price: 'desc' as const };
      case 'name_asc':
        return { name: 'asc' as const };
      case 'name_desc':
        return { name: 'desc' as const };
      case 'created_at_asc':
        return { createdAt: 'asc' as const };
      case 'created_at_desc':
        return { createdAt: 'desc' as const };
      case 'popularity':
        return { orders: { _count: 'desc' as const } };
      default:
        return { createdAt: 'desc' as const };
    }
  }

  private calculatePopularityScore(orderCount: number): number {
    // 简单的热度计算公式
    return Math.min(100, orderCount * 10);
  }

  private async calculateMarketShare(
    packageId: number,
    orderCount: number,
  ): Promise<number> {
    const totalOrders = await this.prisma.order.count();
    return totalOrders > 0 ? (orderCount / totalOrders) * 100 : 0;
  }

  private async clearPackageListCache() {
    // 清除套餐列表相关的缓存
    const cacheKeys = ['popular-packages', 'package-price-range'];

    for (const keyPrefix of cacheKeys) {
      await this.cacheService.deleteByPattern(`${keyPrefix}:*`);
    }
  }

  /**
   * 获取套餐关联推荐（交叉销售）
   */
  async getRecommendations(packageId: number, limit: number = 4) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('套餐不存在');

    // 1. 手动配置的交叉销售
    const manual = await this.prisma.crossSellPackage.findMany({
      where: { sourcePkgId: packageId },
      include: {
        recommended: true,
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    const manualIds = new Set(manual.map((m) => m.recommendedPkgId));
    const results: any[] = manual.map((m) => ({
      id: m.recommended.id,
      name: m.recommended.name,
      price: Number(m.recommended.price),
      image: m.recommended.images?.[0] || null,
      type: 'manual',
      sortOrder: m.sortOrder,
    }));

    // 2. 如果手动配置不够，使用订单亲和度分析
    if (results.length < limit) {
      const orderIds = await this.prisma.order.findMany({
        where: { packageId },
        select: { id: true },
        take: 50,
      });

      if (orderIds.length > 0) {
        const affinityPackages = await this.prisma.orderItem.groupBy({
          by: ['packageId'],
          where: {
            orderId: { in: orderIds.map((o) => o.id) },
            packageId: { not: null, notIn: [packageId, ...manualIds] },
          },
          _count: { packageId: true },
          orderBy: { _count: { packageId: 'desc' } },
          take: limit - results.length,
        });

        const affinityPkgIds = affinityPackages
          .map((a) => a.packageId)
          .filter((id): id is number => id !== null);

        if (affinityPkgIds.length > 0) {
          const pkgs = await this.prisma.package.findMany({
            where: { id: { in: affinityPkgIds } },
          });
          const pkgMap = new Map(pkgs.map((p) => [p.id, p]));

          for (const ap of affinityPackages) {
            if (!ap.packageId) continue;
            const p = pkgMap.get(ap.packageId);
            if (p) {
              results.push({
                id: p.id,
                name: p.name,
                price: Number(p.price),
                image: p.images?.[0] || null,
                type: 'affinity',
                orderCount: ap._count.packageId,
              });
            }
          }
        }
      }
    }

    return { code: 200, message: '查询成功', data: results.slice(0, limit) };
  }

  /**
   * 计算套餐最终价格（季节性 → 促销 → 基础价）
   */
  async calculatePrice(packageId: number, date: Date) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
    });
    if (!pkg) throw new NotFoundException('套餐不存在');

    const basePrice = Number(pkg.price);
    const dateStr = date.toISOString().slice(0, 10);

    // 1. 检查季节性价格
    const seasonal = await this.prisma.seasonalPrice.findFirst({
      where: {
        packageId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      orderBy: { startDate: 'desc' },
    });
    if (seasonal) {
      return {
        basePrice,
        finalPrice: Number(seasonal.price),
        appliedRule: { type: 'seasonal', label: seasonal.label || '季节性价格', id: seasonal.id },
      };
    }

    // 2. 检查促销价格
    if (pkg.promotionPrice && pkg.promotionStart && pkg.promotionEnd) {
      if (date >= pkg.promotionStart && date <= pkg.promotionEnd) {
        return {
          basePrice,
          finalPrice: Number(pkg.promotionPrice),
          appliedRule: { type: 'promotion', label: '限时促销' },
        };
      }
    }

    // 3. 使用基础价格
    return {
      basePrice,
      finalPrice: basePrice,
      appliedRule: { type: 'base', label: '标准价格' },
    };
  }

  /**
   * 批量更新状态
   */
  async bulkUpdateStatus(dto: BulkUpdateStatusDto) {
    const { ids, status } = dto;
    try {
      const normalized: 'ACTIVE' | 'INACTIVE' =
        status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

      const result = await this.prisma.package.updateMany({
        where: { id: { in: ids } },
        data: { status: normalized },
      });

      // 清缓存
      await this.clearPackageListCache();
      for (const id of ids) {
        const cacheKey = this.cacheService.getPackageCacheKey(id);
        await this.cacheService.del(cacheKey);
      }
      return {
        code: 200,
        message: '批量更新成功',
        data: { count: result.count, status: normalized },
      };
    } catch (e: any) {
      this.logger.error(`批量更新状态失败: ${e.message}`, e.stack);
      throw new BadRequestException('批量更新失败');
    }
  }

  /**
   * 获取导出数据
   */
  private async getExportData(searchDto: PackageSearchDto) {
    // 获取所有符合条件的套餐数据（不分页）
    const result = await this.findAll({ ...searchDto, page: 1, limit: 10000 });
    const packages = result.data.packages;
    
    // 转换为导出格式
    return packages.map((pkg: any) => ({
      ID: pkg.id,
      '套餐名称': pkg.name,
      '套餐描述': pkg.description,
      '价格(元)': pkg.price,
      '押金(元)': pkg.deposit || 0,
      '服务时长(分钟)': pkg.duration_minutes,
      '分类': pkg.category || '',
      '标签': Array.isArray(pkg.tags) ? pkg.tags.join(', ') : '',
      '是否热门': pkg.is_popular ? '是' : '否',
      '状态': pkg.status === 'ACTIVE' ? '已上架' : '已下架',
      '预订次数': pkg.order_count || 0,
      '服务包含': Array.isArray(pkg.includes) ? pkg.includes.join(', ') : '',
      '创建时间': new Date(pkg.created_at).toLocaleString('zh-CN'),
    }));
  }

  /**
   * 导出到Excel
   */
  async exportToExcel(searchDto: PackageSearchDto, res: Response) {
    try {
      this.logger.log('开始导出套餐数据到Excel');
      
      const data = await this.getExportData(searchDto);
      
      // 创建工作簿（即使没有数据也返回带表头的空文件）
      const workbook: WorkBook = XLSXUtils.book_new();
      const worksheet = data.length === 0
        ? XLSXUtils.json_to_sheet([])
        : XLSXUtils.json_to_sheet(data);
      
      // 设置列宽
      const wscols = [
        { wch: 8 },   // ID
        { wch: 20 },  // 套餐名称
        { wch: 30 },  // 套餐描述
        { wch: 12 },  // 价格
        { wch: 12 },  // 押金
        { wch: 15 },  // 服务时长
        { wch: 12 },  // 分类
        { wch: 20 },  // 标签
        { wch: 10 },  // 是否热门
        { wch: 10 },  // 状态
        { wch: 12 },  // 预订次数
        { wch: 30 },  // 服务包含
        { wch: 20 },  // 创建时间
      ];
      worksheet['!cols'] = wscols;
      
      XLSXUtils.book_append_sheet(workbook, worksheet, '套餐数据');
      
      // 生成文件名
      const now = new Date();
      const filename = `套餐数据_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      // 生成并发送文件
      const buffer = XLSXWrite(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
      
      this.logger.log(`Excel导出成功，文件名: ${filename}`);
    } catch (error) {
      this.logger.error('Excel导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }

  /**
   * 导出到CSV
   */
  async exportToCSV(searchDto: PackageSearchDto, res: Response) {
    try {
      this.logger.log('开始导出套餐数据到CSV');
      
      const data = await this.getExportData(searchDto);
      
      // 生成CSV内容（即使没有数据也返回带表头的空文件）
      const headers = ['ID', '套餐名称', '套餐描述', '价格(元)', '押金(元)', '服务时长(分钟)', '分类', '标签', '是否热门', '状态', '预订次数', '服务包含', '创建时间'];
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => 
          headers.map(header => {
            const value = row[header] || '';
            // 处理包含逗号、换行符的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // 生成文件名
      const now = new Date();
      const filename = `套餐数据_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.csv`;
      
      // 设置响应头
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      // 添加BOM以支持中文
      res.send('\uFEFF' + csvContent);
      
      this.logger.log(`CSV导出成功，文件名: ${filename}`);
    } catch (error) {
      this.logger.error('CSV导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }

  /**
   * 导出到JSON
   */
  async exportToJSON(searchDto: PackageSearchDto) {
    try {
      this.logger.log('开始导出套餐数据到JSON');
      
      const data = await this.getExportData(searchDto);

      return {
        code: 200,
        message: '导出成功',
        data: {
          exportTime: new Date().toISOString(),
          totalCount: data.length,
          packages: data,
        },
      };
    } catch (error) {
      this.logger.error('JSON导出失败', error);
      throw new BadRequestException('导出失败');
    }
  }
}
