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
  private readonly PBKDF2_ITERATIONS = 10000;
  private readonly PBKDF2_KEY_LENGTH = 64;
  private readonly PBKDF2_DIGEST = 'sha512';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
  ) {}

  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, this.PBKDF2_ITERATIONS, this.PBKDF2_KEY_LENGTH, this.PBKDF2_DIGEST).toString('hex');
    return { hash, salt: s };
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }

  private hashStored(hash: string, salt: string): string {
    return `${salt}:${hash}`;
  }

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto) {
    try {
      // 检查用户名是否已存在
      if (createUserDto.username) {
        const existingUsername = await this.prisma.user.findUnique({
          where: { username: createUserDto.username },
        });
        if (existingUsername) {
          throw new ConflictException('用户名已被使用');
        }
      }

      // 检查手机号是否已存在
      if (createUserDto.phone) {
        const existingUser = await this.prisma.user.findFirst({
          where: { phone: createUserDto.phone },
        });
        if (existingUser) {
          throw new ConflictException('手机号已被注册');
        }
      }

      // 生成唯一 openid
      const openid = `admin-${createUserDto.username || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 处理密码
      let passwordHash: string | undefined;
      if (createUserDto.password) {
        const { hash, salt } = this.hashPassword(createUserDto.password);
        passwordHash = this.hashStored(hash, salt);
      }

      // 处理出生日期
      let birthDate: Date | undefined;
      if (createUserDto.birthDate) {
        birthDate = new Date(createUserDto.birthDate);
      }

      const user = await this.prisma.user.create({
        data: {
          openid,
          username: createUserDto.username,
          nickname: createUserDto.nickname || createUserDto.username,
          realName: createUserDto.realName,
          gender: createUserDto.gender,
          birthDate,
          education: createUserDto.education,
          address: createUserDto.address,
          skills: createUserDto.skills,
          workHistory: createUserDto.workHistory,
          avatar: createUserDto.avatar || '',
          phone: createUserDto.phone || '',
          wechatOfficialId: createUserDto.wechatOfficialId,
          remarks: createUserDto.remarks,
          passwordHash: passwordHash,
          status: createUserDto.status || 'ACTIVE',
          // 多角色关联
          ...(createUserDto.roleIds?.length ? {
            userRoles: {
              create: createUserDto.roleIds.map(roleId => ({ roleId })),
            },
          } : {}),
        },
        include: {
          userRoles: {
            include: { role: true },
          },
        },
      });

      this.logger.log(`用户创建成功: ${user.username || user.openid}`);

      return {
        code: 200,
        message: '用户创建成功',
        data: user,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
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
          username: true,
          nickname: true,
          realName: true,
          gender: true,
          birthDate: true,
          education: true,
          address: true,
          skills: true,
          workHistory: true,
          avatar: true,
          phone: true,
          wechatOfficialId: true,
          remarks: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: { role: { select: { id: true, name: true } } },
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
        userRoles: {
          some: {
            role: {
              name: { contains: '摄影' },
            },
          },
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
          username: true,
          nickname: true,
          realName: true,
          gender: true,
          education: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: { role: { select: { name: true } } },
          },
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
        const roleNames = user.userRoles?.map(ur => ur.role.name).join('、') || '';

        return {
          用户名: user.username || user.openid,
          真实姓名: user.realName || '',
          性别: user.gender === 'MALE' ? '男' : user.gender === 'FEMALE' ? '女' : '',
          学历: user.education || '',
          手机号码: user.phone || '未设置',
          昵称: user.nickname || '未设置',
          管理角色: roleNames,
          状态: user.status,
          注册时间: new Date(user.createdAt).toLocaleString('zh-CN'),
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
              userRoles: {
                include: { role: { select: { id: true, name: true } } },
              },
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

      // 如果更新用户名，检查是否冲突
      if (updateUserDto.username && updateUserDto.username !== existingUser.username) {
        const usernameExists = await this.prisma.user.findUnique({
          where: { username: updateUserDto.username },
        });
        if (usernameExists) {
          throw new ConflictException('用户名已被其他用户使用');
        }
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

      // 分离出需要特殊处理的字段
      const { roleIds, password, birthDate, ...restData } = updateUserDto;

      // 构建更新数据（排除未定义的字段）
      const updateData: any = {};
      for (const [key, value] of Object.entries(restData)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      // 处理密码
      if (password) {
        const { hash, salt } = this.hashPassword(password);
        updateData.passwordHash = this.hashStored(hash, salt);
      }

      // 处理出生日期
      if (birthDate !== undefined) {
        updateData.birthDate = birthDate ? new Date(birthDate) : null;
      }

      // 更新角色（如果提供了 roleIds）
      if (roleIds !== undefined) {
        // 删除现有角色
        await this.prisma.userRole.deleteMany({
          where: { userId },
        });
        // 创建新角色
        if (roleIds.length > 0) {
          await this.prisma.userRole.createMany({
            data: roleIds.map(roleId => ({ userId, roleId })),
          });
        }
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          userRoles: {
            include: { role: { select: { id: true, name: true } } },
          },
        },
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

    // 查找员工用户记录（用 username 字段）
    let adminUser = await this.prisma.user.findUnique({
      where: { username },
      include: {
        userRoles: {
          include: { role: { include: { permissions: true } } },
        },
      },
    });

    // 如果找不到 username，回退到 openid 查找（兼容旧数据）
    if (!adminUser) {
      adminUser = await this.prisma.user.findUnique({
        where: { openid: `admin-${username}` },
        include: {
          userRoles: {
            include: { role: { include: { permissions: true } } },
          },
        },
      });
    }

    // 密码验证：优先校验数据库密码哈希，再回退到环境变量
    let passwordValid = false;

    if (adminUser?.passwordHash) {
      // 数据库中有密码哈希 → 用 PBKDF2 验证
      passwordValid = this.verifyPassword(password, adminUser.passwordHash);
    } else {
      // 数据库中无密码哈希 → 回退到环境变量（首次登录或旧版迁移）
      const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      if (expectedPasswordHash) {
        const [salt, storedHash] = expectedPasswordHash.split(':');
        if (salt && storedHash) {
          const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
          passwordValid = hash === storedHash;
        }
      } else {
        const plainPassword = process.env.ADMIN_PASSWORD || 'admin123';
        passwordValid = password === plainPassword;
      }
    }

    if (!passwordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 如果是从环境变量验证通过的，将密码哈希存入数据库
    if (!adminUser?.passwordHash) {
      if (!adminUser) {
        // 只有超级管理员（通过环境变量首次登录）才能自动创建用户
        if (username !== expectedUsername) {
          throw new UnauthorizedException('用户名或密码错误');
        }
        const newUser = await this.prisma.user.create({
          data: {
            username,
            openid: `admin-${username}-${Date.now()}`,
            nickname: '系统管理员',
            phone: '18888888888',
          },
        });

        // 默认关联超级管理员角色
        await this.prisma.userRole.create({
          data: { userId: newUser.id, roleId: 1 },
        });

        // 重新查询以获取完整的 userRoles 信息
        adminUser = await this.prisma.user.findUnique({
          where: { id: newUser.id },
          include: {
            userRoles: {
              include: { role: { include: { permissions: true } } },
            },
          },
        });

        if (!adminUser) {
          throw new UnauthorizedException('用户创建失败');
        }
      }
      const { hash, salt } = this.hashPassword(password);
      await this.prisma.user.update({
        where: { id: adminUser.id },
        data: { passwordHash: this.hashStored(hash, salt) },
      });
    }

    // adminUser 在密码验证后应为有效用户，加上类型守卫满足 TypeScript
    if (!adminUser) {
      throw new UnauthorizedException('用户不存在');
    }

    // 重新查询完整用户信息（含角色和权限）
    const fullUser = await this.prisma.user.findUnique({
      where: { id: adminUser.id },
      include: {
        userRoles: {
          include: { role: { include: { permissions: true } } },
        },
      },
    });

    // 合并所有角色的权限
    const allPermissions = [...new Set(
      fullUser?.userRoles?.flatMap(ur =>
        ur.role.permissions.map(p => p.permission)
      ) || []
    )];
    const roleNames = fullUser?.userRoles?.map(ur => ur.role.name) || [];
    const roleIds = fullUser?.userRoles?.map(ur => ur.roleId) || [];

    // 生成 JWT token（含多角色和权限信息）
    const token = this.jwtService.sign(
      {
        sub: adminUser.id,
        openid: adminUser.openid,
        username: adminUser.username,
        isAdmin: true,
        roleIds,
        roleNames,
        permissions: allPermissions,
      },
      { expiresIn: '24h' },
    );

    return {
      success: true,
      message: '登录成功',
      data: {
        id: adminUser.id,
        openid: adminUser.openid,
        username: adminUser.username,
        nickname: adminUser.nickname,
        phone: adminUser.phone,
        isAdmin: true,
        roleIds,
        roleNames,
        permissions: allPermissions,
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
