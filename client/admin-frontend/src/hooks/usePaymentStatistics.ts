import { useState, useEffect, useCallback } from 'react';
import { paymentService } from '@/services/payments';

interface PaymentStatistics {
  totalPayments: number;
  successPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmount: number;
  todayAmount: number;
  refundAmount: number;
  conversionRate: number;
}

interface UsePaymentStatisticsOptions {
  autoFetch?: boolean;
  refreshInterval?: number; // 自动刷新间隔(毫秒),0表示不自动刷新
  filters?: {
    startDate?: string;
    endDate?: string;
    paymentType?: string;
  };
}

export interface UsePaymentStatisticsResult {
  // 统计数据
  stats: PaymentStatistics;
  loading: boolean;
  error: Error | null;
  
  // 操作方法
  fetchStats: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: UsePaymentStatisticsOptions['filters']) => void;
}

const defaultStats: PaymentStatistics = {
  totalPayments: 0,
  successPayments: 0,
  failedPayments: 0,
  pendingPayments: 0,
  totalAmount: 0,
  todayAmount: 0,
  refundAmount: 0,
  conversionRate: 0,
};

/**
 * 支付统计数据Hook
 * 
 * @example
 * ```tsx
 * const { 
 *   stats, 
 *   loading, 
 *   refresh,
 *   setFilters
 * } = usePaymentStatistics({ 
 *   autoFetch: true,
 *   refreshInterval: 30000 // 30秒自动刷新
 * });
 * ```
 */
export function usePaymentStatistics(
  options: UsePaymentStatisticsOptions = {}
): UsePaymentStatisticsResult {
  const {
    autoFetch = true,
    refreshInterval = 0,
    filters: initialFilters,
  } = options;

  // 状态管理
  const [stats, setStats] = useState<PaymentStatistics>(defaultStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState(initialFilters || {});

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.getPaymentStats(filters);
      
      // 兼容不同的数据结构
      const data = (response.data || response) as any;
      setStats({
        totalPayments: data.totalPayments || 0,
        successPayments: data.successPayments || 0,
        failedPayments: data.failedPayments || 0,
        pendingPayments: data.pendingPayments || 0,
        totalAmount: Number(data.totalAmount || 0),
        todayAmount: Number(data.todayAmount || 0),
        refundAmount: Number(data.refundAmount || 0),
        conversionRate: Number(data.conversionRate || 0),
      });
    } catch (err: any) {
      setError(err);
      console.error('获取统计数据失败:', err);
      // 失败时不显示message,保持静默
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 设置筛选条件
  const setFilters = useCallback((newFilters: UsePaymentStatisticsOptions['filters']) => {
    setFiltersState(newFilters || {});
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 自动加载数据
  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [filters, autoFetch, fetchStats]);

  // 自动刷新
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        fetchStats();
      }, refreshInterval);

      return () => clearInterval(timer);
    }
  }, [refreshInterval, fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refresh,
    setFilters,
  };
}
