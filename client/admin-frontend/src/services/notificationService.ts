import { simple } from './api';

export interface CreateNotificationData {
  type: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';
  title: string;
  content: string;
  recipient?: string;
}

export interface NotificationQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
}

export interface CreateTemplateData {
  name: string;
  type: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';
  title: string;
  content: string;
  variables?: string[];
}

export interface UpdateTemplateData {
  name?: string;
  type?: 'PUSH' | 'EMAIL' | 'SYSTEM' | 'WECHAT';
  title?: string;
  content?: string;
  variables?: string[];
}

export interface TemplateQuery {
  page?: number;
  pageSize?: number;
  type?: string;
}

export const notificationService = {
  // ---- Notifications ----
  getList: (params: NotificationQuery) =>
    simple.get<any>('/notifications', { params }),

  getDetail: (id: string) =>
    simple.get<any>(`/notifications/${id}`),

  create: (data: CreateNotificationData) =>
    simple.post<any>('/notifications', data),

  delete: (id: string) =>
    simple.delete<any>(`/notifications/${id}`),

  retry: (id: string) =>
    simple.post<any>(`/notifications/${id}/retry`),

  retryAllFailed: () =>
    simple.post<any>('/notifications/retry-batch'),

  // ---- Templates ----
  getTemplates: (params?: TemplateQuery) =>
    simple.get<any>('/notifications/templates', { params }),

  getTemplate: (id: string) =>
    simple.get<any>(`/notifications/templates/${id}`),

  createTemplate: (data: CreateTemplateData) =>
    simple.post<any>('/notifications/templates', data),

  updateTemplate: (id: string, data: UpdateTemplateData) =>
    simple.post<any>(`/notifications/templates/${id}`, data),

  deleteTemplate: (id: string) =>
    simple.delete<any>(`/notifications/templates/${id}`),
};
