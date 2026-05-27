import { useState, useCallback } from 'react';
import { message } from 'antd';

interface UseTableOptions {
  initialPageSize?: number;
  onError?: (error: any) => void;
}

interface TableState {
  loading: boolean;
  data: any[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  selectedRowKeys: string[];
}

export const useTable = (options: UseTableOptions = {}) => {
  const {
    initialPageSize = 20,
    onError = () => message.error('操作失败'),
  } = options;

  const [state, setState] = useState<TableState>({
    loading: false,
    data: [],
    pagination: {
      current: 1,
      pageSize: initialPageSize,
      total: 0,
    },
    selectedRowKeys: [],
  });

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  // 设置数据
  const setData = useCallback((data: any[]) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  // 设置分页
  const setPagination = useCallback((pagination: Partial<TableState['pagination']>) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, ...pagination },
    }));
  }, []);

  // 设置选中行
  const setSelectedRowKeys = useCallback((keys: string[]) => {
    setState(prev => ({ ...prev, selectedRowKeys: keys }));
  }, []);

  // 分页变化处理
  const handleTableChange = useCallback((page: number, pageSize?: number) => {
    setPagination({ current: page, pageSize: pageSize || state.pagination.pageSize });
  }, [state.pagination.pageSize, setPagination]);

  // 重置表格
  const resetTable = useCallback(() => {
    setState({
      loading: false,
      data: [],
      pagination: {
        current: 1,
        pageSize: initialPageSize,
        total: 0,
      },
      selectedRowKeys: [],
    });
  }, [initialPageSize]);

  // 刷新当前页
  const refresh = useCallback(() => {
    // 这里可以触发数据重新加载的逻辑
    // 通常在调用这个hook的组件中实现具体的数据加载逻辑
  }, []);

  // 错误处理函数
  const handleError = useCallback((error: any) => {
    onError(error);
  }, [onError]);

  return {
    // 状态
    loading: state.loading,
    data: state.data,
    pagination: state.pagination,
    selectedRowKeys: state.selectedRowKeys,
    
    // 方法
    setLoading,
    setData,
    setPagination,
    setSelectedRowKeys,
    handleTableChange,
    resetTable,
    refresh,
    handleError,
    
    // Ant Design Table 属性
    tableProps: {
      loading: state.loading,
      dataSource: state.data,
      rowKey: 'id',
      rowSelection: {
        selectedRowKeys: state.selectedRowKeys,
        onChange: setSelectedRowKeys,
      },
      pagination: {
        ...state.pagination,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total: number) => `共 ${total} 条`,
        onChange: handleTableChange,
        onShowSizeChange: handleTableChange,
      },
    },
  };
};

export default useTable;
