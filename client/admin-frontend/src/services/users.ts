import { request, simple } from './api';
import type { User, UserStats, UserSearchParams } from '../types/user';
import type { PaginationParams, PaginatedResponse } from '../types/common';
import * as XLSX from 'xlsx';

// 后端返回的用户基本结构 (根据当前 Nest 用户列表 select 字段)
interface BackendUserItem {
  id: number;  // 添加数字ID字段
  openid: string;
  nickname?: string | null;
  avatar?: string | null;
  phone?: string | null;
  status?: string | null; // 后端: 'ACTIVE' | 'INACTIVE'
  createdAt: string;
  updatedAt?: string;
  _count?: { orders: number };
}

// 将后端用户数据映射到前端 User 类型 (前端 User 定义了许多当前后端未提供的统计字段, 先填充默认值)
function mapUser(u: BackendUserItem): User {
  const backendStatus = (u.status || 'ACTIVE').toUpperCase();
  // 前端 Status 枚举是小写, 做一次映射
  const statusMap: Record<string, any> = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    DELETED: 'deleted',
  };
  
  const orderCount = u._count?.orders || 0;
  const isVipUser = orderCount >= 3; // VIP判断逻辑：订单数量>=3
  
  return {
    id: String(u.id),  // 使用后端返回的数字ID并转换为字符串
    openid: u.openid,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt || u.createdAt,
    phone: u.phone || '',
    nickname: u.nickname || undefined,
    avatar: u.avatar || undefined,
    status: statusMap[backendStatus] || 'active',
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
    // 构建查询参数
    const queryParams: any = {
      page: params.page,
      limit: params.pageSize,
    };
    
    // 添加搜索参数
    if (params.phone) queryParams.phone = params.phone;
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.wechatId) queryParams.wechatId = params.wechatId;
    if (params.status) queryParams.status = params.status;
    if (params.isVip !== undefined) queryParams.isVip = params.isVip;
    if (params.startDate) queryParams.startDate = params.startDate;
    if (params.endDate) queryParams.endDate = params.endDate;
    
    console.log('用户列表API参数:', queryParams);
    
    const root = await simple.get<any>(
      '/users',
      { params: queryParams }
    );
    
    const backendContainer = root.data ? root.data : root; // 兼容 { code,message,data } 或直接 data
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

  // 创建用户 (实际项目中实现)
  createUser: async (data: Partial<User>): Promise<{ data: User }> => {
  const root = await simple.post<any>('/users', data);
  const userData = root.data ? root.data : root;
  return { data: userData as User };
  },

  // 更新用户 (实际项目中实现)
  updateUser: async (id: string, data: Partial<User>): Promise<{ data: User }> => {
  const response = await request.patch<User>(`/users/${id}`, data); // 保留原方式（乐观写操作可额外处理）
  return { data: response.data.data };
  },

  // 删除用户 (实际项目中实现)
  deleteUser: async (id: string): Promise<{ data: boolean }> => {
  const response = await request.delete<any>(`/users/${id}`);
    // 后端删除成功格式: { code: 200, message: '删除成功' }
    return { data: response.data.data === undefined ? true : response.data.data };
  },

  // 切换用户状态
  toggleUserStatus: async (id: string): Promise<{ data: { openid: string; status: string } }> => {
  const response = await request.patch(`/users/${id}/toggle-status`);
  return { data: response.data.data };
  },

  // 批量删除用户 (实际项目中实现)
  batchDeleteUsers: async (ids: string[]): Promise<{ data: boolean }> => {
    // 后端暂未实现批量删除; 这里并行调用单个删除 (有序串行保证, 如需性能可 Promise.all)
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
      
      // 从响应中获取数据
      const exportData = response.data.data;
      
      if (Array.isArray(exportData) && exportData.length > 0) {
        // 后端已经返回了中文字段名的数据，直接处理
        const processedData = exportData.map(row => {
          const processedRow: any = { ...row };
          
          // 添加缺失的字段，设置默认值
          if (!processedRow['微信ID']) processedRow['微信ID'] = '';
          if (!processedRow['VIP状态']) processedRow['VIP状态'] = '否';
          if (!processedRow['VIP等级']) processedRow['VIP等级'] = '';
          if (!processedRow['消费总额']) processedRow['消费总额'] = 0;
          if (!processedRow['最后登录']) processedRow['最后登录'] = '';
          
          // 状态中文化
          if (processedRow['状态']) {
            const statusMapping: { [key: string]: string } = {
              'active': '活跃',
              'inactive': '未激活',
              'pending': '待审核',
              'deleted': '已删除'
            };
            processedRow['状态'] = statusMapping[processedRow['状态']] || processedRow['状态'];
          }
          
          return processedRow;
        });

        // 创建工作簿
        const ws = XLSX.utils.json_to_sheet(processedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '用户数据');

        // 设置列宽
        const headers = Object.keys(processedData[0] || {});
        const colWidths = headers.map(header => ({ wch: Math.max(header.length * 2, 10) }));
        ws['!cols'] = colWidths;

        // 生成Excel文件
        const fileName = `用户数据_${new Date().toISOString().split('T')[0]}.xlsx`;
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
