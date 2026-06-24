import { simple, request } from './api';

export interface WorkCategory {
  id: number;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const workCategoryService = {
  getList: async (params?: { page?: number; limit?: number }) => {
    const res: any = await simple.get('/work-categories', { params });
    return res?.data || { items: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  },

  getAll: async () => {
    const res: any = await simple.get('/work-categories/all');
    return (res?.data as WorkCategory[]) || [];
  },

  create: (data: { name: string; sortOrder?: number }) => {
    return request.post('/work-categories', data);
  },

  update: (id: number, data: Partial<{ name: string; sortOrder: number }>) => {
    return request.patch(`/work-categories/${id}`, data);
  },

  remove: (id: number) => {
    return request.delete(`/work-categories/${id}`);
  },
};
