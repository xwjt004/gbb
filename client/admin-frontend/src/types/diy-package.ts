// 折扣规则相关类型定义
export interface DiscountRule {
  id: number;
  name: string;
  minAmount: number;
  maxAmount: number;
  discountRate: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountRuleDto {
  name: string;
  minAmount: number;
  maxAmount: number;
  discountRate: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDiscountRuleDto extends Partial<CreateDiscountRuleDto> {}

export interface QueryDiscountRuleDto {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface DiscountRuleListResponse {
  list: DiscountRule[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DiscountCalculationResult {
  originalAmount: number;
  discountAmount: number;
  discountRate: number;
  savedAmount: number;
  rule: DiscountRule | null;
}

// DIY套系相关类型定义
export interface SelectedItem {
  id: number;
  type: 'product' | 'service';
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  // 可选展示字段（前端使用，不会发送到后端）
  thumbnail?: string;
  brand?: string;
  model?: string;
  categoryName?: string;
  specification?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  notes?: string;
}

export interface DiyPackage {
  id: number;
  packageName: string;
  customerId?: number;
  customerInfo?: CustomerInfo;
  selectedItems: SelectedItem[];
  originalAmount: number;
  discountAmount: number;
  discountRate: number;
  savedAmount: number;
  discountRuleId?: number;
  discountRule?: DiscountRule;
  status: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  // 订单统计信息
  orderCount?: number;
  totalSalesAmount?: number;
}

export interface CreateDiyPackageDto {
  packageName: string;
  customerId?: number;
  customerInfo?: CustomerInfo;
  selectedItems: SelectedItem[];
  originalAmount: number;
  expiresAt?: string;
}

export interface UpdateDiyPackageDto extends Partial<CreateDiyPackageDto> {
  status?: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
}

export interface QueryDiyPackageDto {
  keyword?: string;
  customerId?: number;
  status?: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
  page?: number;
  pageSize?: number;
}

export interface DiyPackageListResponse {
  list: DiyPackage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PricingPreviewRequest {
  selectedItems: SelectedItem[];
  originalAmount: number;
}

export interface PricingPreviewResponse {
  selectedItems: SelectedItem[];
  originalAmount: number;
  discountAmount: number;
  discountRate: number;
  savedAmount: number;
  appliedRule: DiscountRule | null;
}
