import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { paymentService } from '@/services/payments';
import { Payment, PaymentSearchParams } from '@/types/payment';

interface UsePaymentSearchOptions {
  initialPage?: number;
  initialPageSize?: number;
  autoFetch?: boolean; // 是否自动加载数据
}

export interface UsePaymentSearchResult {
  // 数据状态
  payments: Payment[];
  loading: boolean;
  error: Error | null;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 搜索参数
  searchParams: PaymentSearchParams;
  
  // 操作方法
  fetchPayments: () => Promise<void>;
  setSearchParams: (params: PaymentSearchParams) => void;
  resetSearch: () => void;
  setPagination: (pagination: { current?: number; pageSize?: number }) => void;
  refresh: () => Promise<void>;
}

/**
 * 支付列表查询Hook
 * 
 * @example
 * ```tsx
 * const { 
 *   payments, 
 *   loading, 
 *   pagination, 
 *   searchParams,
 *   setSearchParams,
 *   refresh 
 * } = usePaymentSearch({ autoFetch: true });
 * ```
 */
export function usePaymentSearch(
  options: UsePaymentSearchOptions = {}
): UsePaymentSearchResult {
  const {
    initialPage = 1,
    initialPageSize = 20,
    autoFetch = true,
  } = options;

  // 状态管理
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPaginationState] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchParams, setSearchParamsState] = useState<PaymentSearchParams>({});

  // 获取支付列表
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.getPayments({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParams,
      });

      // 解构嵌套的数据结构
      const { data } = response;
      setPayments(data?.list || []);
      setPaginationState((prev) => ({
        ...prev,
        current: data?.pagination?.current || prev.current,
        pageSize: data?.pagination?.pageSize || prev.pageSize,
        total: data?.pagination?.total || 0,
      }));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '获取支付列表失败';
      setError(err);
      message.error(errorMessage);
      console.error('获取支付列表失败:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParams]);

  // 设置搜索参数 (重置到第一页)
  const setSearchParams = useCallback((params: PaymentSearchParams) => {
    setSearchParamsState(params);
    setPaginationState((prev) => ({
      ...prev,
      current: 1,
    }));
  }, []);

  // 重置搜索
  const resetSearch = useCallback(() => {
    setSearchParamsState({});
    setPaginationState({
      current: 1,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPageSize]);

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

  // 自动加载数据
  useEffect(() => {
    if (autoFetch) {
      fetchPayments();
    }
  }, [pagination.current, pagination.pageSize, searchParams, autoFetch, fetchPayments]);

  return {
    payments,
    loading,
    error,
    pagination,
    searchParams,
    fetchPayments,
    setSearchParams,
    resetSearch,
    setPagination,
    refresh,
  };
}
