import { request } from './api';

// 供应商类型
export type SupplierType = 'PRODUCT' | 'SERVICE' | 'BOTH';
// 状态
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLIST';
// 信用等级
export type CreditLevel = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface Supplier {
  id: string;
  supplierNo: string;
  name: string;
  shortName?: string;
  legalPerson?: string;
  contactPerson: string;
  contactPhone: string;
  telephone?: string;
  contactEmail?: string;
  address?: string;
  wechatId?: string;
  douyinId?: string;
  kuaishouId?: string;
  xiaohongshuId?: string;
  businessLicense?: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  supplierType: SupplierType;
  category?: string;
  businessScope?: string;
  status: SupplierStatus;
  creditLevel?: CreditLevel;
  paymentTerms?: string;
  deliveryDays?: number;
  minOrderAmount?: number;
  rating?: number;
  totalOrders: number;
  totalAmount: number;
  remark?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  _count?: { purchaseOrders: number };
  purchaseOrders?: Array<{
    id: string;
    purchaseNo: string;
    purchaseDate: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

export interface CreateSupplierDto {
  name: string;
  shortName?: string;
  legalPerson?: string;
  contactPerson: string;
  contactPhone: string;
  telephone?: string;
  contactEmail?: string;
  address?: string;
  wechatId?: string;
  douyinId?: string;
  kuaishouId?: string;
  xiaohongshuId?: string;
  businessLicense?: string;
  taxId?: string;
  bankAccount?: string;
  bankName?: string;
  supplierType?: SupplierType; // 默认 PRODUCT
  category?: string;
  businessScope?: string;
  status?: SupplierStatus; // 默认 ACTIVE
  creditLevel?: CreditLevel; // 默认 B
  paymentTerms?: string;
  deliveryDays?: number; // 默认 7
  minOrderAmount?: number; // 默认 0
  remark?: string;
  createdBy?: number;
}

export interface UpdateSupplierDto extends Partial<CreateSupplierDto> {}

export interface QuerySupplierParams {
  supplierNo?: string;
  name?: string;
  contactPerson?: string;
  contactPhone?: string;
  supplierType?: SupplierType;
  category?: string;
  status?: SupplierStatus;
  creditLevel?: CreditLevel;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierListResult {
  list: Supplier[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface RateSupplierDto {
  supplierId: string;
  rating: number; // 1-5
  remark?: string;
}

export interface SupplierStatistics {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
    blacklist: number;
  };
  byType: Array<{ type: SupplierType; count: number }>;
  byCredit: Array<{ level: CreditLevel; count: number }>;
}

export interface SupplierRatingHistoryItem {
  id: string;
  supplierId: string;
  rating: number;
  remark?: string;
  createdAt: string;
}

export interface RatingHistoryQuery {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface RatingHistoryResult {
  list: SupplierRatingHistoryItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

class SupplierService {
  // 创建
  async create(data: CreateSupplierDto): Promise<Supplier> {
    const res = await request.post('/supplier', data);
    return res.data.data || res.data;
  }

  // 查询列表
  async getList(params: QuerySupplierParams): Promise<SupplierListResult> {
    const res = await request.get('/supplier', { params });
    const data = res.data.data || res.data;
    return data;
  }

  // 详情
  async getById(id: string): Promise<Supplier> {
    const res = await request.get(`/supplier/${id}`);
    return res.data.data || res.data;
  }

  // 更新
  async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
    const res = await request.patch(`/supplier/${id}`, data);
    return res.data.data || res.data;
  }

  // 删除
  async remove(id: string): Promise<void> {
    await request.delete(`/supplier/${id}`);
  }

  // 状态更新(指定状态)
  async updateStatus(id: string, status: SupplierStatus): Promise<Supplier> {
    const res = await request.put(`/supplier/${id}/status`, { status });
    return res.data.data || res.data;
  }

  // 切换状态 (ACTIVE <-> INACTIVE)
  async toggleStatus(id: string): Promise<Supplier> {
  // 后端路由使用 PATCH :id/toggle-status，这里改为 patch 以匹配避免 404/405
  const res = await request.patch(`/supplier/${id}/toggle-status`);
    return res.data.data || res.data;
  }

  // 搜索名称 (下拉选择支持)
  async searchByName(name: string): Promise<Array<Pick<Supplier, 'id' | 'supplierNo' | 'name' | 'contactPerson' | 'contactPhone' | 'supplierType' | 'category' | 'creditLevel'>>> {
    const res = await request.get('/supplier/search', { params: { name } });
    return res.data.data || res.data;
  }

  // 评分
  async rateSupplier(data: RateSupplierDto): Promise<Supplier> {
    const res = await request.post('/supplier/rate', data);
    return res.data.data || res.data;
  }

  // 统计
  async getStatistics(): Promise<SupplierStatistics> {
    const res = await request.get('/supplier/statistics');
    const data = res.data.data || res.data;
    return data;
  }

  // 评分历史
  async getRatingHistory(supplierId: string, params?: RatingHistoryQuery): Promise<RatingHistoryResult> {
    const res = await request.get(`/supplier/${supplierId}/rating-history`, { params });
    const data = res.data.data || res.data;
    return data;
  }

  // 显示文本工具
  getStatusText(status: SupplierStatus): string {
    const map: Record<SupplierStatus, string> = {
      ACTIVE: '启用',
      INACTIVE: '停用',
      BLACKLIST: '黑名单',
    };
    return map[status] || status;
  }

  getStatusColor(status: SupplierStatus): string {
    const map: Record<SupplierStatus, string> = {
      ACTIVE: 'success',
      INACTIVE: 'default',
      BLACKLIST: 'error',
    };
    return map[status] || 'default';
  }

  getTypeText(type: SupplierType): string {
    const map: Record<SupplierType, string> = {
      PRODUCT: '商品',
      SERVICE: '服务',
      BOTH: '综合',
    };
    return map[type] || type;
  }

  getCreditText(level?: CreditLevel): string {
    if (!level) return '';
    return level;
  }
}

export const supplierService = new SupplierService();
export default supplierService;
