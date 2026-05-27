import { request } from './api';

// 物流状态枚举
export enum ShippingStatus {
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  DELIVERED = 'DELIVERED',
  DELAYED = 'DELAYED',
  EXCEPTION = 'EXCEPTION',
}

// 物流方式枚举
export enum ShippingMethod {
  LAND = 'LAND',
  AIR = 'AIR',
  SEA = 'SEA',
  EXPRESS = 'EXPRESS',
}

// 异常类型枚举
export enum ExceptionType {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  WRONG_ROUTE = 'WRONG_ROUTE',
  CUSTOMS = 'CUSTOMS',
  OTHER = 'OTHER',
}

// 在途商品接口
export interface InTransitGoods {
  id: string;
  transitNo: string;
  purchaseOrderId: string;
  totalQuantity: number;
  totalAmount: number;
  shippedDate?: string;
  shippedBy?: string;
  shippedFrom?: string;
  shippingCompany?: string;
  trackingNo?: string;
  shippingMethod?: ShippingMethod;
  shippingStatus: ShippingStatus;
  expectedDate: string;
  estimatedDays?: number;
  actualDate?: string;
  actualDays?: number;
  receivedBy?: string;
  receivedAt?: string;
  receivedQuantity?: number;
  currentLocation?: string;
  lastUpdateTime?: string;
  trackingHistory?: any;
  isDelayed: boolean;
  delayDays?: number;
  delayReason?: string;
  hasException: boolean;
  exceptionType?: ExceptionType;
  exceptionDesc?: string;
  exceptionHandled: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  purchaseOrder?: {
    id: string;
    purchaseNo: string;
    supplier?: {
      id: string;
      name: string;
    };
  };
  inboundRecords?: any[];
}

// 创建在途商品DTO
export interface CreateInTransitDto {
  purchaseOrderId: string;
  totalQuantity: number;
  totalAmount: number;
  shippedDate?: string;
  shippedBy?: string;
  shippedFrom?: string;
  shippingCompany?: string;
  trackingNo?: string;
  shippingMethod?: ShippingMethod;
  expectedDate: string;
  estimatedDays?: number;
  remark?: string;
}

// 更新在途商品DTO
export interface UpdateInTransitDto {
  shippedDate?: string;
  shippedBy?: string;
  shippedFrom?: string;
  shippingCompany?: string;
  trackingNo?: string;
  shippingMethod?: ShippingMethod;
  expectedDate?: string;
  estimatedDays?: number;
  currentLocation?: string;
  remark?: string;
}

// 更新物流状态DTO
export interface UpdateShippingStatusDto {
  shippingStatus: ShippingStatus;
  currentLocation?: string;
  remark?: string;
}

// 确认收货DTO
export interface ConfirmReceiveDto {
  actualDate: string;
  receivedQuantity: number;
  receivedBy?: string;
  remark?: string;
}

// 记录异常DTO
export interface RecordExceptionDto {
  exceptionType: ExceptionType;
  exceptionDesc: string;
  remark?: string;
}

// 处理异常DTO
export interface HandleExceptionDto {
  handlingDesc: string;
  remark?: string;
}

// 查询参数
export interface QueryInTransitParams {
  transitNo?: string;
  purchaseOrderId?: string;
  shippingStatus?: ShippingStatus;
  trackingNo?: string;
  isDelayed?: boolean;
  hasException?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

class InTransitService {
  /**
   * 获取在途商品列表
   */
  async getList(params: QueryInTransitParams) {
    const response = await request.get('/in-transit/list', { params });
    return response.data;
  }

  /**
   * 获取在途商品详情
   */
  async getDetail(id: string) {
    const response = await request.get(`/in-transit/${id}`);
    return response.data;
  }

  /**
   * 创建在途商品
   */
  async create(data: CreateInTransitDto) {
    const response = await request.post('/in-transit', data);
    return response.data;
  }

  /**
   * 更新在途商品信息
   */
  async update(id: string, data: UpdateInTransitDto) {
    const response = await request.patch(`/in-transit/${id}`, data);
    return response.data;
  }

  /**
   * 更新物流状态
   */
  async updateShippingStatus(id: string, data: UpdateShippingStatusDto) {
    const response = await request.patch(`/in-transit/${id}/shipping-status`, data);
    return response.data;
  }

  /**
   * 确认收货
   */
  async confirmReceive(id: string, data: ConfirmReceiveDto) {
    const response = await request.patch(`/in-transit/${id}/receive`, data);
    return response.data;
  }

  /**
   * 记录异常
   */
  async recordException(id: string, data: RecordExceptionDto) {
    const response = await request.patch(`/in-transit/${id}/exception`, data);
    return response.data;
  }

  /**
   * 处理异常
   */
  async handleException(id: string, data: HandleExceptionDto) {
    const response = await request.patch(`/in-transit/${id}/handle-exception`, data);
    return response.data;
  }

  /**
   * 删除在途商品
   */
  async remove(id: string) {
    const response = await request.delete(`/in-transit/${id}`);
    return response.data;
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const response = await request.get('/in-transit/statistics/summary');
    return response.data;
  }

  /**
   * 根据采购订单ID获取在途商品列表
   */
  async getByPurchaseOrderId(purchaseOrderId: string) {
    const response = await request.get(`/in-transit/by-purchase-order/${purchaseOrderId}`);
    return response.data;
  }

  /**
   * 获取物流状态文本
   */
  getShippingStatusText(status: ShippingStatus): string {
    const statusMap: Record<ShippingStatus, string> = {
      [ShippingStatus.PREPARING]: '备货中',
      [ShippingStatus.SHIPPED]: '已发货',
      [ShippingStatus.IN_TRANSIT]: '在途中',
      [ShippingStatus.ARRIVED]: '已到达',
      [ShippingStatus.DELIVERED]: '已交付',
      [ShippingStatus.DELAYED]: '延迟',
      [ShippingStatus.EXCEPTION]: '异常',
    };
    return statusMap[status] || status;
  }

  /**
   * 获取物流状态颜色
   */
  getShippingStatusColor(status: ShippingStatus): string {
    const colorMap: Record<ShippingStatus, string> = {
      [ShippingStatus.PREPARING]: 'default',
      [ShippingStatus.SHIPPED]: 'processing',
      [ShippingStatus.IN_TRANSIT]: 'processing',
      [ShippingStatus.ARRIVED]: 'success',
      [ShippingStatus.DELIVERED]: 'success',
      [ShippingStatus.DELAYED]: 'warning',
      [ShippingStatus.EXCEPTION]: 'error',
    };
    return colorMap[status] || 'default';
  }

  /**
   * 获取物流方式文本
   */
  getShippingMethodText(method: ShippingMethod): string {
    const methodMap: Record<ShippingMethod, string> = {
      [ShippingMethod.LAND]: '陆运',
      [ShippingMethod.AIR]: '空运',
      [ShippingMethod.SEA]: '海运',
      [ShippingMethod.EXPRESS]: '快递',
    };
    return methodMap[method] || method;
  }

  /**
   * 获取异常类型文本
   */
  getExceptionTypeText(type: ExceptionType): string {
    const typeMap: Record<ExceptionType, string> = {
      [ExceptionType.DAMAGED]: '破损',
      [ExceptionType.LOST]: '丢失',
      [ExceptionType.WRONG_ROUTE]: '路线错误',
      [ExceptionType.CUSTOMS]: '海关问题',
      [ExceptionType.OTHER]: '其他',
    };
    return typeMap[type] || type;
  }
}

export default new InTransitService();
