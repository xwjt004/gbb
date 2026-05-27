import { simple } from './api';

export const crmService = {
  // 会员等级
  getMemberLevels: () => simple.get<any>('/crm/member-levels'),

  createMemberLevel: (data: any) =>
    simple.post<any>('/crm/member-levels', data),

  updateMemberLevel: (id: number, data: any) =>
    simple.patch<any>(`/crm/member-levels/${id}`, data),

  deleteMemberLevel: (id: number) =>
    simple.delete<any>(`/crm/member-levels/${id}`),

  getGrowthRules: () => simple.get<any>('/crm/growth-rules'),

  // 客户画像
  getCustomerProfile: (wxUserId: string) =>
    simple.get<any>(`/crm/customers/${wxUserId}/profile`),

  // 客诉管理
  getComplaints: (params?: any) =>
    simple.get<any>('/crm/complaints', { params }),

  getComplaint: (id: string) =>
    simple.get<any>(`/crm/complaints/${id}`),

  createComplaint: (data: any) =>
    simple.post<any>('/crm/complaints', data),

  updateComplaint: (id: string, data: any) =>
    simple.patch<any>(`/crm/complaints/${id}`, data),

  deleteComplaint: (id: string) =>
    simple.delete<any>(`/crm/complaints/${id}`),

  // 手动触发
  upgradeAll: () => simple.post<any>('/crm/upgrade-all'),
  detectChurn: () => simple.post<any>('/crm/detect-churn'),
  birthdayReminders: () => simple.post<any>('/crm/birthday-reminders'),
};
