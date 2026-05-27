import { simple } from './api';

export const seasonalPriceService = {
  getList: (params?: { packageId?: number }) =>
    simple.get('/seasonal-prices', { params }),

  create: (data: { packageId: number; startDate: string; endDate: string; price: number; label?: string }) =>
    simple.post('/seasonal-prices', data),

  update: (id: number, data: Partial<{ startDate: string; endDate: string; price: number; label: string }>) =>
    simple.patch(`/seasonal-prices/${id}`, data),

  delete: (id: number) =>
    simple.delete(`/seasonal-prices/${id}`),
};
