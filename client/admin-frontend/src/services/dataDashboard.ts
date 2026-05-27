import { simple } from './api';

export interface ComprehensiveTrendItem {
  date: string;
  revenue: number;
  orderCount: number;
  paidAmount: number;
  refundAmount: number;
  avgOrderValue: number;
  conversionRate: number;
}

export interface RevenueBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface RevenueAnalysis {
  dimension: string;
  total: number;
  breakdown: RevenueBreakdownItem[];
}

export interface ComparativeResult {
  current: { orders: number; revenue: number; avgOrderValue: number; refunds: number; refundRate: number };
  previous: { orders: number; revenue: number; avgOrderValue: number; refunds: number; refundRate: number };
  comparison: { ordersGrowth: string; revenueGrowth: string; avgOrderValueGrowth: string; refundRateChange: string };
}

export const dataDashboardService = {
  async getComprehensiveTrends(startDate?: string, endDate?: string) {
    const res = await simple.get<any>('/statistics-analysis/trends/comprehensive', {
      params: { startDate, endDate },
    });
    return (res?.data || res) as ComprehensiveTrendItem[];
  },

  async getComparativeAnalysis(current: string, previous: string, period: number) {
    const res = await simple.get<any>('/statistics-analysis/comparative/analysis', {
      params: { current, previous, period },
    });
    return (res?.data || res) as ComparativeResult;
  },

  async getRevenueAnalysis(dimension: string, period?: string) {
    const res = await simple.get<any>('/statistics-analysis/revenue/analysis', {
      params: { dimension, period },
    });
    return (res?.data || res) as RevenueAnalysis;
  },

  async getDashboardStats() {
    const res = await simple.get<any>('/statistics-analysis/dashboard/stats');
    return (res?.data || res) as any;
  },
};
