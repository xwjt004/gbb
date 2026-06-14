import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { QueryWxUserDto } from './dto/query-wx-user.dto';
import { UpdateWxUserDto } from './dto/update-wx-user.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { WxAuthService } from '../wx-auth/wx-auth.service';
import { unlink } from 'fs';
import { join } from 'path';

@Injectable()
export class WxUserService {
  private readonly logger = new Logger(WxUserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wxAuthService: WxAuthService,
  ) {}

  async findAll(query: QueryWxUserDto) {
    const { page = 1, limit = 20, keyword, nickname, phone, openid, memberLevel, churnStatus, status, startDate, endDate, sort = 'created_at_desc' } = query;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword, mode: 'insensitive' } },
        { phone: { contains: keyword } },
        { realName: { contains: keyword, mode: 'insensitive' } },
        { openid: { contains: keyword } },
      ];
    } else {
      if (nickname) where.nickname = { contains: nickname, mode: 'insensitive' };
      if (phone) where.phone = { contains: phone };
      if (openid) where.openid = { contains: openid };
    }

    if (memberLevel) where.memberLevel = memberLevel;
    if (churnStatus) where.churnStatus = churnStatus;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orderMap: Record<string, any> = {
      'created_at_desc': { createdAt: 'desc' },
      'created_at_asc': { createdAt: 'asc' },
      'total_orders_desc': { totalOrders: 'desc' },
      'total_orders_asc': { totalOrders: 'asc' },
      'total_amount_desc': { totalAmount: 'desc' },
      'total_amount_asc': { totalAmount: 'asc' },
      'last_order_desc': { lastOrderAt: 'desc' },
      'last_order_asc': { lastOrderAt: 'asc' },
    };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.wxUser.findMany({
        where,
        orderBy: orderMap[sort] || { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.wxUser.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.wxUser.findUnique({
      where: { id },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            package: { select: { name: true } },
            timeSlot: { select: { date: true, startTime: true, endTime: true } },
          },
        },
        milestones: true,
        _count: { select: { orders: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('客户不存在');
    }

    // 里程碑按类型顺序排列
    const order = this.MILESTONE_TYPE_ORDER;
    user.milestones.sort((a, b) => {
      const oa = order[a.type] ?? 999;
      const ob = order[b.type] ?? 999;
      return oa - ob;
    });

    return { code: 200, message: '查询成功', data: user };
  }

  async update(id: string, dto: UpdateWxUserDto) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('客户不存在');
    }

    // 内容安全检测 — 昵称
    if (dto.nickname) {
      await this.wxAuthService.checkText(dto.nickname);
    }
    // 内容安全检测 — 头像
    if (dto.avatar) {
      await this.wxAuthService.checkImage(dto.avatar);
    }

    // 转换日期字段：支持 YYYY-MM-DD 或完整 ISO 格式
    const data: any = { ...dto };
    if (data.hundredDaysDate) {
      data.hundredDaysDate = new Date(data.hundredDaysDate);
    }
    if (data.firstBirthdayDate) {
      data.firstBirthdayDate = new Date(data.firstBirthdayDate);
    }

    const updated = await this.prisma.wxUser.update({
      where: { id },
      data,
    });

    return { code: 200, message: '更新成功', data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('客户不存在');
    }

    // 检查是否有关联订单（wxUserId 关联 + 手机号匹配）
    const wxOrderCount = await this.prisma.order.count({ where: { wxUserId: id } });
    const phoneOrderCount = existing.phone
      ? await this.prisma.order.count({ where: { customerPhone: existing.phone } })
      : 0;
    if (wxOrderCount > 0 || phoneOrderCount > 0) {
      const total = wxOrderCount + phoneOrderCount;
      throw new BadRequestException(`该客户有 ${total} 笔关联订单，无法删除`);
    }

    await this.prisma.wxUser.delete({ where: { id } });
    return { code: 200, message: '删除成功' };
  }

  // ==================== 成长里程碑 ====================

  // 幸福空间类型排序映射
  private readonly MILESTONE_TYPE_ORDER: Record<string, number> = {
    '出生': 1,
    '百天': 2,
    '周岁': 3,
    '二周岁': 4,
    '三周岁': 5,
    '四周岁': 6,
    '五周岁': 7,
    '幼儿园': 8,
    '小学': 9,
    '初中': 10,
    '高中': 11,
    '大学': 12,
    '硕士': 13,
    '博士': 14,
  };

  async getMilestones(wxUserId: string) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!existing) throw new NotFoundException('客户不存在');

    const items = await this.prisma.babyMilestone.findMany({
      where: { wxUserId },
    });

    // 按预定义类型顺序排序
    const order = this.MILESTONE_TYPE_ORDER;
    items.sort((a, b) => {
      const oa = order[a.type] ?? 999;
      const ob = order[b.type] ?? 999;
      return oa - ob;
    });

    return { code: 200, message: '查询成功', data: items };
  }

  async createMilestone(wxUserId: string, dto: CreateMilestoneDto) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!existing) throw new NotFoundException('客户不存在');

    const milestone = await this.prisma.babyMilestone.create({
      data: {
        wxUserId,
        type: dto.type,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : null,
        height: dto.height,
        weight: dto.weight,
        hobby: dto.hobby,
        photo: dto.photo,
        momBlessing: dto.momBlessing,
        dadBlessing: dto.dadBlessing,
        elderBlessing: dto.elderBlessing,
      },
    });

    return { code: 200, message: '创建成功', data: milestone };
  }

  async updateMilestone(wxUserId: string, milestoneId: string, dto: any) {
    const milestone = await this.prisma.babyMilestone.findFirst({
      where: { id: milestoneId, wxUserId },
    });
    if (!milestone) throw new NotFoundException('记录不存在');

    const data: any = { ...dto };
    if (dto.recordDate) data.recordDate = new Date(dto.recordDate);

    const updated = await this.prisma.babyMilestone.update({
      where: { id: milestoneId },
      data,
    });

    return { code: 200, message: '更新成功', data: updated };
  }

  /** 从 photo 字段中提取所有文件名并删除物理文件 */
  private deleteMilestoneFiles(photo: string | null | undefined) {
    if (!photo) return;
    const uploadPath = process.env.UPLOAD_PATH || './uploads';

    // 解析出所有 URL
    let urls: string[] = [];
    try {
      const parsed = JSON.parse(photo);
      urls = Array.isArray(parsed) ? parsed : [photo];
    } catch {
      urls = [photo];
    }

    for (const url of urls) {
      // URL 格式: /api/v1/files/uuid.jpg 或 https://domain/api/v1/files/uuid.jpg
      const match = url.match(/\/api\/v1\/files\/([^/?]+)/);
      if (!match) continue;
      const filename = match[1];
      const filePath = join(uploadPath, filename);
      unlink(filePath, (err) => {
        if (err) this.logger.warn(`删除文件失败: ${filePath}`, err.message);
      });
    }
  }

  async deleteMilestone(wxUserId: string, milestoneId: string) {
    const milestone = await this.prisma.babyMilestone.findFirst({
      where: { id: milestoneId, wxUserId },
    });
    if (!milestone) throw new NotFoundException('记录不存在');

    // 先删除关联的物理文件
    this.deleteMilestoneFiles(milestone.photo);

    await this.prisma.babyMilestone.delete({ where: { id: milestoneId } });
    return { code: 200, message: '删除成功' };
  }

  // ==================== 幸福空间配额 ====================

  /** 获取用户上传配额和今日播放剩余次数 */
  async getMilestoneQuota(wxUserId: string) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!existing) throw new NotFoundException('客户不存在');

    const now = new Date();
    const year = now.getFullYear();

    // 当年照片上传次数
    const photoCount = await this.prisma.babyMilestoneUploadLog.count({
      where: {
        wxUserId,
        uploadType: 'PHOTO',
        createdAt: { gte: new Date(`${year}-01-01`) },
      },
    });

    // 当年视频上传次数
    const videoCount = await this.prisma.babyMilestoneUploadLog.count({
      where: {
        wxUserId,
        uploadType: 'VIDEO',
        createdAt: { gte: new Date(`${year}-01-01`) },
      },
    });

    // 今日播放次数
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const playCount = await this.prisma.babyMilestonePlayLog.count({
      where: {
        wxUserId,
        playDate: { gte: todayStart, lt: tomorrowStart },
      },
    });

    const MAX_PHOTO = 3;
    const MAX_VIDEO = 3;
    const MAX_PLAY = 5;

    // 查询积分余额
    const user = await this.prisma.wxUser.findUnique({
      where: { id: wxUserId },
      select: { pointsBalance: true },
    });

    return {
      code: 200,
      message: '查询成功',
      data: {
        photoRemaining: Math.max(0, MAX_PHOTO - photoCount),
        videoRemaining: Math.max(0, MAX_VIDEO - videoCount),
        playRemaining: Math.max(0, MAX_PLAY - playCount),
        pointsBalance: user?.pointsBalance ?? 0,
      },
    };
  }

  /** 记录上传次数（同时扣除积分） */
  async recordMilestoneUpload(wxUserId: string, uploadType: 'PHOTO' | 'VIDEO') {
    const existing = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!existing) throw new NotFoundException('客户不存在');

    // 先检查配额
    const year = new Date().getFullYear();
    const count = await this.prisma.babyMilestoneUploadLog.count({
      where: {
        wxUserId,
        uploadType,
        createdAt: { gte: new Date(`${year}-01-01`) },
      },
    });

    const max = uploadType === 'PHOTO' ? 3 : 3;
    if (count >= max) {
      throw new BadRequestException(`每年最多${max}次${uploadType === 'PHOTO' ? '照片' : '视频'}上传`);
    }

    // 扣除积分
    const reason = uploadType === 'PHOTO' ? 'upload_photo' : 'upload_video';
    await this.deductPoints(wxUserId, reason);

    await this.prisma.babyMilestoneUploadLog.create({
      data: { wxUserId, uploadType },
    });

    return { code: 200, message: '记录成功' };
  }

  /** 记录视频播放（同时扣除积分） */
  async recordMilestonePlay(wxUserId: string) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!existing) throw new NotFoundException('客户不存在');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const count = await this.prisma.babyMilestonePlayLog.count({
      where: {
        wxUserId,
        playDate: { gte: todayStart, lt: tomorrowStart },
      },
    });

    if (count >= 5) {
      throw new BadRequestException('今日播放次数已达上限（5次）');
    }

    // 扣除积分
    await this.deductPoints(wxUserId, 'play_video');

    await this.prisma.babyMilestonePlayLog.create({
      data: { wxUserId, playDate: todayStart },
    });

    const remaining = 5 - count - 1;
    return { code: 200, message: '播放记录成功', data: { playRemaining: remaining } };
  }

  // ==================== 积分管理 ====================

  /** 获取积分配置（单例，不存在则创建默认） */
  async getPointsConfig() {
    let config = await this.prisma.pointsConfig.findFirst();
    if (!config) {
      config = await this.prisma.pointsConfig.create({ data: {} });
    }
    return { code: 200, message: '查询成功', data: config };
  }

  /** 更新积分配置 */
  async updatePointsConfig(dto: { photoUploadCost?: number; videoUploadCost?: number; videoPlayCost?: number; purchaseRate?: number }) {
    let config = await this.prisma.pointsConfig.findFirst();
    if (!config) {
      config = await this.prisma.pointsConfig.create({ data: {} });
    }
    const updated = await this.prisma.pointsConfig.update({
      where: { id: config.id },
      data: dto,
    });
    return { code: 200, message: '更新成功', data: updated };
  }

  /** 获取用户积分余额和最近交易 */
  async getUserPoints(wxUserId: string) {
    const user = await this.prisma.wxUser.findUnique({
      where: { id: wxUserId },
      select: { pointsBalance: true },
    });
    if (!user) throw new NotFoundException('客户不存在');

    const transactions = await this.prisma.pointsTransaction.findMany({
      where: { wxUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { code: 200, message: '查询成功', data: { balance: user.pointsBalance, transactions } };
  }

  /** 扣除积分（内部调用，不暴露为独立 API） */
  async deductPoints(wxUserId: string, reason: 'upload_photo' | 'upload_video' | 'play_video') {
    const user = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!user) throw new NotFoundException('客户不存在');

    // 读取积分配置
    const config = await this.prisma.pointsConfig.findFirst();
    if (!config) return; // 无配置则不扣

    const costMap: Record<string, number> = {
      upload_photo: config.photoUploadCost,
      upload_video: config.videoUploadCost,
      play_video: config.videoPlayCost,
    };
    const cost = costMap[reason] || 0;
    if (cost <= 0) return;

    if ((user.pointsBalance ?? 0) < cost) {
      throw new BadRequestException(`积分不足（需要 ${cost} 积分，当前 ${user.pointsBalance ?? 0} 积分）`);
    }

    const newBalance = (user.pointsBalance ?? 0) - cost;
    await this.prisma.$transaction([
      this.prisma.wxUser.update({
        where: { id: wxUserId },
        data: { pointsBalance: newBalance },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          wxUserId,
          type: 'DEBIT',
          amount: cost,
          balance: newBalance,
          reason,
        },
      }),
    ]);

    return { code: 200, message: `已扣除 ${cost} 积分`, data: { balance: newBalance, cost } };
  }

  /** 增加积分（购买商品等场景） */
  async addPoints(wxUserId: string, amount: number, reason: string, remark?: string) {
    const user = await this.prisma.wxUser.findUnique({ where: { id: wxUserId } });
    if (!user) throw new NotFoundException('客户不存在');

    const newBalance = (user.pointsBalance ?? 0) + amount;
    await this.prisma.$transaction([
      this.prisma.wxUser.update({
        where: { id: wxUserId },
        data: { pointsBalance: newBalance },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          wxUserId,
          type: 'CREDIT',
          amount,
          balance: newBalance,
          reason: reason || 'manual',
          remark,
        },
      }),
    ]);

    return { code: 200, message: `已增加 ${amount} 积分`, data: { balance: newBalance, amount } };
  }

  async getOrders(id: string, page = 1, limit = 10) {
    const existing = await this.prisma.wxUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('客户不存在');
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { wxUserId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          package: { select: { name: true } },
          timeSlot: { select: { date: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.order.count({ where: { wxUserId: id } }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  async getStats() {
    const [total, levelDist] = await Promise.all([
      this.prisma.wxUser.count(),
      this.prisma.wxUser.groupBy({
        by: ['memberLevel'],
        _count: { id: true },
      }),
    ]);

    const levelDistribution = levelDist.map(l => ({
      level: l.memberLevel,
      count: l._count.id,
    }));

    return { code: 200, message: '查询成功', data: { total, levelDistribution } };
  }

  // ==================== 积分交易管理（全局） ====================

  /** 分页查询所有积分交易记录（含客户信息） */
  async listPointsTransactions(query: any) {
    const { page = 1, limit = 20, keyword, type, reason, startDate, endDate } = query;

    const where: any = {};
    if (keyword) {
      where.wxUser = {
        OR: [
          { nickname: { contains: keyword, mode: 'insensitive' } },
          { phone: { contains: keyword } },
        ],
      };
    }
    if (type) where.type = type;
    if (reason) where.reason = reason;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.pointsTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          wxUser: {
            select: { id: true, nickname: true, phone: true, avatar: true },
          },
        },
      }),
      this.prisma.pointsTransaction.count({ where }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: {
        items,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  /** 删除积分交易记录（自动反转余额） */
  async deletePointsTransaction(id: string) {
    const transaction = await this.prisma.pointsTransaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('交易记录不存在');

    const reversalAmount = transaction.type === 'CREDIT'
      ? -transaction.amount
      : transaction.amount;

    await this.prisma.$transaction([
      this.prisma.wxUser.update({
        where: { id: transaction.wxUserId },
        data: { pointsBalance: { increment: reversalAmount } },
      }),
      this.prisma.pointsTransaction.delete({ where: { id } }),
    ]);

    return { code: 200, message: '删除成功，积分已返还' };
  }

  /** 编辑积分交易记录备注 */
  async updatePointsTransaction(id: string, dto: { remark?: string }) {
    const existing = await this.prisma.pointsTransaction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('交易记录不存在');

    const updated = await this.prisma.pointsTransaction.update({
      where: { id },
      data: { remark: dto.remark },
    });

    return { code: 200, message: '更新成功', data: updated };
  }
}
