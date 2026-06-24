import { simple, request } from './api';

export interface Photographer {
  id: number;
  name: string;
  title?: string;
  avatar?: string;
  description?: string;
  style?: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const photographerService = {
  getList: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res: any = await simple.get('/photographers', { params });
    return res?.data || { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  },

  getAll: async () => {
    const res: any = await simple.get('/photographers/all');
    return (res?.data as Photographer[]) || [];
  },

  create: (data: {
    name: string;
    title?: string;
    avatar?: string;
    description?: string;
    style?: string;
    sortOrder?: number;
    status?: string;
  }) => {
    return request.post('/photographers', data);
  },

  update: (id: number, data: Partial<{
    name: string;
    title?: string;
    avatar?: string;
    description?: string;
    style?: string;
    sortOrder?: number;
    status?: string;
  }>) => {
    return request.patch(`/photographers/${id}`, data);
  },

  remove: (id: number) => {
    return request.delete(`/photographers/${id}`);
  },
};
