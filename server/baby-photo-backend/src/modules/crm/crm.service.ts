import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateMemberLevelDto } from './dto/create-member-level.dto';
import { UpdateMemberLevelDto } from './dto/update-member-level.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { QueryComplaintDto } from './dto/query-complaint.dto';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 会员等级 ====================

  async seedDefaultLevels() {
    const count = await this.prisma.memberLevel.count();
    if (count > 0) return;

    const defaults = [
      { level: 1, name: '普通会员', minGrowth: 0, maxGrowth: 99, benefits: ['基础服务'], icon: 'star' },
      { level: 2, name: '白银会员', minGrowth: 100, maxGrowth: 499, benefits: ['基础服务', '生日礼包'], icon: 'silver' },
      { level: 3, name: '黄金会员', minGrowth: 500, maxGrowth: 1999, benefits: ['基础服务', '生日礼包', '优先预约'], icon: 'gold' },
      { level: 4, name: '铂金会员', minGrowth: 2000, maxGrowth: 4999, benefits: ['基础服务', '生日礼包', '优先预约', '专属客服'], icon: 'platinum' },
      { level: 5, name: '钻石会员', minGrowth: 5000, maxGrowth: 999999, benefits: ['全部权益', '年度写真免费', 'VIP通道'], icon: 'diamond' },
    ];

    for (const lv of defaults) {
      await this.prisma.memberLevel.create({
        data: { ...lv, benefits: lv.benefits },
      });
    }
    this.logger.log('默认会员等级已初始化');
  }

  async getMemberLevels() {
    const levels = await this.prisma.memberLevel.findMany({
      orderBy: { level: 'asc' },
    });
    return {
      code: 200,
      message: '查询成功',
      data: levels,
    };
  }

  async createMemberLevel(dto: CreateMemberLevelDto) {
    const exists = await this.prisma.memberLevel.findUnique({ where: { level: dto.level } });
    if (exists) {
      return { code: 400, message: '该等级已存在', data: null };
    }
    const level = await this.prisma.memberLevel.create({
      data: { ...dto, benefits: dto.benefits as any },
    });
    return { code: 200, message: '等级创建成功', data: level };
  }

  async updateMemberLevel(id: number, dto: UpdateMemberLevelDto) {
    const existing = await this.prisma.memberLevel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('会员等级不存在');

    const level = await this.prisma.memberLevel.update({ where: { id }, data: dto as any });
    return { code: 200, message: '等级更新成功', data: level };
  }

  async deleteMemberLevel(id: number) {
    const existing = await this.prisma.memberLevel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('会员等级不存在');

    await this.prisma.memberLevel.delete({ where: { id } });
    return { code: 200, message: '等级删除成功', data: null };
  }

  async getGrowthRules() {
    return {
      code: 200,
      message: '查询成功',
      data: {
        orderAmountRate: 1,   // 每1元 = 1成长值
        orderCompleteBonus: 10, // 完成订单额外赠送
        dailyCheckinBonus: 2,  // 每日签到
        maxDailyGrowth: 100,   // 每日上限
      },
    };
  }

  private calculateLevel(growthPoints: number) {
    if (growthPoints >= 5000) return 5;
    if (growthPoints >= 2000) return 4;
    if (growthPoints >= 500) return 3;
    if (growthPoints >= 100) return 2;
    return 1;
  }

  // ==================== 自动升级 ====================

  async autoUpgradeAll() {
    const wxUsers = await this.prisma.wxUser.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, growthPoints: true, memberLevel: true, totalOrders: true, totalAmount: true },
    });

    let upgraded = 0;
    for (const user of wxUsers) {
      const newLevel = this.calculateLevel(user.growthPoints);
      const levelName = await this.getLevelName(newLevel);
      if (user.memberLevel !== levelName) {
        await this.prisma.wxUser.update({
          where: { id: user.id },
          data: { memberLevel: levelName },
        });
        upgraded++;
      }
    }

    this.logger.log(`会员等级自动升级完成: ${upgraded}/${wxUsers.length} 人升级`);
    return { code: 200, message: `升级完成: ${upgraded} 人`, data: { total: wxUsers.length, upgraded } };
  }

  private async getLevelName(levelNum: number): Promise<string> {
    const lv = await this.prisma.memberLevel.findUnique({ where: { level: levelNum } });
    return lv?.name || '普通会员';
  }

  // ==================== 客户画像 ====================

  async getCustomerProfile(wxUserId: string) {
    const wxUser = await this.prisma.wxUser.findUnique({
      where: { id: wxUserId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { items: true, package: true },
        },
        linkedUser: true,
        coupons: { include: { coupon: true } },
      },
    });

    if (!wxUser) throw new NotFoundException('客户不存在');

    // 获取会员等级信息
    const levels = await this.prisma.memberLevel.findMany({ orderBy: { level: 'asc' } });
    const currentLevel = levels.find(l => l.name === wxUser.memberLevel) || levels[0];
    const nextLevel = levels.find(l => l.level === (currentLevel?.level || 0) + 1);
    const growthProgress = nextLevel
      ? { current: wxUser.growthPoints, min: nextLevel.minGrowth, max: nextLevel.maxGrowth, remaining: Math.max(0, nextLevel.minGrowth - wxUser.growthPoints) }
      : { current: wxUser.growthPoints, min: currentLevel?.minGrowth || 0, max: currentLevel?.maxGrowth || 0, remaining: 0 };

    return {
      code: 200,
      message: '查询成功',
      data: {
        basic: {
          id: wxUser.id,
          openid: wxUser.openid,
          nickname: wxUser.nickname,
          avatar: wxUser.avatar,
          phone: wxUser.phone,
          realName: wxUser.realName,
          birthday: wxUser.birthday,
          status: wxUser.status,
          linkedUserId: wxUser.linkedUserId,
          linkedUserName: wxUser.linkedUser?.nickname,
        },
        member: {
          level: wxUser.memberLevel,
          levelInfo: currentLevel ? { ...currentLevel } : null,
          growthPoints: wxUser.growthPoints,
          nextLevel: nextLevel ? { name: nextLevel.name, minGrowth: nextLevel.minGrowth } : null,
          growthProgress,
        },
        stats: {
          totalOrders: wxUser.totalOrders,
          totalAmount: wxUser.totalAmount,
          lastOrderAt: wxUser.lastOrderAt,
          lastLoginAt: wxUser.lastLoginAt,
          churnStatus: wxUser.churnStatus,
          createdAt: wxUser.createdAt,
        },
        orders: wxUser.orders.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          packageName: o.package?.name || 'DIY套系',
          totalAmount: o.totalAmount,
          status: o.orderStatus,
          createdAt: o.createdAt,
        })),
        coupons: wxUser.coupons.map(c => ({
          id: c.id,
          name: c.coupon?.couponName,
          code: c.coupon?.couponCode,
          status: c.status,
          expiredAt: c.expiredAt,
        })),
      },
    };
  }

  // ==================== 客诉管理 ====================

  async createComplaint(dto: CreateComplaintDto) {
    const count = await this.prisma.complaint.count();
    const complaintNo = `TS${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

    const complaint = await this.prisma.complaint.create({
      data: {
        complaintNo,
        wxUserId: dto.wxUserId,
        orderId: dto.orderId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'NORMAL',
      },
      include: { wxUser: { select: { nickname: true, phone: true } } },
    });

    return { code: 200, message: '投诉已创建', data: complaint };
  }

  async findComplaints(query: QueryComplaintDto) {
    const { page = 1, pageSize = 20, status, priority, search } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) where.complaintNo = { contains: search };

    const [total, items] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          wxUser: { select: { nickname: true, phone: true, avatar: true } },
          handler: { select: { nickname: true } },
        },
      }),
    ]);

    return {
      code: 200,
      message: '查询成功',
      data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOneComplaint(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        wxUser: { select: { nickname: true, phone: true, avatar: true } },
        handler: { select: { nickname: true } },
      },
    });
    if (!complaint) throw new NotFoundException('投诉记录不存在');
    return { code: 200, message: '查询成功', data: complaint };
  }

  async updateComplaint(id: string, dto: UpdateComplaintDto) {
    const existing = await this.prisma.complaint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('投诉记录不存在');

    const data: any = { ...dto };
    // 如果标记为已解决/已关闭，记录处理时间
    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      data.handledAt = new Date();
    }

    const complaint = await this.prisma.complaint.update({ where: { id }, data });
    return { code: 200, message: '更新成功', data: complaint };
  }

  async deleteComplaint(id: string) {
    const existing = await this.prisma.complaint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('投诉记录不存在');

    await this.prisma.complaint.delete({ where: { id } });
    return { code: 200, message: '删除成功', data: null };
  }

  // ==================== 流失检测 ====================

  async detectChurnUsers() {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const atRiskUsers = await this.prisma.wxUser.findMany({
      where: {
        status: 'ACTIVE',
        churnStatus: { not: 'CHURNED' },
        OR: [
          { lastOrderAt: null, createdAt: { lte: ninetyDaysAgo } },
          { lastOrderAt: { lte: ninetyDaysAgo } },
        ],
      },
      select: { id: true, nickname: true, lastOrderAt: true, churnStatus: true },
    });

    for (const user of atRiskUsers) {
      await this.prisma.wxUser.update({
        where: { id: user.id },
        data: { churnStatus: 'AT_RISK' },
      });
    }

    this.logger.log(`流失检测完成: ${atRiskUsers.length} 人标记为流失风险`);
    return { code: 200, message: `检测完成: ${atRiskUsers.length} 人`, data: { atRisk: atRiskUsers.length } };
  }

  // ==================== 生日提醒 ====================

  async sendBirthdayReminders() {
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 查找生日在未来7天内的活跃客户（仅比较月-日）
    const allUsers = await this.prisma.wxUser.findMany({
      where: {
        status: 'ACTIVE',
        birthday: { not: null },
      },
      select: { id: true, nickname: true, birthday: true, phone: true, memberLevel: true },
    });

    const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const sevenDaysLaterMD = `${String(sevenDaysLater.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysLater.getDate()).padStart(2, '0')}`;

    const reminders = allUsers.filter(u => {
      if (!u.birthday) return false;
      const bd = `${String(u.birthday.getMonth() + 1).padStart(2, '0')}-${String(u.birthday.getDate()).padStart(2, '0')}`;
      return bd >= todayMD && bd <= sevenDaysLaterMD;
    });

    // 创建系统通知记录
    for (const user of reminders) {
      await this.prisma.appNotification.create({
        data: {
          type: 'SYSTEM',
          title: '客户生日提醒',
          content: `客户 ${user.nickname || '未知'}（${user.phone || '无电话'}）即将在 ${user.birthday?.getMonth()! + 1}月${user.birthday?.getDate()}日 过生日，等级：${user.memberLevel}。记得发送祝福和优惠券！`,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }

    this.logger.log(`生日提醒完成: ${reminders.length} 位客户即将过生日`);
    return { code: 200, message: `处理完成: ${reminders.length} 条生日提醒`, data: { total: reminders.length } };
  }
}
