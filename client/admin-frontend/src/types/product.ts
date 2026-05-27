/**
 * 商品管理相关类型定义
 */

// ==================== 商品分类 ====================

export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface CreateProductCategoryDto {
  name: string;
  code: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateProductCategoryDto {
  name?: string;
  code?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ProductCategoryQueryDto {
  name?: string;
  code?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductCategoryListResponse {
  list: ProductCategory[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 商品 ====================

export interface Product {
  id: number;
  productNo: string;
  name: string;
  categoryId: number;
  category?: ProductCategory;
  description?: string;
  specification?: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  marketPrice?: number;
  stockQuantity: number;
  lowStock: number;
  isTrackStock?: boolean;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  attributes?: any;
  status?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  images?: string[];
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  productNo: string;
  name: string;
  categoryId: number;
  description?: string;
  specification?: string;
  unit?: string;
  costPrice?: number;
  salePrice: number;
  marketPrice?: number;
  stockQuantity?: number;
  lowStock?: number;
  isTrackStock?: boolean;
  minStock?: number;
  maxStock?: number;
  attributes?: any;
  status?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  images?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductDto {
  productNo?: string;
  name?: string;
  categoryId?: number;
  description?: string;
  specification?: string;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
  marketPrice?: number;
  stockQuantity?: number;
  lowStock?: number;
  isTrackStock?: boolean;
  minStock?: number;
  maxStock?: number;
  attributes?: any;
  status?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  images?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductQueryDto {
  name?: string;
  productNo?: string;
  categoryId?: number;
  supplierId?: number;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  list: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductStatistics {
  total: number;
  active: number;
  inactive: number;
  lowStock: number;
  outOfStock: number;
}

export interface UpdateStockDto {
  productId: number;
  operation: 'ADD' | 'SUBTRACT' | 'SET';
  quantity: number;
  reason?: string;
}

export interface BatchUpdateStatusDto {
  productIds: number[];
  isActive: boolean;
}

// ==================== 服务项目 ====================

export interface ServiceItem {
  id: number;
  serviceNo: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  unit: string;
  duration?: number;
  requiresBooking: boolean;
  maxCapacity?: number;
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceItemDto {
  serviceNo: string;
  name: string;
  category: string;
  description?: string;
  basePrice: number;
  unit?: string;
  duration?: number;
  requiresBooking?: boolean;
  maxCapacity?: number;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateServiceItemDto {
  serviceNo?: string;
  name?: string;
  category?: string;
  description?: string;
  basePrice?: number;
  unit?: string;
  duration?: number;
  requiresBooking?: boolean;
  maxCapacity?: number;
  images?: string[];
  isActive?: boolean;
}

export interface ServiceItemQueryDto {
  name?: string;
  serviceNo?: string;
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

export interface ServiceItemListResponse {
  list: ServiceItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceItemStatistics {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<string, number>;
}
