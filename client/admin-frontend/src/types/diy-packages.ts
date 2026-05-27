// 折扣规则相关类型
export interface DiscountRule {
  id: number;
  name: string;
  minAmount: number;
  maxAmount?: number;
  discountRate: number; // 0-1之间的小数，如0.98表示9.8折
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscountRuleDto {
  name: string;
  minAmount: number;
  maxAmount?: number;
  discountRate: number;
  isActive?: boolean;
}

export interface UpdateDiscountRuleDto {
  name?: string;
  minAmount?: number;
  maxAmount?: number;
  discountRate?: number;
  isActive?: boolean;
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

// DIY套系相关类型
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface SelectedItem {
  id: number;
  type: 'product' | 'service';
  name: string;
  price: number;
  quantity: number;
}

export interface DiyPackage {
  id: number;
  packageName: string;
  customerId?: number;
  customerInfo?: CustomerInfo;
  selectedItems: SelectedItem[];
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedRuleId?: number;
  appliedRuleName?: string;
  status: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiyPackageDto {
  packageName: string;
  customerId?: number;
  customerInfo?: CustomerInfo;
  selectedItems: SelectedItem[];
  originalAmount: number;
  status?: 'DRAFT' | 'CONFIRMED';
  expiresAt?: string;
}

export interface UpdateDiyPackageDto {
  packageName?: string;
  customerId?: number;
  customerInfo?: CustomerInfo;
  selectedItems?: SelectedItem[];
  originalAmount?: number;
  status?: 'DRAFT' | 'CONFIRMED' | 'ORDERED';
  expiresAt?: string;
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

// 计算价格响应
export interface CalculatePriceResponse {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedRule?: {
    id: number;
    name: string;
    discountRate: number;
  };
}
