import { simple } from './api';

export const autoPurchaseSuggestionService = {
  async getList(params: { page?: number; pageSize?: number; status?: string }) {
    return simple.get<any>('/auto-purchase-suggestions', { params });
  },

  async markIgnored(id: string) {
    return simple.post(`/auto-purchase-suggestions/${id}/ignore`);
  },

  async convertToPO(id: string, supplierId: string) {
    return simple.post(`/auto-purchase-suggestions/${id}/convert`, { supplierId });
  },
};
