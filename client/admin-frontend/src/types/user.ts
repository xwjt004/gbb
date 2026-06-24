import { BaseEntity, Status } from './common';

export interface User extends BaseEntity {
  openid: string;
  username?: string;
  phone: string;
  nickname?: string;
  realName?: string;
  gender?: string;
  birthDate?: string;
  education?: string;
  address?: string;
  skills?: string;
  workHistory?: string;
  wechatId?: string;
  wechatOfficialId?: string;
  remarks?: string;
  avatar?: string;
  status: Status;
  roleIds?: number[];
  roleNames?: string[];
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
  realName?: string;
  username?: string;
  wechatId?: string;
  fuzzy?: string;
  status?: Status;
  isVip?: boolean;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export interface UserFormData {
  username?: string;
  password?: string;
  phone: string;
  nickname?: string;
  realName?: string;
  gender?: string;
  birthDate?: string;
  education?: string;
  address?: string;
  skills?: string;
  workHistory?: string;
  wechatOfficialId?: string;
  remarks?: string;
  wechatId?: string;
  avatar?: string;
  status: Status;
  roleIds?: number[];
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
