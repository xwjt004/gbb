export interface TrendData {
  date: string;
  orderCount: number;
  revenue: number;
  refundAmount: number;
  paidAmount: number;
}

export interface RevenueAnalysis {
  dimension: string;
  total: number;
  breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
}

export interface SuspiciousPayment {
  id: string;
  orderId: string;
  amount: number;
  createdAt: string;
  issue: 'duplicate' | 'overpayment' | 'system_error';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface RefundAnalysis {
  summary: {
    totalRefunds: number;
    totalAmount: number;
    refundRate: number;
    avgRefundAmount: number;
  };
  byReason: Array<{
    reason: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export interface DailyReconciliation {
  date: string;
  platform: string;
  summary: {
    totalOrders: number;
    systemAmount: number;
    platformAmount: number;
    difference: number;
    matched: boolean;
  };
  details: Array<{
    platform: string;
    orderCount: number;
    systemAmount: number;
    platformAmount: number;
    difference: number;
    status: string;
  }>;
}

export interface MissingVouchers {
  summary: {
    totalPayments: number;
    missingVouchers: number;
    missingRate: number;
  };
  missingList: Array<{
    paymentId: string;
    orderId: string;
    amount: number;
    platform: string;
    paymentTime: string;
    reason: string;
  }>;
}

export interface DashboardStats {
  today: {
    orders: number;
    revenue: number;
    refunds: number;
    suspiciousPayments: number;
  };
  thisMonth: {
    orders: number;
    revenue: number;
    refunds: number;
    suspiciousPayments: number;
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    count: number;
  }>;
  recentActivity: Array<{
    time: string;
    action: string;
    target: string;
    amount: number;
  }>;
}

export interface RevenuePrediction {
  period: 'week' | 'month' | 'quarter';
  predictions: Array<{
    date: string;
    predictedRevenue: number;
    confidence: number;
  }>;
  totalPredicted: number;
  avgConfidence: number;
}

export interface ComprehensiveTrendData {
  date: string;
  revenue: number;
  orderCount: number;
  paidAmount: number;
  refundAmount: number;
  avgOrderValue: number;
  conversionRate: number;
}

export interface ComparativeAnalysis {
  current: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
    refunds: number;
    refundRate: number;
  };
  previous: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
    refunds: number;
    refundRate: number;
  };
  comparison: {
    ordersGrowth: string;
    revenueGrowth: string;
    avgOrderValueGrowth: string;
    refundRateChange: string;
  };
}
