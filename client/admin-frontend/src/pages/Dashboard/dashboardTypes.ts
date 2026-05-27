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
  lastMonth: {
    orders: number;
    revenue: number;
    refunds: number;
    suspiciousPayments: number;
  };
}

export interface TrendData {
  date: string;
  orderCount: number;
  revenue: number;
  refundAmount: number;
  paidAmount: number;
}

export interface SuspiciousPayment {
  id: string;
  orderId: string;
  amount: number;
  createdAt: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
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
    percentage: number;
  }>;
  trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}
