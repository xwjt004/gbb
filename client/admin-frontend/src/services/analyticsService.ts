import { simple } from './api';

export interface OverviewData {
  user_analytics: {
    total_users: number;
    new_users_period: number;
  };
  behavior_analytics: {
    total_orders: number;
    total_revenue: number;
  };
  package_analytics: {
    total_packages: number;
    most_popular_package: { package_name: string; order_count: number } | null;
  };
  loyalty_analytics: {
    total_customers: number;
    repeat_customer_count: number;
    loyalty_rate: number;
  };
}

export interface UserAnalytics {
  total_users: number;
  new_users: number;
  active_users: number;
  user_growth: { date: string; count: number }[];
}

export interface BehaviorAnalytics {
  order_trends: { date: string; order_count: number; total_amount: number }[];
  payment_behavior: {
    total_orders: number;
    paid_orders: number;
    partial_paid_orders: number;
    payment_rate: number;
  };
  conversion_rates: { browse_to_order: number; order_to_payment: number };
}

export interface PackageAnalytics {
  popular_packages: { package_id: number; package_name: string; order_count: number; total_revenue: number }[];
  package_revenue: { package_id: number; package_name: string; revenue: number }[];
  package_trends: { package_id: number; date: string; order_count: number }[];
}

export interface LoyaltyAnalytics {
  customer_segmentation: { vip: number; gold: number; silver: number; regular: number; new: number };
  repeat_customers: { user_id: string; nickname: string; order_count: number }[];
  loyalty_trends: { period: string; total_customers: number; repeat_customers: number; loyalty_rate: number }[];
}

export const analyticsService = {
  getOverview(params?: { startDate?: string; endDate?: string }) {
    return simple.get<OverviewData>('/analytics/overview', { params });
  },

  getUserAnalytics(params?: { startDate?: string; endDate?: string }) {
    return simple.get<UserAnalytics>('/analytics/users', { params });
  },

  getBehaviorAnalytics(params?: { startDate?: string; endDate?: string }) {
    return simple.get<BehaviorAnalytics>('/analytics/behavior', { params });
  },

  getPackageAnalytics(params?: { startDate?: string; endDate?: string }) {
    return simple.get<PackageAnalytics>('/analytics/packages', { params });
  },

  getLoyaltyAnalytics(params?: { startDate?: string; endDate?: string }) {
    return simple.get<LoyaltyAnalytics>('/analytics/loyalty', { params });
  },
};
