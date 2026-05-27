import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Order, OrderSearchParams, OrderStats } from '@/types/order';
import { PaginatedResponse } from '@/types/common';
import { orderService } from '@/services/orders';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  stats: OrderStats | null;
  searchParams: OrderSearchParams;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  stats: null,
  searchParams: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0,
  },
  loading: false,
  error: null,
};

// 异步获取订单列表
export const fetchOrders = createAsyncThunk(
  'order/fetchOrders',
  async (params: { pagination: { current: number; pageSize: number }; searchParams: OrderSearchParams }) => {
    const response = await orderService.getOrders({
      page: params.pagination.current,
      pageSize: params.pagination.pageSize,
      ...params.searchParams,
    });
    return response.data;
  }
);

// 异步获取订单统计
export const fetchOrderStats = createAsyncThunk('order/fetchOrderStats', async () => {
  const response = await orderService.getOrderStats();
  return response.data;
});

// 异步更新订单状态
export const updateOrderStatus = createAsyncThunk(
  'order/updateOrderStatus',
  async ({ id, action }: { id: string; action: 'confirm' | 'cancel' | 'complete' }) => {
    switch (action) {
      case 'confirm':
        await orderService.confirmOrder(id);
        break;
      case 'cancel':
        await orderService.cancelOrder(id, '管理员取消');
        break;
      case 'complete':
        await orderService.completeOrder(id);
        break;
    }
    return { id, action };
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setSearchParams: (state, action: PayloadAction<OrderSearchParams>) => {
      state.searchParams = action.payload;
    },
    setPagination: (state, action: PayloadAction<Partial<typeof initialState.pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentOrder: (state, action: PayloadAction<Order>) => {
      state.currentOrder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取订单列表
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action: PayloadAction<PaginatedResponse<Order>>) => {
        state.loading = false;
        state.orders = action.payload.list || [];
        if (action.payload.pagination) {
          state.pagination = {
            current: action.payload.pagination.current || 1,
            pageSize: action.payload.pagination.pageSize || 20,
            total: action.payload.pagination.total || 0,
          };
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
  state.loading = false;
  state.orders = [];
  state.pagination.total = 0;
  state.error = action.error.message || '获取订单列表失败';
      })
      // 获取订单统计
      .addCase(fetchOrderStats.fulfilled, (state, action: PayloadAction<OrderStats>) => {
        state.stats = action.payload;
      })
      .addCase(fetchOrderStats.rejected, (state) => {
        state.stats = null;
      })
      // 更新订单状态
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { id, action: orderAction } = action.payload;
        const order = state.orders.find(o => o.id === id);
        if (order) {
          // 根据操作更新订单状态
          switch (orderAction) {
            case 'confirm':
              order.orderStatus = 'CONFIRMED' as any;
              break;
            case 'cancel':
              order.orderStatus = 'CANCELLED' as any;
              break;
            case 'complete':
              order.orderStatus = 'COMPLETED' as any;
              break;
          }
        }
      });
  },
});

export const { setSearchParams, setPagination, clearError, setCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;
