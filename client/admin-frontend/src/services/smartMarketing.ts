import { simple } from './api';

export const smartMarketingService = {
  // ==================== 客户分群 ====================
  getSegments(params?: { page?: number; pageSize?: number; name?: string; status?: string }) {
    return simple.get<any>('/smart-marketing/segments', { params });
  },

  createSegment(data: { name: string; description?: string; rules: any[] }) {
    return simple.post<any>('/smart-marketing/segments', data);
  },

  getSegment(id: string) {
    return simple.get<any>(`/smart-marketing/segments/${id}`);
  },

  updateSegment(id: string, data: { name?: string; description?: string; rules?: any[]; status?: string }) {
    return simple.patch<any>(`/smart-marketing/segments/${id}`, data);
  },

  deleteSegment(id: string) {
    return simple.delete<any>(`/smart-marketing/segments/${id}`);
  },

  getSegmentMembers(id: string, params?: { page?: number; pageSize?: number }) {
    return simple.get<any>(`/smart-marketing/segments/${id}/members`, { params });
  },

  refreshSegment(id: string) {
    return simple.post<any>(`/smart-marketing/segments/${id}/refresh`);
  },

  getPresetSegments() {
    return simple.get<any>('/smart-marketing/segments/presets');
  },

  // ==================== 营销活动 ====================
  getCampaigns(params?: { page?: number; pageSize?: number; name?: string; status?: string; campaignType?: string }) {
    return simple.get<any>('/smart-marketing/campaigns', { params });
  },

  createCampaign(data: {
    name: string;
    description?: string;
    segmentId?: string;
    campaignType: string;
    couponId?: string;
    title?: string;
    content?: string;
    scheduledAt?: string;
  }) {
    return simple.post<any>('/smart-marketing/campaigns', data);
  },

  getCampaign(id: string) {
    return simple.get<any>(`/smart-marketing/campaigns/${id}`);
  },

  updateCampaign(id: string, data: any) {
    return simple.patch<any>(`/smart-marketing/campaigns/${id}`, data);
  },

  deleteCampaign(id: string) {
    return simple.delete<any>(`/smart-marketing/campaigns/${id}`);
  },

  sendCampaign(id: string) {
    return simple.post<any>(`/smart-marketing/campaigns/${id}/send`);
  },

  getCampaignFunnel(id: string) {
    return simple.get<any>(`/smart-marketing/campaigns/${id}/funnel`);
  },

  // ==================== 事件追踪 ====================
  trackEvent(data: { campaignId: string; wxUserId: string; event: string; orderId?: string; metadata?: any }) {
    return simple.post<any>('/smart-marketing/tracks', data);
  },
};
