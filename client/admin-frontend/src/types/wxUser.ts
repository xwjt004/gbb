import { BaseEntity } from './common';

export interface WxUser extends BaseEntity {
  openid: string;
  nickname?: string;
  avatar?: string;
  gender?: number;
  phone?: string;
  realName?: string;
  birthday?: string;
  height?: number;
  weight?: number;
  zodiac?: string;
  constellation?: string;
  hundredDaysDate?: string;
  firstBirthdayDate?: string;
  graspGift?: string;
  handFootPrint?: string;
  walletPhoto?: string;
  address?: string;
  schoolName?: string;
  talent?: string;
  status: string;
  memberLevel: string;
  totalOrders: number;
  totalAmount: number;
  growthPoints: number;
  pointsBalance?: number;
  churnStatus: string;
  lastOrderAt?: string;
  lastLoginAt?: string;
  linkedUserId?: number;
  createdAt: string;
  orders?: any[];
  _count?: { orders: number };
}

export interface WxUserSearchParams {
  keyword?: string;
  nickname?: string;
  phone?: string;
  openid?: string;
  memberLevel?: string;
  churnStatus?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export interface WxUserStats {
  total: number;
  levelDistribution: { level: string; count: number }[];
}
