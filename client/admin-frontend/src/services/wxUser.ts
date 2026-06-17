import { simple, request } from './api';
import type { PaginationParams } from '../types/common';
import type { WxUser, WxUserSearchParams, WxUserStats } from '../types/wxUser';

export const wxUserService = {
  getList: async (params: PaginationParams & WxUserSearchParams) => {
    const queryParams: any = { page: params.page, limit: params.pageSize };
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.phone) queryParams.phone = params.phone;
    if (params.openid) queryParams.openid = params.openid;
    if (params.memberLevel) queryParams.memberLevel = params.memberLevel;
    if (params.churnStatus) queryParams.churnStatus = params.churnStatus;
    if (params.status) queryParams.status = params.status;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    if (params.sort) queryParams.sort = params.sort;

    const res: any = await simple.get('/wx-users', { params: queryParams });
    const pg = res?.data?.pagination;
    return {
      data: {
        list: res?.data?.items || [],
        pagination: {
          current: pg?.page || 1,
          pageSize: pg?.limit || 20,
          total: pg?.total || 0,
        },
      },
    };
  },

  getById: async (id: string): Promise<WxUser> => {
    const res: any = await simple.get(`/wx-users/${id}`);
    return res?.data;
  },

  update: (id: string, data: Partial<WxUser>) => {
    return request.patch(`/wx-users/${id}`, data);
  },

  getOrders: async (id: string, page = 1, limit = 10) => {
    const res: any = await simple.get(`/wx-users/${id}/orders`, {
      params: { page, limit },
    });
    return res?.data || { items: [], pagination: { total: 0, page, limit, totalPages: 0 } };
  },

  getAddresses: async (id: string) => {
    const res: any = await simple.get(`/wx-users/${id}/addresses`);
    return res?.data || [];
  },

  delete: (id: string) => {
    return request.delete(`/wx-users/${id}`);
  },

  getStats: async (): Promise<WxUserStats> => {
    const res: any = await simple.get('/wx-users/stats/overview');
    return res?.data || { total: 0, levelDistribution: [] };
  },

  // 成长里程碑
  getMilestones: (wxUserId: string) =>
    simple.get(`/wx-users/${wxUserId}/milestones`),

  createMilestone: (wxUserId: string, data: any) =>
    simple.post(`/wx-users/${wxUserId}/milestones`, data),

  updateMilestone: (wxUserId: string, milestoneId: string, data: any) =>
    simple.patch(`/wx-users/${wxUserId}/milestones/${milestoneId}`, data),

  deleteMilestone: (wxUserId: string, milestoneId: string) =>
    simple.delete(`/wx-users/${wxUserId}/milestones/${milestoneId}`),
};
