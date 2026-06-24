import { request, simple } from './api';
import type { User, UserStats, UserSearchParams } from '../types/user';
import type { PaginationParams, PaginatedResponse } from '../types/common';
import * as XLSX from 'xlsx';

// 后端返回的用户基本结构 (根据当前 Nest 用户列表 select 字段)
interface BackendUserItem {
  id: number;
  openid: string;
  username?: string | null;
  nickname?: string | null;
  realName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  education?: string | null;
  address?: string | null;
  skills?: string | null;
  workHistory?: string | null;
  avatar?: string | null;
  phone?: string | null;
  wechatOfficialId?: string | null;
  remarks?: string | null;
  status?: string | null;
  role?: { id: number; name: string } | null;
  userRoles?: { role: { id: number; name: string } }[];
  createdAt: string;
  updatedAt?: string;
  _count?: { orders: number };
}

// 将后端用户数据映射到前端 User 类型
function mapUser(u: BackendUserItem): User {
  const backendStatus = (u.status || 'ACTIVE').toUpperCase();
  const statusMap: Record<string, any> = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    DELETED: 'deleted',
  };

  const orderCount = u._count?.orders || 0;
  const isVipUser = orderCount >= 3;

  // 从 userRoles 中提取角色信息
  const roleNames = u.userRoles?.map(ur => ur.role.name) || [];
  const roleIds = u.userRoles?.map(ur => ur.role.id) || [];
  // 兼容旧的单角色字段
  if (u.role && !roleNames.length) {
    roleNames.push(u.role.name);
    roleIds.push(u.role.id);
  }

  return {
    id: String(u.id),
    openid: u.openid,
    username: u.username || undefined,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt || u.createdAt,
    phone: u.phone || '',
    nickname: u.nickname || undefined,
    realName: u.realName || undefined,
    gender: u.gender || undefined,
    birthDate: u.birthDate || undefined,
    education: u.education || undefined,
    address: u.address || undefined,
    skills: u.skills || undefined,
    workHistory: u.workHistory || undefined,
    avatar: u.avatar || undefined,
    wechatOfficialId: u.wechatOfficialId || undefined,
    remarks: u.remarks || undefined,
    status: statusMap[backendStatus] || 'active',
    roleNames,
    roleIds,
    lastLoginAt: undefined,
    orderCount: orderCount,
    totalAmount: 0,
    isVip: isVipUser,
    vipLevel: isVipUser ? 1 : undefined,
    tags: [],
    wechatId: undefined,
  };
}

export const userService = {
  // 获取用户列表
  getUsers: async (params: PaginationParams & UserSearchParams): Promise<{ data: PaginatedResponse<User> }> => {
    const queryParams: any = {
      page: params.page,
      limit: params.pageSize,
    };

    if (params.phone) queryParams.phone = params.phone;
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.realName) queryParams.realName = params.realName;
    if (params.username) queryParams.username = params.username;
    if (params.wechatId) queryParams.wechatId = params.wechatId;
    if (params.status) queryParams.status = params.status;
    if (params.isVip !== undefined) queryParams.isVip = params.isVip;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;

    const root = await simple.get<any>(
      '/users',
      { params: queryParams }
    );

    const backendContainer = root.data ? root.data : root;
    const backend = backendContainer;
    const list = (backend?.users || []).map(mapUser);

    return {
      data: {
        list,
        pagination: {
          current: backend?.pagination.page || params.page,
          pageSize: backend?.pagination.limit || params.pageSize,
          total: backend?.pagination.total || 0,
        },
      },
    };
  },

  // 获取用户详情
  getUserById: async (id: string): Promise<{ data: User }> => {
    const root = await simple.get<any>(`/users/${id}`);
    const backendUser = (root.data ? root.data : root) as BackendUserItem;
    return { data: mapUser(backendUser) };
  },

  // 获取用户统计
  getUserStats: async (): Promise<{ data: UserStats }> => {
    const root = await simple.get<any>('/users/statistics/global');
    const stats = root.data ? root.data : root;
    return {
      data: {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        newUsersToday: stats.newUsersToday,
        vipUsers: stats.vipUsers,
        growthRate: stats.growthRate,
      },
    };
  },

  // 创建用户
  createUser: async (data: Partial<User>): Promise<{ data: User }> => {
    const root = await simple.post<any>('/users', data);
    const userData = root.data ? root.data : root;
    return { data: userData as User };
  },

  // 更新用户
  updateUser: async (id: string, data: Partial<User>): Promise<{ data: User }> => {
    const response = await request.patch<User>(`/users/${id}`, data);
    return { data: response.data.data };
  },

  // 删除用户
  deleteUser: async (id: string): Promise<{ data: boolean }> => {
    const response = await request.delete<any>(`/users/${id}`);
    return { data: response.data.data === undefined ? true : response.data.data };
  },

  // 切换用户状态
  toggleUserStatus: async (id: string): Promise<{ data: { openid: string; status: string } }> => {
    const response = await request.patch(`/users/${id}/toggle-status`);
    return { data: response.data.data };
  },

  // 批量删除用户
  batchDeleteUsers: async (ids: string[]): Promise<{ data: boolean }> => {
    for (const id of ids) {
      await userService.deleteUser(id);
    }
    return { data: true };
  },

  // 导出用户数据
  exportUsers: async (params: UserSearchParams): Promise<void> => {
    try {
      const response = await request.get('/users/export', {
        params,
        responseType: 'json'
      });

      const exportData = response.data.data;

      if (Array.isArray(exportData) && exportData.length > 0) {
        const processedData = exportData.map(row => {
          const processedRow: any = { ...row };

          if (!processedRow['管理角色']) processedRow['管理角色'] = '';
          if (processedRow['状态']) {
            const statusMapping: { [key: string]: string } = {
              'active': '正常',
              'inactive': '禁用',
              'pending': '待审核',
              'deleted': '已删除'
            };
            processedRow['状态'] = statusMapping[processedRow['状态']] || processedRow['状态'];
          }

          return processedRow;
        });

        const ws = XLSX.utils.json_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '员工数据');

        const headers = Object.keys(processedData[0] || {});
        const colWidths = headers.map(header => ({ wch: Math.max(header.length * 2, 10) }));
        ws['!cols'] = colWidths;

        const fileName = `员工数据_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

      } else {
        throw new Error('没有数据可导出');
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },
};
