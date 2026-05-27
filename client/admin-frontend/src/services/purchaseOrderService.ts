import { request } from './api';

// 采购订单状态（与后端保持一致）
export type PurchaseOrderStatus = 
  | 'DRAFT'        // 草稿
  | 'PENDING'      // 待审批
  | 'APPROVED'     // 已审批
  | 'REJECTED'     // 已驳回
  | 'IN_TRANSIT'   // 在途
  | 'RECEIVED'     // 已收货
  | 'CANCELLED';   // 已取消

// 物流状态
export type ShippingStatus =
  | 'PENDING'      // 待发货
  | 'SHIPPED'      // 已发货
  | 'IN_TRANSIT'   // 在途
  | 'ARRIVED'      // 已到达
  | 'RECEIVED';    // 已收货

// 采购订单明细（后端返回时包含关联的商品信息）
export interface PurchaseOrderItem {
  id?: string;
  productId: number;                    // 商品ID
  quantity: number;                     // 采购数量
  unitPrice: number;                    // 采购单价
  totalPrice: number;                   // 小计
  receivedQuantity?: number;            // 已收货数量
  qualifiedQuantity?: number;           // 合格数量
  defectiveQuantity?: number;           // 次品数量
  remark?: string;                      // 备注
  
  // 关联的商品信息（后端通过 include 返回）
  product?: {
    id: number;
    productNo: string;
    name: string;
    category?: {
      id: number;
      name: string;
    };
    specification?: string;
    unit: string;
    brand?: string;
    model?: string;
    costPrice?: number;
    salePrice?: number;
    description?: string;
    images?: any;
  };
}

// 采购订单
export interface PurchaseOrder {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName?: string;
  purchaseDate: string;
  expectedDate: string;
  actualDate?: string;
  totalQuantity: number;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  finalAmount: number;
  shippingCompany?: string;
  trackingNo?: string;
  shippingStatus: ShippingStatus;
  status: PurchaseOrderStatus;
  submitterId?: number;
  submittedAt?: string;
  approverId?: number;
  approvedAt?: string;
  rejectReason?: string;
  receiverId?: number;
  receivedAt?: string;
  receivedQuantity?: number;
  qualityCheckStatus?: string;
  qualityCheckRemark?: string;
  remark?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
  supplier?: {
    id: string;
    supplierNo: string;
    name: string;
    contactPerson?: string;
    contactPhone?: string;
  };
}

// 创建采购订单DTO
export interface CreatePurchaseOrderDto {
  supplierId: string;
  purchaseDate: string;
  expectedDate?: string;
  freight?: number;
  discount?: number;
  remark?: string;
  items: Array<{
    productId: number;         // 商品ID（必填）
    quantity: number;          // 采购数量（必填）
    unitPrice: number;         // 采购单价（必填）
    remark?: string;           // 备注
  }>;
}

// 更新采购订单DTO
export interface UpdatePurchaseOrderDto extends Partial<CreatePurchaseOrderDto> {
  shippingCompany?: string;
  trackingNo?: string;
}

// 查询参数
export interface QueryPurchaseOrderParams {
  purchaseNo?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  shippingStatus?: ShippingStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 列表结果
export interface PurchaseOrderListResult {
  list: PurchaseOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 统计数据
export interface PurchaseOrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  byShippingStatus: Record<string, number>;
  totalAmount: number;
  monthlyAmount: number;
}

class PurchaseOrderService {
  // 创建采购订单
  async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const res = await request.post('/purchase-order', data);
    return res.data.data || res.data;
  }

  // 查询列表
  async getList(params: QueryPurchaseOrderParams): Promise<PurchaseOrderListResult> {
    const res = await request.get('/purchase-order', { params });
    return res.data.data || res.data;
  }

  // 获取详情
  async getById(id: string): Promise<PurchaseOrder> {
    const res = await request.get(`/purchase-order/${id}`);
    return res.data.data || res.data;
  }

  // 更新采购订单
  async update(id: string, data: UpdatePurchaseOrderDto): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}`, data);
    return res.data.data || res.data;
  }

  // 删除
  async remove(id: string): Promise<void> {
    await request.delete(`/purchase-order/${id}`);
  }

  // 提交审核
  async submit(id: string): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/submit`);
    return res.data.data || res.data;
  }

  // 审核通过
  async approve(id: string, approver: string, approvalRemark?: string): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/approve`, { approver, approvalRemark });
    return res.data.data || res.data;
  }

  // 审核拒绝
  async reject(id: string, approver: string, rejectReason: string): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/reject`, { approver, rejectReason });
    return res.data.data || res.data;
  }

  // 撤回审批
  async revokeApproval(id: string): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/revoke`);
    return res.data.data || res.data;
  }

  // 确认收货
  async confirmReceive(id: string, data: {
    receivedQuantity: number;
    qualityCheckStatus?: string;
    qualityCheckRemark?: string;
  }): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/receive`, data);
    return res.data.data || res.data;
  }

  // 更新物流信息
  async updateShipping(id: string, data: {
    shippingCompany?: string;
    trackingNo?: string;
    shippingStatus?: ShippingStatus;
  }): Promise<PurchaseOrder> {
    const res = await request.patch(`/purchase-order/${id}/shipping`, data);
    return res.data.data || res.data;
  }

  // 统计数据
  async getStatistics(): Promise<PurchaseOrderStatistics> {
    const res = await request.get('/purchase-order/statistics');
    return res.data.data || res.data;
  }

  // 状态文本映射
  getStatusText(status: PurchaseOrderStatus): string {
    const map: Record<PurchaseOrderStatus, string> = {
      DRAFT: '草稿',
      PENDING: '待审批',
      APPROVED: '已审批',
      REJECTED: '已驳回',
      IN_TRANSIT: '在途',
      RECEIVED: '已收货',
      CANCELLED: '已取消',
    };
    return map[status] || status;
  }

  getStatusColor(status: PurchaseOrderStatus): string {
    const map: Record<PurchaseOrderStatus, string> = {
      DRAFT: 'default',
      PENDING: 'processing',
      APPROVED: 'success',
      REJECTED: 'error',
      IN_TRANSIT: 'warning',
      RECEIVED: 'success',
      CANCELLED: 'default',
    };
    return map[status] || 'default';
  }

  getShippingStatusText(status: ShippingStatus): string {
    const map: Record<ShippingStatus, string> = {
      PENDING: '待发货',
      SHIPPED: '已发货',
      IN_TRANSIT: '在途',
      ARRIVED: '已到达',
      RECEIVED: '已收货',
    };
    return map[status] || status;
  }

  getShippingStatusColor(status: ShippingStatus): string {
    const map: Record<ShippingStatus, string> = {
      PENDING: 'default',
      SHIPPED: 'processing',
      IN_TRANSIT: 'processing',
      ARRIVED: 'warning',
      RECEIVED: 'success',
    };
    return map[status] || 'default';
  }
}

export const purchaseOrderService = new PurchaseOrderService();
export default purchaseOrderService;
