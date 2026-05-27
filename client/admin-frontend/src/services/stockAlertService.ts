import { simple } from './api';

export interface StockAlertQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  alertType?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  productId?: number;
  alertNo?: string;
}

export interface StockAlertUpdate {
  status?: string;
  priority?: string;
  handleNote?: string;
}

export const stockAlertService = {
  getAlerts: (params: StockAlertQuery) =>
    simple.get<any>('/stock-alert', { params }),

  getStatistics: (startDate?: string, endDate?: string) =>
    simple.get<any>('/stock-alert/statistics', { params: { startDate, endDate } }),

  getAlertDetail: (id: string) =>
    simple.get<any>(`/stock-alert/${id}`),

  handleAlert: (id: string, data: StockAlertUpdate) =>
    simple.patch<any>(`/stock-alert/${id}`, data),

  deleteAlert: (id: string) =>
    simple.delete<any>(`/stock-alert/${id}`),

  manualCheck: () =>
    simple.post<any>('/stock-alert/check'),
};
