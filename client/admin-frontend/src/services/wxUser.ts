import { simple, request } from './api';
import type { PaginationParams } from '../types/common';
import type { WxUser, WxUserSearchParams, WxUserStats } from '../types/wxUser';

export const wxUserService = {
  getList: async (params: PaginationParams & WxUserSearchParams) => {
    const queryParams: any = { page: params.page, limit: params.pageSize };
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.memberLevel) queryParams.memberLevel = params.memberLevel;
    if (params.churnStatus) queryParams.churnStatus = params.churnStatus;
    if (params.status) queryParams.status = params.status;
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

  getStats: async (): Promise<WxUserStats> => {
    const res: any = await simple.get('/wx-users/stats/overview');
    return res?.data || { total: 0, levelDistribution: [] };
  },
};
