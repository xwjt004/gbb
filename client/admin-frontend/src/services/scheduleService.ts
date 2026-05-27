import { simple } from './api';

export const scheduleService = {
  // 获取拍摄日程看板（单日）
  getScheduleBoard: (params: { date: string; photographerId?: number }) =>
    simple.get('/orders/schedule-board', { params }),

  // 获取拍摄日程看板（日期范围，用于周视图）
  getScheduleBoardRange: (params: { startDate: string; endDate: string; photographerId?: number }) =>
    simple.get('/orders/schedule-board/range', { params }),

  // 分配摄影师
  assignPhotographer: (orderId: string, photographerId: number) =>
    simple.patch(`/orders/${orderId}/assign-photographer`, { photographerId }),

  // 批量分配摄影师
  batchAssignPhotographer: (orderIds: string[], photographerId: number) =>
    simple.post('/orders/batch-assign-photographer', { orderIds, photographerId }),

  // 调整预约时间
  rescheduleOrder: (orderId: string, timeSlotId: number) =>
    simple.patch(`/orders/${orderId}/reschedule`, { timeSlotId }),

  // 获取摄影师列表
  getPhotographers: () => simple.get('/users/photographers'),
};
