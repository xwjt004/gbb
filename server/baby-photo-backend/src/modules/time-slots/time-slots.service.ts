import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateTimeSlotDto, TimeSlotStatus } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { QueryTimeSlotsDto } from './dto/query-time-slots.dto';
import { CreateBatchTimeSlotsDto } from './dto/create-batch-time-slots.dto';
import type { TimeSlot } from '@prisma/client';
import { TimeSlotStatus as PrismaTimeSlotStatus } from '@prisma/client';

export interface TimeSlotStatistics {
  totalSlots: number;          // 从明天到未来已设定的时间槽总数
  availableSlots: number;       // 可用时间槽 = 总时间槽 - 已预定时间槽
  bookedSlots: number;          // 已预定时间槽（未来客户订单消耗的时间槽）
  expiredBookedSlots: number;   // 过期已预定：从历史到今天（包括今天）曾被客户预定过的时间槽
  totalCapacity: number;        // 总容量（所有时间槽的capacity之和）
  totalBooked: number;          // 已预订人数
  utilizationRate: number;      // 容量利用率：已预订人数 / 总容量
  averageBookingRate: number;   // 时间槽预订率：已预订时间槽 / 总时间槽
}

export interface DailyStatistics {
  date: string;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  totalCapacity: number;
  totalBooked: number;
  utilizationRate: number;
}

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  // 状态映射函数
  private mapStatusToPrisma(status: TimeSlotStatus): PrismaTimeSlotStatus {
    switch (status) {
      case 'AVAILABLE':
        return PrismaTimeSlotStatus.AVAILABLE;
      case 'BOOKED':
        return PrismaTimeSlotStatus.BOOKED;
      case 'UNAVAILABLE':
        return PrismaTimeSlotStatus.UNAVAILABLE;
      default:
        return PrismaTimeSlotStatus.AVAILABLE;
    }
  }

  /**
   * 将时间字符串（HH:mm）转换为 Date 对象（北京时间 UTC+8）
   * @param timeStr 时间字符串，格式：HH:mm（如 "09:00"）
   * @returns Date 对象，使用 1970-01-01 作为基准日期，时区为 UTC+8
   */
  private createTimeDate(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    
    if (isNaN(hours) || isNaN(minutes)) {
      throw new BadRequestException(`Invalid time format: ${timeStr}. Expected format: HH:mm`);
    }
    
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new BadRequestException(`Invalid time range: ${timeStr}. Hours must be 0-23, minutes must be 0-59`);
    }
    
    // 使用 UTC+8 (北京时间) 创建时间
    // 由于我们需要存储北京时间，所以减去8小时来得到对应的UTC时间
    // 例如：北京时间 09:00 = UTC 01:00
    const utcHours = hours - 8;
    
    // 使用 Date.UTC 创建 UTC 时间，然后转为 Date 对象
    return new Date(Date.UTC(1970, 0, 1, utcHours, minutes, 0, 0));
  }

  async create(createTimeSlotDto: CreateTimeSlotDto): Promise<TimeSlot> {
    try {
      // 验证时间有效性
      this.validateTimeSlot(createTimeSlotDto);

      // 检查时间段是否已存在
      await this.checkTimeSlotConflict(createTimeSlotDto);

      // 创建时间槽，包含所有字段
      const timeSlot = await this.prisma.timeSlot.create({
        data: {
          date: new Date(createTimeSlotDto.date),
          startTime: this.createTimeDate(createTimeSlotDto.startTime),
          endTime: this.createTimeDate(createTimeSlotDto.endTime),
          capacity: createTimeSlotDto.capacity || 10,
          bookedCount: 0,
          availableCount: createTimeSlotDto.capacity || 10,
          status: this.mapStatusToPrisma(createTimeSlotDto.status || TimeSlotStatus.AVAILABLE),
          isHoliday: createTimeSlotDto.isHoliday || false,
          priceMultiplier: createTimeSlotDto.priceMultiplier || 1.0,
          notes: createTimeSlotDto.notes || null,
        },
      });

      return timeSlot;
    } catch (error: unknown) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to create time slot: ${errorMessage}`,
      );
    }
  }

  async createBatch(
    createBatchDto: CreateBatchTimeSlotsDto,
  ): Promise<TimeSlot[]> {
    try {
      const timeSlots: TimeSlot[] = [];

      // 为每个日期和时间段组合创建时间槽
      for (const date of createBatchDto.dates) {
        for (const timeRange of createBatchDto.timeRanges) {
          const timeSlotDto = {
            date,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
          };

          // 验证时间有效性
          this.validateTimeSlot(timeSlotDto);

          // 检查是否已存在（跳过已存在的，不抛出异常）
          const existing = await this.findExistingTimeSlot(timeSlotDto);
          if (existing) {
            continue;
          }

          // 使用 timeRange 中的 capacity（如果提供），否则使用默认值 10
          const capacity = (timeRange as any).capacity !== undefined ? Number((timeRange as any).capacity) : 10;

          const timeSlot = await this.prisma.timeSlot.create({
            data: {
              date: new Date(date),
              startTime: this.createTimeDate(timeRange.startTime),
              endTime: this.createTimeDate(timeRange.endTime),
              capacity: capacity,
              bookedCount: 0,
              availableCount: capacity,
              status: PrismaTimeSlotStatus.AVAILABLE,
            },
          });

          timeSlots.push(timeSlot);
        }
      }

      return timeSlots;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to create batch time slots: ${errorMessage}`,
      );
    }
  }

  async findAll(query: QueryTimeSlotsDto): Promise<TimeSlot[]> {
    try {
      // 自动更新过期时间槽状态
      await this.updateExpiredSlots();
      
      const where: any = {};

      // 构建查询条件
      if (query.startDate || query.endDate) {
        where.date = {};
        if (query.startDate) {
          where.date.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.date.lte = new Date(query.endDate);
        }
      }

      if (query.isBooked !== undefined) {
        where.isBooked = query.isBooked;
      }

      if (query.status !== undefined) {
        where.status = query.status;
      }

      if (query.isHoliday !== undefined) {
        where.isHoliday = query.isHoliday;
      }

      // 不在数据库层面应用 hasCapacity 筛选，改为在内存中处理
      const hasCapacityFilter = query.hasCapacity;
      const queryWithoutCapacity = { ...query };
      delete queryWithoutCapacity.hasCapacity;

      if (query.hasCapacity !== undefined) {
        // 先不添加 hasCapacity 相关的筛选条件，后面在内存中处理
      }

      if (query.notes !== undefined && query.notes.trim() !== '') {
        where.notes = {
          contains: query.notes,
          mode: 'insensitive',
        };
      }

      // 构建排序条件
      let orderBy: any = [{ date: 'asc' }, { startTime: 'asc' }];
      if (query.sortBy) {
        switch (query.sortBy) {
          case 'date_desc':
            orderBy = [{ date: 'desc' }, { startTime: 'asc' }];
            break;
          case 'time_asc':
            orderBy = [{ startTime: 'asc' }, { date: 'asc' }];
            break;
          case 'time_desc':
            orderBy = [{ startTime: 'desc' }, { date: 'asc' }];
            break;
          default:
            orderBy = [{ date: 'asc' }, { startTime: 'asc' }];
        }
      }

      // 分页参数
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;

      // 先获取所有符合其他条件的数据
      const allTimeSlots = await this.prisma.timeSlot.findMany({
        where,
        orderBy,
        include: {
          orders: {
            select: {
              id: true,
              orderNo: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          },
        },
      });

      // 重新计算 availableCount，确保数据一致性
      let processedTimeSlots = allTimeSlots.map(slot => ({
        ...slot,
        availableCount: Math.max(0, slot.capacity - slot.bookedCount),
      }));

      // 应用容量筛选
      if (hasCapacityFilter !== undefined) {
        if (hasCapacityFilter) {
          // 有剩余：availableCount > 0
          processedTimeSlots = processedTimeSlots.filter(slot => slot.availableCount > 0);
        } else {
          // 已满：availableCount <= 0
          processedTimeSlots = processedTimeSlots.filter(slot => slot.availableCount <= 0);
        }
      }

      // 计算筛选后的总数
      const total = processedTimeSlots.length;

      // 应用分页
      const skip = (page - 1) * pageSize;
      const paginatedTimeSlots = processedTimeSlots.slice(skip, skip + pageSize);

      return {
        list: paginatedTimeSlots,
        pagination: {
          current: page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      } as any;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to fetch time slots: ${errorMessage}`,
      );
    }
  }

  async findOne(id: number): Promise<TimeSlot> {
    try {
      const timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id },
        include: {
          orders: {
            include: {
              user: {
                select: {
                  id: true,
                  nickname: true,
                  phone: true,
                },
              },
              package: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!timeSlot) {
        throw new NotFoundException(`Time slot with id ${id} not found`);
      }

      return timeSlot;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to find time slot: ${errorMessage}`,
      );
    }
  }

  async findAvailable(date?: string): Promise<TimeSlot[]> {
    try {
      const where: any = { isBooked: false };

      if (date) {
        where.date = new Date(date);
      } else {
        // 默认只显示今天及以后的可用时间槽
        where.date = {
          gte: new Date(),
        };
      }

      const timeSlots = await this.prisma.timeSlot.findMany({
        where,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      return timeSlots;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to find available time slots: ${errorMessage}`,
      );
    }
  }

  async update(
    id: number,
    updateTimeSlotDto: UpdateTimeSlotDto,
  ): Promise<TimeSlot> {
    try {
      // 检查时间槽是否存在
      await this.findOne(id);

      // 如果更新时间信息，需要验证
      if (
        updateTimeSlotDto.date ||
        updateTimeSlotDto.startTime ||
        updateTimeSlotDto.endTime
      ) {
        const currentTimeSlot = await this.prisma.timeSlot.findUnique({
          where: { id },
        });

        if (!currentTimeSlot) {
          throw new NotFoundException(`Time slot with id ${id} not found`);
        }

        const updatedData = {
          date:
            updateTimeSlotDto.date ||
            currentTimeSlot.date.toISOString().split('T')[0],
          startTime:
            updateTimeSlotDto.startTime ||
            currentTimeSlot.startTime.toTimeString().split(' ')[0],
          endTime:
            updateTimeSlotDto.endTime ||
            currentTimeSlot.endTime.toTimeString().split(' ')[0],
        };

        this.validateTimeSlot(updatedData);
      }

      const data: any = {};
      if (updateTimeSlotDto.date) {
        data.date = new Date(updateTimeSlotDto.date);
      }
      if (updateTimeSlotDto.startTime) {
        data.startTime = this.createTimeDate(updateTimeSlotDto.startTime);
      }
      if (updateTimeSlotDto.endTime) {
        data.endTime = this.createTimeDate(updateTimeSlotDto.endTime);
      }
      if (updateTimeSlotDto.capacity !== undefined) {
        data.capacity = updateTimeSlotDto.capacity;
        // 重新计算可用数量
        const currentTimeSlot = await this.prisma.timeSlot.findUnique({
          where: { id },
          select: { bookedCount: true },
        });
        if (currentTimeSlot) {
          data.availableCount = Math.max(0, updateTimeSlotDto.capacity - currentTimeSlot.bookedCount);
        }
      }
      if (updateTimeSlotDto.status !== undefined) {
        data.status = updateTimeSlotDto.status;
      }
      if (updateTimeSlotDto.isHoliday !== undefined) {
        data.isHoliday = updateTimeSlotDto.isHoliday;
      }
      if (updateTimeSlotDto.priceMultiplier !== undefined) {
        data.priceMultiplier = updateTimeSlotDto.priceMultiplier;
      }
      if (updateTimeSlotDto.notes !== undefined) {
        data.notes = updateTimeSlotDto.notes;
      }
      if (updateTimeSlotDto.isBooked !== undefined) {
        data.isBooked = updateTimeSlotDto.isBooked;
      }

      const updatedTimeSlot = await this.prisma.timeSlot.update({
        where: { id },
        data,
        include: {
          orders: true,
        },
      });

      return updatedTimeSlot;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to update time slot: ${errorMessage}`,
      );
    }
  }

  async remove(id: number): Promise<TimeSlot> {
    try {
      // 检查时间槽是否存在并包含订单信息
      const timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id },
        include: { orders: true },
      });

      if (!timeSlot) {
        throw new NotFoundException(`Time slot with id ${id} not found`);
      }

      // 检查是否有相关订单
      if (timeSlot.orders && timeSlot.orders.length > 0) {
        throw new BadRequestException(
          'Cannot delete time slot with existing orders',
        );
      }

      const deletedTimeSlot = await this.prisma.timeSlot.delete({
        where: { id },
      });

      return deletedTimeSlot;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to delete time slot: ${errorMessage}`,
      );
    }
  }

  private validateTimeSlot(data: {
    date: string;
    startTime: string;
    endTime: string;
  }): void {
    const date = new Date(data.date);
    const startTime = new Date(`1970-01-01T${data.startTime}Z`);
    const endTime = new Date(`1970-01-01T${data.endTime}Z`);

    // 检查日期是否为未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw new BadRequestException('Date cannot be in the past');
    }

    // 检查结束时间是否晚于开始时间
    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // 检查时间段是否合理（至少30分钟）
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException(
        'Time slot duration must be at least 30 minutes',
      );
    }
  }

  private async checkTimeSlotConflict(data: {
    date: string;
    startTime: string;
    endTime: string;
  }): Promise<void> {
    const existing = await this.findExistingTimeSlot(data);
    if (existing) {
      throw new ConflictException(
        'Time slot already exists for this date and time',
      );
    }
  }

  private async findExistingTimeSlot(data: {
    date: string;
    startTime: string;
    endTime: string;
  }) {
    return await this.prisma.timeSlot.findFirst({
      where: {
        date: new Date(data.date),
        startTime: this.createTimeDate(data.startTime),
        endTime: this.createTimeDate(data.endTime),
      },
    });
  }

  // 获取时间槽统计数据
  async getStatistics(startDate?: string, endDate?: string): Promise<TimeSlotStatistics> {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // 当天00:00:00
      
      // 明天的日期（未来时间槽从明天开始）
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // 1. 查询未来时间槽（从明天开始到未来）
      const futureWhere: any = {
        date: {
          gte: startDate ? new Date(startDate) : tomorrow, // 默认从明天开始
        }
      };
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        futureWhere.date.lt = endDateObj;
      }

      // 2. 查询过期已预定时间槽（从历史到今天，且状态为BOOKED）
      const expiredWhere: any = {
        date: {
          lte: now, // 小于等于当前日期（包括今天）
        },
        status: PrismaTimeSlotStatus.BOOKED, // 曾被预定过的
      };

      console.log('📊 统计查询条件:', { 
        当前日期: now.toISOString().split('T')[0],
        明天: tomorrow.toISOString().split('T')[0],
        startDate, 
        endDate, 
        futureWhere, 
        expiredWhere 
      });

      // 自动更新过期时间槽状态
      await this.updateExpiredSlots();
      
      // 获取未来时间槽（用于主要统计）
      const futureSlots = await this.prisma.timeSlot.findMany({ where: futureWhere });
      
      // 获取过期已预定时间槽
      const expiredBookedSlots = await this.prisma.timeSlot.findMany({ where: expiredWhere });
      
      console.log('📈 查询结果:', {
        未来时间槽数量: futureSlots.length,
        过期已预定数量: expiredBookedSlots.length,
      });
      
      return this.calculateStatistics(futureSlots, expiredBookedSlots.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get statistics: ${errorMessage}`);
    }
  }

  // 更新过期时间槽状态
  private async updateExpiredSlots(): Promise<void> {
    const now = new Date();
    
    // 查找所有状态为AVAILABLE的时间槽
    const availableSlots = await this.prisma.timeSlot.findMany({
      where: {
        status: PrismaTimeSlotStatus.AVAILABLE
      }
    });
    
    // 过滤出过期的时间槽
    const expiredSlots = availableSlots.filter(slot => {
      const slotDateTime = new Date(slot.date);
      const startTime = new Date(slot.startTime);
      slotDateTime.setHours(startTime.getUTCHours() + 8); // 转换为北京时间
      slotDateTime.setMinutes(startTime.getUTCMinutes());
      return slotDateTime < now;
    });
    
    // 批量更新过期时间槽状态
    if (expiredSlots.length > 0) {
      await this.prisma.timeSlot.updateMany({
        where: {
          id: { in: expiredSlots.map(s => s.id) }
        },
        data: {
          status: PrismaTimeSlotStatus.UNAVAILABLE
        }
      });
      console.log(`已将 ${expiredSlots.length} 个过期时间槽设为不可用`);
    }
  }

  // 提取统计计算逻辑为独立方法
  private calculateStatistics(futureSlots: any[], expiredBookedCount: number): TimeSlotStatistics {
    // 【业务逻辑】
    // 1. 总时间槽 = 从当前日期到未来已设定的时间槽总数
    const totalSlots = futureSlots.length;
      
    // 2. 已预定时间槽 = 客户订单消耗的时间槽（状态为BOOKED）
    const bookedSlots = futureSlots.filter(slot => slot.status === PrismaTimeSlotStatus.BOOKED).length;
    
    // 3. 可用时间槽 = 状态为 AVAILABLE 的时间槽（排除 UNAVAILABLE）
    const availableSlots = futureSlots.filter(slot => slot.status === PrismaTimeSlotStatus.AVAILABLE).length;
    
    // 4. 过期已预定 = 从第一个时间槽设定日期到当前日期的曾被客户预定过的过期时间槽
    const expiredBookedSlots = expiredBookedCount;
    
    // 计算总容量和已预订人数
    const totalCapacity = futureSlots.reduce((sum, slot) => sum + slot.capacity, 0);
    const totalBooked = futureSlots.reduce((sum, slot) => sum + slot.bookedCount, 0);
    
    // 计算容量利用率（已预订人数/总容量）
    const utilizationRate = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;
    
    // 计算时间槽预订率（已预订时间槽/总时间槽）
    const averageBookingRate = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

    const stats = {
      totalSlots,           // 从当前日期到未来的时间槽总数
      availableSlots,       // 可用 = 总 - 已预定
      bookedSlots,          // 已被客户订单预定
      expiredBookedSlots,   // 过期已预定
      totalCapacity,        // 总容量
      totalBooked,          // 已预订人数
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      averageBookingRate: Math.round(averageBookingRate * 100) / 100,
    };
    
    console.log('✅ 时间槽统计结果（新逻辑）:', stats);
    console.log('📊 统计详情:', {
      '总时间槽（当前日期到未来）': totalSlots,
      '可用时间槽': availableSlots,
      '已预定时间槽': bookedSlots,
      '过期已预定': expiredBookedSlots,
      '总容量': totalCapacity,
      '已预订人数': totalBooked,
    });
    
    return stats;
  }

  // 获取每日统计数据
  async getDailyStatistics(startDate: string, endDate: string): Promise<DailyStatistics[]> {
    try {
      const timeSlots = await this.prisma.timeSlot.findMany({
        where: {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'asc' },
      });

      // 按日期分组统计
      const dailyStats = new Map<string, DailyStatistics>();
      
      timeSlots.forEach(slot => {
        const dateKey = slot.date.toISOString().split('T')[0];
        
        if (!dailyStats.has(dateKey)) {
          dailyStats.set(dateKey, {
            date: dateKey,
            totalSlots: 0,
            availableSlots: 0,
            bookedSlots: 0,
            totalCapacity: 0,
            totalBooked: 0,
            utilizationRate: 0,
          });
        }
        
        const stats = dailyStats.get(dateKey)!;
        stats.totalSlots++;
        stats.totalCapacity += slot.capacity;
        stats.totalBooked += slot.bookedCount;
        
        if (slot.status === PrismaTimeSlotStatus.AVAILABLE) {
          stats.availableSlots++;
        } else if (slot.status === PrismaTimeSlotStatus.BOOKED) {
          stats.bookedSlots++;
        }
      });

      // 计算利用率
      const result = Array.from(dailyStats.values()).map(stats => ({
        ...stats,
        utilizationRate: stats.totalCapacity > 0 
          ? Math.round((stats.totalBooked / stats.totalCapacity) * 10000) / 100
          : 0,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get daily statistics: ${errorMessage}`);
    }
  }

  // 获取可用时间槽（用于前端预约）
  async getAvailableSlots(date?: string, limit?: number, startDate?: string, endDate?: string): Promise<TimeSlot[]> {
    try {
      const where: any = {
        status: PrismaTimeSlotStatus.AVAILABLE,
      };

      if (date) {
        where.date = new Date(date);
      } else if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      } else {
        // 默认只获取未来的时间槽
        where.date = { gte: new Date() };
      }

      // 获取所有符合基本条件的时间槽
      const allSlots = await this.prisma.timeSlot.findMany({
        where,
        include: {
          _count: {
            select: { orders: true }
          }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });

      // 过滤出有剩余容量的时间槽
      const availableSlots = allSlots.filter(slot => {
        const currentBookedCount = slot._count?.orders;
        return currentBookedCount < slot.capacity;
      });

      // 应用限制
      if (limit) {
        return availableSlots.slice(0, limit);
      }

      return availableSlots;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to get available slots: ${errorMessage}`);
    }
  }

  // 批量更新时间槽状态
  async batchUpdateStatus(ids: number[], status: TimeSlotStatus): Promise<number> {
    try {
      const result = await this.prisma.timeSlot.updateMany({
        where: { id: { in: ids } },
        data: { status: this.mapStatusToPrisma(status) },
      });

      return result.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to batch update status: ${errorMessage}`);
    }
  }

  // 批量删除时间槽
  async batchDelete(ids: number[]): Promise<number> {
    try {
      // 检查是否有已预订的时间槽
      const bookedSlots = await this.prisma.timeSlot.findMany({
        where: {
          id: { in: ids },
          bookedCount: { gt: 0 },
        },
      });

      if (bookedSlots.length > 0) {
        throw new BadRequestException(
          `Cannot delete time slots with bookings. Found ${bookedSlots.length} booked slots.`
        );
      }

      const result = await this.prisma.timeSlot.deleteMany({
        where: { id: { in: ids } },
      });

      return result.count;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(`Failed to batch delete: ${errorMessage}`);
    }
  }

  async getConflictAnalysis(date: string) {
    const queryDate = new Date(date + 'T00:00:00.000Z');

    const slots = await this.prisma.timeSlot.findMany({
      where: { date: queryDate },
      orderBy: { startTime: 'asc' },
    });

    const toCstTime = (d: Date) => {
      const cst = new Date(d.getTime() + 8 * 60 * 60 * 1000);
      return cst.toISOString().slice(11, 16);
    };

    const conflicts: Array<{
      slotId: number;
      startTime: string;
      endTime: string;
      severity: 'INFO' | 'WARNING' | 'ERROR';
      message: string;
      bookedCount: number;
      capacity: number;
      utilizationRate: number;
    }> = [];

    for (const slot of slots) {
      const utilization = slot.capacity > 0 ? (slot.bookedCount / slot.capacity) * 100 : 0;
      if (utilization >= 100) {
        conflicts.push({
          slotId: slot.id,
          startTime: toCstTime(slot.startTime),
          endTime: toCstTime(slot.endTime),
          severity: 'ERROR',
          message: `时间段已满 (${slot.bookedCount}/${slot.capacity})`,
          bookedCount: slot.bookedCount,
          capacity: slot.capacity,
          utilizationRate: utilization,
        });
      } else if (utilization >= 80) {
        conflicts.push({
          slotId: slot.id,
          startTime: toCstTime(slot.startTime),
          endTime: toCstTime(slot.endTime),
          severity: 'WARNING',
          message: `时间段即将饱和 (${slot.bookedCount}/${slot.capacity})`,
          bookedCount: slot.bookedCount,
          capacity: slot.capacity,
          utilizationRate: utilization,
        });
      }
    }

    // Check overlapping time ranges
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const aStart = a.startTime.getTime();
        const aEnd = a.endTime.getTime();
        const bStart = b.startTime.getTime();
        const bEnd = b.endTime.getTime();
        if (aStart < bEnd && bStart < aEnd) {
          conflicts.push({
            slotId: a.id,
            startTime: toCstTime(a.startTime),
            endTime: toCstTime(a.endTime),
            severity: 'WARNING',
            message: `与时间段 ${toCstTime(b.startTime)}-${toCstTime(b.endTime)} 重叠`,
            bookedCount: a.bookedCount,
            capacity: a.capacity,
            utilizationRate: 0,
          });
        }
      }
    }

    const totalSlots = slots.length;
    const nearCapacity = conflicts.filter(c => c.severity === 'WARNING').length;
    const fullyBooked = conflicts.filter(c => c.severity === 'ERROR').length;
    const available = slots.filter(s => (s.availableCount ?? 0) > 0).length;

    return {
      date,
      totalSlots,
      conflicts,
      nearCapacitySlots: nearCapacity,
      fullyBookedSlots: fullyBooked,
      availableSlots: available,
    };
  }

  async getRecommendations(startDate?: string, endDate?: string, limit = 5) {
    const today = new Date();
    const todayUtc = new Date(today.toISOString().slice(0, 10) + 'T00:00:00.000Z');

    const start = startDate ? new Date(startDate + 'T00:00:00.000Z') : todayUtc;
    if (!startDate) {
      start.setUTCDate(start.getUTCDate() + 1);
    }

    const end = endDate ? new Date(endDate + 'T00:00:00.000Z') : new Date(start);
    if (!endDate) {
      end.setUTCDate(end.getUTCDate() + 14);
    }

    const toCstTime = (d: Date) => {
      const cst = new Date(d.getTime() + 8 * 60 * 60 * 1000);
      return cst.toISOString().slice(11, 16);
    };

    const slots = await this.prisma.timeSlot.findMany({
      where: {
        date: { gte: start, lte: end },
        status: 'AVAILABLE',
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const scored = slots
      .filter(s => (s.availableCount ?? 0) > 0)
      .map(s => {
        const utilization = s.capacity > 0 ? s.bookedCount / s.capacity : 0;
        const score = Math.round((1 - utilization) * 100);
        return {
          date: s.date.toISOString().slice(0, 10),
          startTime: toCstTime(s.startTime),
          endTime: toCstTime(s.endTime),
          recommendationScore: score,
          reason: utilization < 0.3
            ? '该时间段非常宽松，建议安排预约'
            : utilization < 0.6
              ? '该时间段仍有较多余量'
              : '该时间段即将饱和，建议尽早安排',
          historicalUtilizationRate: Math.round(utilization * 100),
          remainingCapacity: s.availableCount ?? 0,
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    return scored;
  }
}
