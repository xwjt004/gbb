import { BaseEntity, Status } from './common';

export interface PackageCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  status: string;
}

export interface Package extends BaseEntity {
  name: string;
  description: string;
  price: number;
  deposit?: number;
  originalPrice?: number;
  duration: number; // 服务时长（分钟）
  services: string[]; // 服务内容
  images: string[];
  status: Status;
  isPopular: boolean;
  orderCount: number;
  rating: number;
  tags: string[];
  category: string; // 文本分类（兼容旧数据）
  categoryId?: number; // 分类ID（关联到分类表）
  packageCategory?: PackageCategory; // 分类详情（从后端返回）
  maxBookings: number; // 最大预订数量
}

export interface PackageSearchParams {
  name?: string;
  status?: Status;
  category?: string;
  categoryId?: number; // 新增：按分类ID筛选
  minPrice?: number;
  maxPrice?: number;
  isPopular?: boolean;
}

export interface PackageFormData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  duration: number;
  services: string[];
  images: string[];
  status: Status;
  isPopular: boolean;
  tags: string[];
  category: string;
  maxBookings: number;
}

export interface PackageStats {
  totalPackages: number;
  activePackages: number;
  popularPackages: number;
  avgPrice: number;
  totalBookings: number;
  topSellingPackage: {
    name: string;
    bookings: number;
  };
}
