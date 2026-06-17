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

export interface PackageProductItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    productNo?: string;
    specification?: string;
    unit: string;
    salePrice: number;
    images?: any;
  };
}

export interface PackageServiceItem {
  id: number;
  serviceId: number;
  quantity: number;
  service: {
    id: number;
    name: string;
    category: string;
    basePrice: number;
    images?: any;
  };
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
  packageProducts?: PackageProductItem[];
  packageServices?: PackageServiceItem[];
  groupMinCount?: number;
  groupPrice?: number;
  groupBuyDescription?: string;
  posterTitle?: string;
  posterContent?: string;
  posterBackground?: string;
  posterImages?: string[];
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
  groupMinCount?: number;
  groupPrice?: number;
  groupBuyDescription?: string;
  posterTitle?: string;
  posterContent?: string;
  posterBackground?: string;
  posterImages?: string[];
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
