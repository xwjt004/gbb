import { BaseEntity, Status } from './common';

export interface User extends BaseEntity {
  openid: string;
  phone: string;
  nickname?: string;
  wechatId?: string;
  avatar?: string;
  status: Status;
  roleName?: string;
  lastLoginAt?: string;
  orderCount: number;
  totalAmount: number;
  isVip: boolean;
  vipLevel?: number;
  tags?: string[];
}

export interface UserSearchParams {
  phone?: string;
  nickname?: string;
  wechatId?: string;
  fuzzy?: string;
  status?: Status;
  isVip?: boolean;
  startDate?: string;
  endDate?: string;
  keyword?: string; // 综合搜索关键词
}

export interface UserFormData {
  openid?: string;
  phone: string;
  nickname?: string;
  wechatId?: string;
  avatar?: string;
  status: Status;
  isVip: boolean;
  vipLevel?: number;
  tags?: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  vipUsers: number;
  growthRate: number;
}
