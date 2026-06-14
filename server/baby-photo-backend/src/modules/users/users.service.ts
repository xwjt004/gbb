import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CacheService } from '../../shared/cache/cache.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchDto } from './dto/user-search.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto) {
    try {
      // 检查手机号是否已存在
      if (createUserDto.phone) {
        const existingUser = await this.prisma.user.findFirst({
          where: { phone: createUserDto.phone },
        });

        if (existingUser) {
          throw new ConflictException('手机号已被注册');
        }
      }

      // 如果没有提供openid，生成一个唯一的openid
      let openid = createUserDto.openid;
      if (!openid) {
        openid = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } else {
        // 检查openid是否已存在
        const existingUser = await this.prisma.user.findUnique({
          where: { openid },
        });

        if (existingUser) {
          throw new ConflictException('用户已存在');
        }
      }

      const user = await this.prisma.user.create({
        data: {
          openid,
          nickname: createUserDto.nickname,
          avatar: createUserDto.avatar || '',
          phone: createUserDto.phone || '',
          status: createUserDto.status || 'ACTIVE',
        },
      });

      this.logger.log(`用户创建成功: ${user.openid}`);

      return {
        code: 200,
        message: '用户创建成功',
        data: user,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // 输出更详细的调试信息
  this.logger.error(`创建用户失败: ${(error as any).message}`, (error as any).stack);
  throw new BadRequestException('创建用户失败');
    }
  }

  /**
   * 获取用户列表（支持搜索和分页）
   */
  async findAll(searchDto: UserSearchDto) {
    const {
      page = 1,
      limit = 20,
      phone,
      nickname,
      wechatId,
      fuzzy,
      status,
      isVip,
      startDate,
      endDate,
      sort = 'created_at_desc',
    } = searchDto;

    try {
      const where: any = {};

      // 手机号查询（精确匹配）
      if (phone) {
        where.phone = phone;
      }

      // 昵称查询
      if (nickname) {
        if (fuzzy === 'true') {
          // 模糊搜索：支持昵称和手机号的综合搜索
          where.OR = [
            {
              nickname: {
                contains: nickname,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: nickname,
              },
            },
          ];
        } else {
          // 精确匹配昵称
          where.nickname = nickname;
        }
      }

      // 微信ID查询（数据库中暂无此字段，但保留接口）
      if (wechatId) {
        if (fuzzy === 'true') {
          // 如果将来有微信ID字段，也支持模糊搜索
          if (where.OR) {
            where.OR.push({
              wechatId: {
                contains: wechatId,
                mode: 'insensitive',
              },
            });
          } else {
            where.OR = [
              {
                wechatId: {
                  contains: wechatId,
                  mode: 'insensitive',
                },
              },
            ];
          }
        } else {
          where.wechatId = wechatId;
        }
      }

      // 状态过滤
      if (status) {
        // 前端发送的是小写，需要转换为数据库的大写格式
        const statusMapping: Record<string, string> = {
          'active': 'ACTIVE',
          'inactive': 'INACTIVE',
          'pending': 'PENDING',
          'deleted': 'DELETED'
        };
        const dbStatus = statusMapping[status.toLowerCase()] || status.toUpperCase();
        where.status = dbStatus;
      }

      // 日期范围过滤
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // 注意：模糊搜索逻辑已整合到上面的昵称查询中，避免重复条件

      // 排序配置
      const orderBy = this.buildOrderBy(sort);

      // 先查询所有符合基础条件的用户
      const allUsers = await this.prisma.user.findMany({
        where,
        orderBy,
        select: {
          id: true,
          openid: true,
          nickname: true,
          avatar: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: { id: true, name: true },
          },
          _count: {
            select: { orders: true },
          },
        },
      });

      // VIP状态过滤（在查询后进行筛选）
      let filteredUsers = allUsers;
      if (isVip !== undefined) {
        filteredUsers = allUsers.filter(user => {
          const orderCount = user._count?.orders || 0;
          const userIsVip = orderCount >= 3;
          return userIsVip === isVip;
        });
      }

      // 分页处理
      const total = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice((page - 1) * limit, page * limit);

      return {
        code: 200,
        message: '查询成功',
        data: {
          users: paginatedUsers,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(`查询用户列表失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 获取摄影师列表（按角色过滤）
   */
  async findPhotographers() {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: {
          name: { contains: '摄影' },
        },
      },
      select: {
        id: true,
        nickname: true,
        avatar: true,
      },
    });
    return users;
  }

  /**
   * 导出用户数据
   */
  async exportUsers(searchDto: UserSearchDto) {
    try {
      const { phone, nickname, wechatId, fuzzy, status, isVip, startDate, endDate } = searchDto;
      
      const where: any = {};

      // 手机号查询
      if (phone) {
        where.phone = phone;
      }

      // 昵称查询
      if (nickname) {
        if (fuzzy === 'true') {
          // 模糊搜索：支持昵称和手机号的综合搜索
          where.OR = [
            {
              nickname: {
                contains: nickname,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: nickname,
              },
            },
          ];
        } else {
          // 精确匹配昵称
          where.nickname = nickname;
        }
      }

      // 微信ID查询（数据库中暂无此字段，但保留接口）
      if (wechatId) {
        if (fuzzy === 'true') {
          // 如果将来有微信ID字段，也支持模糊搜索
          if (where.OR) {
            where.OR.push({
              wechatId: {
                contains: wechatId,
                mode: 'insensitive',
              },
            });
          } else {
            where.OR = [
              {
                wechatId: {
                  contains: wechatId,
                  mode: 'insensitive',
                },
              },
            ];
          }
        } else {
          where.wechatId = wechatId;
        }
      }

      // 状态过滤
      if (status) {
        // 前端发送的是小写，需要转换为数据库的大写格式
        const statusMapping: Record<string, string> = {
          'active': 'ACTIVE',
          'inactive': 'INACTIVE',
          'pending': 'PENDING',
          'deleted': 'DELETED'
        };
        const dbStatus = statusMapping[status.toLowerCase()] || status.toUpperCase();
        where.status = dbStatus;
      }

      // 日期范围过滤
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // 注意：模糊搜索逻辑已整合到上面的昵称查询中，避免重复条件

      // 查询所有符合基础条件的用户
      const allUsers = await this.prisma.user.findMany({
        where,
        select: {
          openid: true,
          nickname: true,
          avatar: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // VIP状态过滤（在查询后进行筛选）
      let filteredUsers = allUsers;
      if (isVip !== undefined) {
        filteredUsers = allUsers.filter(user => {
          const orderCount = user._count?.orders || 0;
          const userIsVip = orderCount >= 3;
          return userIsVip === isVip;
        });
      }

      // 转换为导出格式
      const exportData = filteredUsers.map(user => {
        const orderCount = user._count?.orders || 0;
        const isVipUser = orderCount >= 3; // VIP判断逻辑：订单数量>=3
        
        return {
          用户ID: user.openid,
          手机号码: user.phone || '未设置',
          昵称: user.nickname || '未设置',
          微信ID: '', // 数据库中暂无此字段
          状态: user.status,
          VIP状态: isVipUser ? '是' : '否',
          VIP等级: isVipUser ? '金牌会员' : '',
          订单数量: orderCount,
          消费总额: 0, // 暂时设为0，后续可加入订单金额统计
          注册时间: new Date(user.createdAt).toLocaleString('zh-CN'),
          更新时间: new Date(user.updatedAt).toLocaleString('zh-CN'),
          最后登录: '', // 暂时为空，后续可加入登录记录
        };
      });

      return {
        success: true,
        message: '导出成功',
        data: exportData,
      };
    } catch (error) {
      this.logger.error(`导出用户数据失败: ${error.message}`, error.stack);
      throw new BadRequestException('导出失败');
    }
  }

  /**
   * 通过手机号查找用户
   */
  async findByPhone(phone: string) {
    try {
      const cacheKey = this.cacheService.generateKey('user-phone', phone);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const users = await this.prisma.user.findMany({
            where: { phone },
            include: {
              _count: {
                select: {
                  orders: true,
                },
              },
            },
          });

          if (users.length === 0) {
            throw new NotFoundException('未找到匹配的用户');
          }

          return {
            code: 200,
            message: '查询成功',
            data: users,
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `通过手机号查找用户失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 通过昵称查找用户
   */
  async findByNickname(nickname: string, fuzzy: boolean = false) {
    try {
      const cacheKey = this.cacheService.generateKey(
        'user-nickname',
        nickname,
        fuzzy.toString(),
      );

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const where = fuzzy
            ? {
                nickname: {
                  contains: nickname,
                  mode: 'insensitive' as const,
                },
              }
            : { nickname };

          const users = await this.prisma.user.findMany({
            where,
            include: {
              _count: {
                select: {
                  orders: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (users.length === 0) {
            throw new NotFoundException('未找到匹配的用户');
          }

          return {
            code: 200,
            message: '查询成功',
            data: users,
          };
        },
        600, // 缓存10分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`通过昵称查找用户失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 获取用户详情
   */
  async findOne(id: string) {
    try {
      const cacheKey = this.cacheService.getUserCacheKey(id);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const user = await this.prisma.user.findUnique({
            where: { id: parseInt(id, 10) },
            include: {
              orders: {
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                  package: {
                    select: {
                      name: true,
                      price: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  orders: true,
                },
              },
            },
          });

          if (!user) {
            throw new NotFoundException('用户不存在');
          }

          return {
            code: 200,
            message: '查询成功',
            data: user,
          };
        },
        1800, // 缓存30分钟
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`获取用户详情失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 更新用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const userId = parseInt(id, 10);
      
      // 检查用户是否存在
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new NotFoundException('用户不存在');
      }

      // 如果更新手机号，检查是否冲突
      if (updateUserDto.phone && updateUserDto.phone !== existingUser.phone) {
        const phoneExists = await this.prisma.user.findFirst({
          where: {
            phone: updateUserDto.phone,
            id: { not: userId },
          },
        });

        if (phoneExists) {
          throw new ConflictException('手机号已被其他用户使用');
        }
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserDto,
      });

      // 清除缓存
      const cacheKey = this.cacheService.getUserCacheKey(id);
      this.cacheService.del(cacheKey);

      this.logger.log(`用户更新成功: ${id}`);

      return {
        code: 200,
        message: '更新成功',
        data: user,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(`更新用户失败: ${error.message}`, error.stack);
      throw new BadRequestException('更新失败');
    }
  }

  /**
   * 删除用户
   */
  async remove(id: string) {
    try {
      const userId = parseInt(id, 10);
      
      // 检查用户是否存在
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              orders: true,
              outboundsSubmitted: true,
              outboundsApproved: true,
              checksCreated: true,
              checksApproved: true,
              alertsHandled: true,
              transactions: true,
              transfersSubmitted: true,
              transfersApproved: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 检查用户状态：只允许删除禁用状态的用户
      if (user.status !== 'INACTIVE') {
        throw new BadRequestException('只能删除状态为"禁用"的用户，请先禁用该用户');
      }

      // 检查是否有相关订单
      if (user._count?.orders > 0) {
        throw new BadRequestException('用户有相关订单，无法删除');
      }

      // 检查是否有库存管理相关记录
      const relatedRecords = [
        { name: '出库记录(提交)', count: user._count?.outboundsSubmitted },
        { name: '出库记录(审批)', count: user._count?.outboundsApproved },
        { name: '盘点记录(创建)', count: user._count?.checksCreated },
        { name: '盘点记录(审批)', count: user._count?.checksApproved },
        { name: '库存预警处理', count: user._count?.alertsHandled },
        { name: '库存流水', count: user._count?.transactions },
        { name: '调拨记录(提交)', count: user._count?.transfersSubmitted },
        { name: '调拨记录(审批)', count: user._count?.transfersApproved },
      ];

      const hasRelatedRecords = relatedRecords.filter(r => r.count > 0);
      if (hasRelatedRecords.length > 0) {
        const details = hasRelatedRecords.map(r => `${r.name}(${r.count}条)`).join('、');
        throw new BadRequestException(`用户有相关业务记录，无法删除: ${details}`);
      }

      await this.prisma.user.delete({
        where: { id: userId },
      });

      // 清除缓存
      const cacheKey = this.cacheService.getUserCacheKey(id);
      this.cacheService.del(cacheKey);

      this.logger.log(`用户删除成功: ${id}`);

      return {
        code: 200,
        message: '删除成功',
        data: user,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`删除用户失败: ${error.message}`, error.stack);
      throw new BadRequestException(`删除失败: ${error.message}`);
    }
  }

  /**
   * 切换用户启用/禁用状态
   */
  async toggleStatus(id: string) {
    try {
      const userId = parseInt(id, 10);
      
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }
      const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { status: nextStatus },
        select: { id: true, status: true },
      });
      // 清缓存
      const cacheKey = this.cacheService.getUserCacheKey(id);
      this.cacheService.del(cacheKey);
      return { code: 200, message: '状态更新成功', data: updated };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`切换用户状态失败: ${error.message}`, error.stack);
      throw new BadRequestException('状态更新失败');
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(id: string) {
    try {
      const userId = parseInt(id, 10);
      const cacheKey = this.cacheService.generateKey('user-stats', id);

      return this.cacheService.getOrSet(
        cacheKey,
        async () => {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
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

          if (!user) {
            throw new NotFoundException('用户不存在');
          }

          const totalOrders = user.orders.length;
          const totalSpent = user.orders.reduce((sum, order) => {
            const paidAmount = order.payments.reduce(
              (paySum, payment) => paySum + Number(payment.amount),
              0,
            );
            return sum + paidAmount;
          }, 0);

          const completedOrders = user.orders.filter(
            (order) => order.orderStatus === 'COMPLETED',
          ).length;

          const averageOrderValue =
            totalOrders > 0 ? totalSpent / totalOrders : 0;

          const statistics = {
            totalOrders: totalOrders,
            completedOrders: completedOrders,
            totalSpent: totalSpent,
            averageOrderValue: averageOrderValue,
            firstOrderDate:
              totalOrders > 0
                ? user.orders.sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime(),
                  )[0].createdAt
                : null,
            lastOrderDate:
              totalOrders > 0
                ? user.orders.sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  )[0].createdAt
                : null,
            customerLoyaltyLevel: this.calculateLoyaltyLevel(
              totalOrders,
              totalSpent,
            ),
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
      this.logger.error(`获取用户统计信息失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 获取用户订单历史
   */
  async getUserOrders(id: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;

    try {
      // 尝试解析为数字ID,如果失败则作为openid处理
      const numericId = parseInt(id, 10);
      const whereClause = isNaN(numericId)
        ? { user: { openid: id } }
        : { userId: numericId };

      const [orders, total] = await Promise.all([
        this.prisma.order.findMany({
          where: whereClause,
          include: {
            package: true,
            timeSlot: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.order.count({
          where: whereClause,
        }),
      ]);

      return {
        code: 200,
        message: '查询成功',
        data: {
          orders,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(`获取用户订单历史失败: ${error.message}`, error.stack);
      throw new BadRequestException('查询失败');
    }
  }

  /**
   * 用户总体统计
   */
  async getStatistics() {
    try {
      const [total, active, inactive, todayNew] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { status: 'INACTIVE' } }),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0,0,0,0)),
            },
          },
        }),
      ]);

      return {
        code: 200,
        message: '统计成功',
        data: {
          totalUsers: total,
            activeUsers: active,
            inactiveUsers: inactive,
            newUsersToday: todayNew,
            vipUsers: 0,
            growthRate: 0,
        },
      };
    } catch (error) {
      this.logger.error(`获取用户总体统计失败: ${error.message}`, error.stack);
      throw new BadRequestException('统计失败');
    }
  }

  /**
   * 管理员登录
   * 凭证通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD_HASH 配置
   * 密码使用 PBKDF2 哈希存储，避免明文硬编码
   */
  async adminLogin(adminLoginDto: AdminLoginDto) {
    const { username, password } = adminLoginDto;

    const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
    const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    // 用户名验证
    if (username !== expectedUsername) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 密码验证（优先校验哈希，无哈希时回退明文比较用于首次设置）
    let passwordValid = false;
    if (expectedPasswordHash) {
      // PBKDF2 哈希验证
      const [salt, storedHash] = expectedPasswordHash.split(':');
      if (salt && storedHash) {
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        passwordValid = hash === storedHash;
      }
    } else {
      // 未配置 ADMIN_PASSWORD_HASH 时使用明文（仅用于首次初始化）
      const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
      passwordValid = password === plainPassword;
    }

    if (!passwordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 查找或创建管理员用户记录
    let adminUser = await this.prisma.user.findUnique({
      where: { openid: `admin-${username}` },
    });

    if (!adminUser) {
      adminUser = await this.prisma.user.create({
        data: {
          openid: `admin-${username}`,
          nickname: '系统管理员',
          phone: '18888888888',
        },
      });
    }

    // 生成 JWT token
    const token = this.jwtService.sign(
      { sub: adminUser.id, openid: adminUser.openid, isAdmin: true },
      { expiresIn: '24h' },
    );

    return {
      success: true,
      message: '登录成功',
      data: {
        id: adminUser.id,
        openid: adminUser.openid,
        nickname: adminUser.nickname,
        phone: adminUser.phone,
        isAdmin: true,
        token,
      },
    };
  }

  // 私有辅助方法

  /**
   * 构建排序条件
   */
  private buildOrderBy(sort: string) {
    switch (sort) {
      case 'created_at_asc':
        return { createdAt: 'asc' as const };
      case 'created_at_desc':
        return { createdAt: 'desc' as const };
      case 'nickname_asc':
        return { nickname: 'asc' as const };
      case 'nickname_desc':
        return { nickname: 'desc' as const };
      default:
        return { createdAt: 'desc' as const };
    }
  }

  /**
   * 计算用户忠诚度等级
   */
  private calculateLoyaltyLevel(
    totalOrders: number,
    totalSpent: number,
  ): string {
    if (totalOrders >= 10 && totalSpent >= 5000) {
      return 'VIP';
    } else if (totalOrders >= 5 && totalSpent >= 2000) {
      return '金牌客户';
    } else if (totalOrders >= 2 && totalSpent >= 500) {
      return '银牌客户';
    } else if (totalOrders >= 1) {
      return '普通客户';
    } else {
      return '新客户';
    }
  }
}
