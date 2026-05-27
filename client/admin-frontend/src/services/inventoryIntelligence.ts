import { simple } from './api';

export const inventoryIntelligenceService = {
  // Sales Prediction
  getSalesPrediction(params?: { method?: string; periods?: number; alpha?: number; productIds?: number[]; page?: number; pageSize?: number }) {
    return simple.get<any>('/inventory-intelligence/sales-prediction', { params });
  },

  getProductSalesPrediction(productId: number, params?: { method?: string; periods?: number }) {
    return simple.get<any>(`/inventory-intelligence/sales-prediction/product/${productId}`, { params });
  },

  // Safety Stock
  getSafetyStock(params?: { productId?: number; page?: number; pageSize?: number }) {
    return simple.get<any>('/inventory-intelligence/safety-stock', { params });
  },

  batchCalculateSafetyStock(data?: { serviceLevel?: number; demandPeriodDays?: number }) {
    return simple.post<any>('/inventory-intelligence/safety-stock/batch-calculate', data);
  },

  updateSafetyStockConfig(productId: number, data?: { serviceLevel?: number; demandPeriodDays?: number }) {
    return simple.put<any>(`/inventory-intelligence/safety-stock/product/${productId}`, data);
  },

  // Restock Suggestions
  getRestockSuggestions(params?: { urgency?: string; page?: number; pageSize?: number }) {
    return simple.get<any>('/inventory-intelligence/restock-suggestions', { params });
  },

  generateRestockSuggestions() {
    return simple.post<any>('/inventory-intelligence/restock-suggestions/generate');
  },

  convertSuggestionToPO(id: string, supplierId?: string) {
    return simple.post<any>(`/inventory-intelligence/restock-suggestions/${id}/convert`, { supplierId });
  },

  // Slow-moving
  getSlowMovingProducts(params?: { thresholdDays?: number; categoryId?: number; status?: string; page?: number; pageSize?: number }) {
    return simple.get<any>('/inventory-intelligence/slow-moving', { params });
  },

  checkSlowMoving() {
    return simple.post<any>('/inventory-intelligence/slow-moving/check');
  },

  // Turnover Analysis
  getTurnoverAnalysis(params?: { categoryId?: number; startDate?: string; endDate?: string }) {
    return simple.get<any>('/inventory-intelligence/turnover-analysis', { params });
  },

  getTurnoverReport(params?: { categoryId?: number; startDate?: string; endDate?: string; productId?: number }) {
    return simple.get<any>('/inventory-intelligence/turnover-analysis/report', { params });
  },

  refreshTurnoverData() {
    return simple.post<any>('/inventory-intelligence/turnover-analysis/refresh');
  },
};
