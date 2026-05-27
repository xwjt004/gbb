import { simple } from './api';

export const automationRuleService = {
  getList(params: { page?: number; pageSize?: number; trigger?: string; enabled?: boolean }) {
    return simple.get<any>('/automation-rules', { params });
  },

  getById(id: number) {
    return simple.get<any>(`/automation-rules/${id}`);
  },

  create(data: { name: string; description?: string; trigger: string; conditions?: any[]; actions: any[]; enabled?: boolean }) {
    return simple.post<any>('/automation-rules', data);
  },

  update(id: number, data: any) {
    return simple.patch<any>(`/automation-rules/${id}`, data);
  },

  remove(id: number) {
    return simple.delete(`/automation-rules/${id}`);
  },

  toggle(id: number) {
    return simple.post(`/automation-rules/${id}/toggle`);
  },
};
