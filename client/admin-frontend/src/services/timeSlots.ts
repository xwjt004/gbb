import { request, simple } from './api';
import { TimeSlot, TimeSlotSearchParams, TimeSlotFormData, BatchCreateParams, TimeSlotStatus } from '@/types/timeSlot';
import { PaginationParams } from '@/types/common';


export const timeSlotService = {
  // 获取时间槽列表
  getTimeSlots: async (params: PaginationParams & TimeSlotSearchParams & { sortBy?: string }) => {
    try {
      const queryParams: any = {};
      
      // 添加查询参数
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.status) queryParams.status = params.status;
      if (params.isHoliday !== undefined) queryParams.isHoliday = params.isHoliday;
      if (params.hasCapacity !== undefined) queryParams.hasCapacity = params.hasCapacity;
      if (params.notes) queryParams.notes = params.notes;
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      
      // 添加分页参数
      if (params.page) queryParams.page = params.page;
      if (params.pageSize) queryParams.pageSize = params.pageSize;
      
      const response = await simple.get<any>('/time-slots', { params: queryParams });
      
      // 后端现在返回分页数据
      return {
        data: {
          list: response?.list || [],
          pagination: response?.pagination || {
            current: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
          },
        },
      };
    } catch (error) {
      console.error('获取时间槽列表失败:', error);
      // 返回空数据而不是抛出错误
      return {
        data: {
          list: [] as TimeSlot[],
          pagination: {
            current: params.page || 1,
            pageSize: params.pageSize || 20,
            total: 0,
            totalPages: 0,
          },
        },
      };
    }
  },

  // 获取时间槽详情
  getTimeSlotById: async (id: string) => simple.get<TimeSlot>(`/time-slots/${id}`),

  // 创建时间槽
  createTimeSlot: (data: TimeSlotFormData) => request.post<TimeSlot>('/time-slots', data),

  // 批量创建时间槽
  batchCreateTimeSlots: (data: BatchCreateParams) =>
    request.post('/time-slots/batch', data),

  // 更新时间槽
  updateTimeSlot: (id: string, data: Partial<TimeSlotFormData>) => request.patch<TimeSlot>(`/time-slots/${id}`, data),

  // 删除时间槽
  deleteTimeSlot: (id: string) =>
    request.delete(`/time-slots/${id}`),

  // 批量删除时间槽
  batchDeleteTimeSlots: async (ids: number[]) => {
    try {
      const response = await request.delete('/time-slots/batch', { data: { ids } });
      return response.data;
    } catch (error) {
      console.error('批量删除失败:', error);
      throw error;
    }
  },

  // 获取可用时间槽
  getAvailableSlots: async (params: { date: string; packageId?: string }) => {
    try {
      console.log('调用时间槽API，参数:', params);
      // 只传递后端支持的参数
      const apiParams = { date: params.date };
      const response = await simple.get<TimeSlot[]>(`/time-slots/available`, { params: apiParams });
      console.log('时间槽API响应:', response);
      
      // 过滤出真正有剩余容量的时间槽
      let availableSlots: TimeSlot[] = [];
      if (Array.isArray(response)) {
        availableSlots = response.filter(slot => {
          const remaining = slot.capacity - slot.bookedCount;
          return remaining > 0 && slot.status === TimeSlotStatus.AVAILABLE;
        });
      }
      
      console.log('过滤后的可用时间槽:', availableSlots);
      return availableSlots;
    } catch (error) {
      console.error('获取可用时间槽失败:', error);
      throw error; // 不再返回模拟数据，让错误正确传播
    }
  },

  // 检查时间冲突
  checkConflict: (data: { date: string; startTime: string; endTime: string; excludeId?: string }) =>
    request.post('/time-slots/check-conflict', data),

  // 获取时间槽统计
  getTimeSlotStats: async () => {
    try {
      const response = await simple.get('/time-slots/statistics/overview');
      return {
        data: {
          totalSlots: response.totalSlots,
          availableSlots: response.availableSlots,
          utilizationRate: response.utilizationRate,
          avgBookingRate: response.averageBookingRate,
        },
      };
    } catch (error) {
      console.error('获取统计数据失败，使用模拟数据:', error);
      // Mock data for development
      return {
        data: {
          totalSlots: 0,
          availableSlots: 0,
          utilizationRate: 0,
          avgBookingRate: 0,
        },
      };
    }
  },

  // 获取统计概览
  getStatistics: async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      console.log('调用统计API，参数:', params);
      const response = await simple.get('/time-slots/statistics/overview', { params });
      console.log('统计API完整响应:', response);
      
      // 后端直接返回统计数据对象，不包装在 ApiResponse 中
      return response;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      throw error;
    }
  },

  // 获取每日统计
  getDailyStatistics: async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await simple.get('/time-slots/statistics/daily', { params });
      console.log('每日统计API响应:', response);
      // 后端直接返回每日统计数组
      return response;
    } catch (error) {
      console.error('获取每日统计失败:', error);
      return [];
    }
  },

  // 获取日历数据
  getCalendarData: async (params: { year: number; month: number }) => {
    try {
      // 构造月份的开始和结束日期
      const startDate = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
      const endDate = new Date(params.year, params.month, 0); // 下个月的第0天，即本月最后一天
      const endDateStr = `${params.year}-${String(params.month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      
      // 获取时间槽数据，无分页限制
      const response = await timeSlotService.getTimeSlots({
        startDate,
        endDate: endDateStr,
        page: 1,
        pageSize: 1000, // 获取足够多的数据用于日历显示
      });
      
      // 按日期分组时间槽
      const calendarData: Record<string, TimeSlot[]> = {};
      const timeSlots = response.data.list || [];
      
      timeSlots.forEach((slot: TimeSlot) => {
        const dateKey = slot.date.split('T')[0]; // 取日期部分
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = [];
        }
        calendarData[dateKey].push(slot);
      });
      
      return {
        data: calendarData,
      };
    } catch (error) {
      console.error('获取日历数据失败:', error);
      // Mock data for development
      return {
        data: {} as Record<string, TimeSlot[]>,
      };
    }
  },

  // 复制时间槽
  copyTimeSlots: (params: { sourceDate: string; targetDates: string[] }) =>
    request.post('/time-slots/copy', params),

  // 冲突检测
  getConflictAnalysis: async (date: string) => {
    return simple.get('/time-slots/conflicts', { params: { date } });
  },

  // 智能推荐
  getRecommendations: async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    return simple.get('/time-slots/recommendations', { params });
  },

  // 批量更新状态
  batchUpdateStatus: async (params: { ids: string[]; status: string }) => {
    try {
      const response = await request.post('/time-slots/batch/status', params);
      return response;
    } catch (error) {
      console.error('批量更新状态失败:', error);
      throw error;
    }
  },
};
