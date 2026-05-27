import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { refundService, RefundRequest } from '@/services/refundService';

interface UseRefundRequestsOptions {
  initialPage?: number;
  initialPageSize?: number;
  autoFetch?: boolean;
  defaultStatus?: string; // 默认状态筛选
}

interface RefundSearchParams {
  orderNo?: string;
  refundNo?: string;
  status?: string;
  refundType?: string;
  startDate?: string;
  endDate?: string;
}

export interface UseRefundRequestsResult {
  // 数据状态
  refunds: RefundRequest[];
  loading: boolean;
  error: Error | null;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 搜索参数
  searchParams: RefundSearchParams;
  
  // 操作方法
  fetchRefunds: () => Promise<void>;
  setSearchParams: (params: RefundSearchParams) => void;
  resetSearch: () => void;
  setPagination: (pagination: { current?: number; pageSize?: number }) => void;
  refresh: () => Promise<void>;
  
  // 退款操作
  approveRefund: (id: string, notes?: string) => Promise<void>;
  rejectRefund: (id: string, reason: string) => Promise<void>;
  processRefund: (id: string, data: any) => Promise<void>;
  cancelRefund: (id: string, reason: string) => Promise<void>;
}

/**
 * 退款请求列表查询Hook
 * 
 * @example
 * ```tsx
 * const { 
 *   refunds, 
 *   loading, 
 *   pagination,
 *   searchParams,
 *   setSearchParams,
 *   approveRefund,
 *   refresh 
 * } = useRefundRequests({ 
 *   autoFetch: true,
 *   defaultStatus: 'PENDING'
 * });
 * ```
 */
export function useRefundRequests(
  options: UseRefundRequestsOptions = {}
): UseRefundRequestsResult {
  const {
    initialPage = 1,
    initialPageSize = 10,
    autoFetch = true,
    defaultStatus,
  } = options;

  // 状态管理
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPaginationState] = useState({
    current: initialPage,
    pageSize: initialPageSize,
    total: 0,
  });
  const [searchParams, setSearchParamsState] = useState<RefundSearchParams>(
    defaultStatus ? { status: defaultStatus } : {}
  );

  // 获取退款列表
  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await refundService.getRefundRequests({
        page: pagination.current,
        limit: pagination.pageSize,
        ...searchParams,
      } as any);

      setRefunds(result.data || []);
      setPaginationState((prev) => ({
        ...prev,
        total: result.total || 0,
      }));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '获取退款列表失败';
      setError(err);
      message.error(errorMessage);
      console.error('获取退款列表失败:', err);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchParams]);

  // 设置搜索参数 (重置到第一页)
  const setSearchParams = useCallback((params: RefundSearchParams) => {
    setSearchParamsState(params);
    setPaginationState((prev) => ({
      ...prev,
      current: 1,
    }));
  }, []);

  // 重置搜索
  const resetSearch = useCallback(() => {
    setSearchParamsState(defaultStatus ? { status: defaultStatus } : {});
    setPaginationState({
      current: 1,
      pageSize: initialPageSize,
      total: 0,
    });
  }, [initialPageSize, defaultStatus]);

  // 设置分页
  const setPagination = useCallback((newPagination: { current?: number; pageSize?: number }) => {
    setPaginationState((prev) => ({
      ...prev,
      ...newPagination,
    }));
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    await fetchRefunds();
  }, [fetchRefunds]);

  // 审批通过
  const approveRefund = useCallback(async (id: string, notes?: string) => {
    try {
      await refundService.approveRefundRequest(id, { notes: notes || '' });
      message.success('审批通过');
      await refresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '审批操作失败';
      message.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // 拒绝退款
  const rejectRefund = useCallback(async (id: string, reason: string) => {
    try {
      await refundService.rejectRefundRequest(id, { rejectReason: reason });
      message.success('已拒绝退款申请');
      await refresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '拒绝操作失败';
      message.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // 执行退款
  const processRefund = useCallback(async (id: string, data: any) => {
    try {
      // 使用executeRefund方法(如果存在)
      if ((refundService as any).executeRefund) {
        await (refundService as any).executeRefund(id, data);
      } else {
        // 降级为直接调用API
        message.warning('执行退款功能暂未实现');
        return;
      }
      message.success('退款处理成功');
      await refresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '退款处理失败';
      message.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // 取消退款
  const cancelRefund = useCallback(async (id: string, _reason: string) => {
    try {
      await refundService.cancelRefundRequest(id);
      message.success('已取消退款申请');
      await refresh();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '取消操作失败';
      message.error(errorMessage);
      throw err;
    }
  }, [refresh]);

  // 自动加载数据
  useEffect(() => {
    if (autoFetch) {
      fetchRefunds();
    }
  }, [pagination.current, pagination.pageSize, searchParams, autoFetch, fetchRefunds]);

  return {
    refunds,
    loading,
    error,
    pagination,
    searchParams,
    fetchRefunds,
    setSearchParams,
    resetSearch,
    setPagination,
    refresh,
    approveRefund,
    rejectRefund,
    processRefund,
    cancelRefund,
  };
}
