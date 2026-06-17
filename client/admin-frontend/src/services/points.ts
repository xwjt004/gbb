import { simple } from './api';

export interface PointsTransaction {
  id: string;
  wxUserId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance: number;
  reason: string;
  remark?: string;
  createdAt: string;
  wxUser: {
    id: string;
    nickname?: string;
    phone?: string;
    avatar?: string;
  };
}

export interface PointsTransactionQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  type?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const pointsService = {
  /** 分页查询积分交易记录 */
  getList: async (params: PointsTransactionQuery) => {
    const res: any = await simple.get('/wx-users/points-transactions', { params });
    return (res?.data || res) as PaginatedResult<PointsTransaction>;
  },

  /** 删除交易记录（自动反转余额） */
  delete: async (id: string) => {
    await simple.delete(`/wx-users/points-transactions/${id}`);
  },

  /** 更新交易备注 */
  update: async (id: string, data: { remark?: string }) => {
    await simple.patch(`/wx-users/points-transactions/${id}`, data);
  },

  /** 手动调账（正数=增加，负数=扣除） */
  addPoints: async (wxUserId: string, amount: number, reason: string, remark?: string) => {
    await simple.post(`/wx-users/${wxUserId}/points/add`, { amount, reason, remark });
  },
};
