import { simple } from './api';

export interface GroupBuyActivity {
  id: string;
  packageId: number;
  creatorUserId: string;
  minCount: number;
  status: 'ACTIVE' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  expiredAt: string;
  package: {
    id: number;
    name: string;
    price: number;
    groupPrice?: number;
    images: string[];
  };
  creator: {
    id: string;
    nickname?: string;
    avatar?: string;
    phone?: string;
  };
  _count: {
    participants: number;
  };
  paidCount: number;
  unpaidCount: number;
}

export interface GroupBuyQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export const groupBuyService = {
  /** 分页查询团购列表（后台管理） */
  getList: async (params: GroupBuyQuery) => {
    const res: any = await simple.get('/group-buy/admin/list', { params });
    return (res?.data || res) as {
      items: GroupBuyActivity[];
      pagination: { page: number; limit: number; total: number };
    };
  },

  /** 取消团购（后台管理） */
  cancel: async (id: string) => {
    const res: any = await simple.patch(`/group-buy/admin/${id}/cancel`);
    return res;
  },

  /** 删除团购（后台管理） */
  delete: async (id: string) => {
    const res: any = await simple.delete(`/group-buy/admin/${id}`);
    return res;
  },

  /** 手动创建团购（后台管理） */
  create: async (data: { packageId: number; creatorUserId: string; minCount?: number }) => {
    const res: any = await simple.post('/group-buy/admin/create', data);
    return res;
  },

  /** 编辑团购（后台管理） */
  update: async (id: string, data: { minCount?: number; expiredAt?: string }) => {
    const res: any = await simple.patch(`/group-buy/admin/${id}`, data);
    return res;
  },

  /** 恢复已撤销的团购（后台管理） */
  restore: async (id: string) => {
    const res: any = await simple.patch(`/group-buy/admin/${id}/restore`);
    return res;
  },
};
