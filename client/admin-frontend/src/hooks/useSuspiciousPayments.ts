import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { paymentService } from '@/services/payments';

interface UseSuspiciousPaymentsOptions {
  initialPage?: number;
  initialPageSize?: number;
  autoFetch?: boolean;
  autoRefresh?: boolean; // 是否自动轮询
  refreshInterval?: number; // 轮询间隔(毫秒)
  defaultType?: string; // 默认类型筛选
  defaultSeverity?: string; // 默认严重程度筛选
}

interface SuspiciousPaymentSearchParams {
  type?: string; // all | duplicate | overpayment | system_error
  severity?: string; // low | medium | high
}

interface SuspiciousPayment {
  id: string;
  paymentId: string;
  type: string;
  severity: string;
  reason: string;
  detectedAt: string;
  resolvedAt?: string;
  resolved: boolean;
  notes?: string;
  [key: string]: any;
}

export interface UseSuspiciousPaymentsResult {
  // 数据状态
  payments: SuspiciousPayment[];
  loading: boolean;
  error: Error | null;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 搜索参数
  searchParams: SuspiciousPaymentSearchParams;
  
  // 轮询状态
  isAutoRefreshing: boolean;
  
  // 操作方法
  fetchPayments: () => Promise<void>;
  setSearchParams: (params: SuspiciousPaymentSearchParams) => void;
  resetSearch: () => void;
  setPagination: (pagination: { current?: number; pageSize?: number }) => void;
  refresh: () => Promise<void>;
  resolvePayment: (paymentId: string, notes?: string) => Promise<void>;
  
  // 轮询控制
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

/**
 * 可疑支付列表查询Hook
 * 
 * @example
 * ```tsx
 * const { 
 *   payments, 
 *   loading, 
 *   pagination,
 *   searchParams,
 *   setSearchParams,
 *   resolvePayment,
 *   isAutoRefreshing,
 *   startAutoRefresh,
 *   stopAutoRefresh
 * } = useSuspiciousPayments({ 
 *   autoFetch: true,
 *   autoRefresh: true,
 *   refreshInterval: 60000 // 60秒
 * });
 * ```
 */
export function useSuspiciousPayments(
  options: UseSuspiciousPaymentsOptions = {}
): UseSuspiciousPaymentsResult {
  const {
    initialPage = 1,
    initialPageSize = 10,
    autoFetch = true,
    autoRefresh = false,
    refreshInterval = 60000, // 默认60秒
    defaultType,
    defaultSeverity,
  } = options;

  // 状态管理
  const [payments, setPayments] = useState<SuspiciousPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPaginationState] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchParams, setSearchParamsState] = useState<SuspiciousPaymentSearchParams>({
    ...(defaultType && { type: defaultType }),
    ...(defaultSeverity && { severity: defaultSeverity }),
  });
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);

  // 使用ref存储定时器ID
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取可疑支付列表
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.getSuspiciousPayments({
        page: pagination.current,
        limit: pagination.pageSize,
        ...searchParams,
      } as any);

      // 解构嵌套数据结构
      const data = (response.data || response) as any;
      setPayments(data?.list || data || []);
      setPaginationState((prev) => ({
        ...prev,
        total: data?.pagination?.total || 0,
      }));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '获取可疑支付列表失败';
      setError(err);
      message.error(errorMessage);
      console.error('获取可疑支付列表失败:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParams]);

  // 设置搜索参数 (重置到第一页)
  const setSearchParams = useCallback((params: SuspiciousPaymentSearchParams) => {
    setSearchParamsState(params);
    setPaginationState((prev) => ({
      ...prev,
      current: 1,
    }));
  }, []);

  // 重置搜索
  const resetSearch = useCallback(() => {
    setSearchParamsState({
      ...(defaultType && { type: defaultType }),
      ...(defaultSeverity && { severity: defaultSeverity }),
    });
    setPaginationState({
      current: 1,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPageSize, defaultType, defaultSeverity]);

  // 设置分页
  const setPagination = useCallback((newPagination: { current?: number; pageSize?: number }) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
    }));
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchPayments();
  }, [fetchPayments]);

  // 标记已解决
  const resolvePayment = useCallback(async (paymentId: string, notes?: string) => {
    try {
      await paymentService.resolveSuspiciousPayment(paymentId, notes);
      message.success('已标记为已解决');
      await refresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '标记失败';
      message.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // 启动自动刷新
  const startAutoRefresh = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsAutoRefreshing(true);
    timerRef.current = setInterval(() => {
      fetchPayments();
    }, refreshInterval);
  }, [fetchPayments, refreshInterval]);

  // 停止自动刷新
  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAutoRefreshing(false);
  }, []);

  // 自动加载数据
  useEffect(() => {
    if (autoFetch) {
      fetchPayments();
    }
  }, [pagination.current, pagination.pageSize, searchParams, autoFetch, fetchPayments]);

  // 处理自动刷新
  useEffect(() => {
    if (isAutoRefreshing) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    // 组件卸载时清理定时器
    return () => {
      stopAutoRefresh();
    };
  }, [isAutoRefreshing, startAutoRefresh, stopAutoRefresh]);

  return {
    payments,
    loading,
    error,
    pagination,
    searchParams,
    isAutoRefreshing,
    fetchPayments,
    setSearchParams,
    resetSearch,
    setPagination,
    refresh,
    resolvePayment,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
