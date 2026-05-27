import { request } from './api';

// 入库状态枚举
export enum InboundStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// 质检状态枚举
export enum QualityCheckStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// 入库记录接口
export interface InboundRecord {
  id: string;
  inboundNo: string;
  inTransitId: string;
  purchaseOrderId: string;
  inboundDate: string;
  inboundType: string;
  expectedQuantity: number;
  actualQuantity: number;
  qualifiedQuantity: number;
  defectiveQuantity: number;
  qualityCheckStatus: QualityCheckStatus;
  qualityCheckBy?: string;
  qualityCheckAt?: string;
  qualityCheckResult?: string;
  qualityCheckPhotos?: string[];
  defectTypes?: any;
  defectDescription?: string;
  inboundStatus: InboundStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  inventoryUpdated: boolean;
  inventoryUpdateAt?: string;
  warehouseId?: string;
  locationId?: string;
  totalAmount: number;
  taxAmount?: number;
  packageCount?: number;
  packageType?: string;
  packageCondition?: string;
  temperature?: number;
  humidity?: number;
  rejectionReason?: string;
  returnRequested: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  inTransit?: {
    id: string;
    transitNo: string;
    shippingCompany?: string;
  };
  purchaseOrder?: {
    id: string;
    purchaseNo: string;
    supplier?: {
      id: string;
      name: string;
    };
    items?: any[];
  };
}

// 创建入库记录DTO
export interface CreateInboundDto {
  inTransitId: string;
  totalQuantity: number;
  receivedDate?: string;
  warehouseLocation?: string;
  remark?: string;
}

// 开始质检DTO
export interface StartQualityCheckDto {
  inspectorName: string;
  checkStartTime?: string;
  remark?: string;
}

// 完成质检DTO
export interface CompleteQualityCheckDto {
  qualityStatus: QualityCheckStatus;
  qualifiedQuantity: number;
  rejectedQuantity?: number;
  checkResult?: string;
  checkDetails?: any;
  remark?: string;
}

// 确认入库DTO
export interface ConfirmInboundDto {
  inboundQuantity: number;
  warehouseLocation: string;
  confirmedBy: string;
  confirmedDate?: string;
  updateInventory?: boolean;
  remark?: string;
}

// 取消入库DTO
export interface CancelInboundDto {
  cancelReason: string;
  remark?: string;
}

// 查询参数
export interface QueryInboundParams {
  inboundNo?: string;
  inTransitId?: string;
  purchaseOrderId?: string;
  status?: InboundStatus;
  qualityStatus?: QualityCheckStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// 更新入库记录DTO
export interface UpdateInboundDto {
  warehouseLocation?: string;
  remark?: string;
}

class InboundService {
  /**
   * 获取入库记录列表
   */
  async getList(params: QueryInboundParams) {
    const response = await request.get('/inbound/list', { params });
    return response.data;
  }

  /**
   * 获取入库记录详情
   */
  async getDetail(id: string) {
    const response = await request.get(`/inbound/${id}`);
    return response.data;
  }

  /**
   * 创建入库记录
   */
  async create(data: CreateInboundDto) {
    const response = await request.post('/inbound', data);
    return response.data;
  }

  /**
   * 开始质检
   */
  async startQualityCheck(id: string, data: StartQualityCheckDto) {
    const response = await request.patch(`/inbound/${id}/quality-check/start`, data);
    return response.data;
  }

  /**
   * 完成质检
   */
  async completeQualityCheck(id: string, data: CompleteQualityCheckDto) {
    const response = await request.patch(`/inbound/${id}/quality-check/complete`, data);
    return response.data;
  }

  /**
   * 确认入库
   */
  async confirmInbound(id: string, data: ConfirmInboundDto) {
    const response = await request.patch(`/inbound/${id}/confirm`, data);
    return response.data;
  }

  /**
   * 取消入库
   */
  async cancelInbound(id: string, data: CancelInboundDto) {
    const response = await request.patch(`/inbound/${id}/cancel`, data);
    return response.data;
  }

  /**
   * 更新入库记录
   */
  async update(id: string, data: UpdateInboundDto) {
    const response = await request.patch(`/inbound/${id}`, data);
    return response.data;
  }

  /**
   * 删除入库记录
   */
  async remove(id: string) {
    const response = await request.delete(`/inbound/${id}`);
    return response.data;
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    const response = await request.get('/inbound/statistics/summary');
    return response.data;
  }

  /**
   * 获取状态文本
   */
  getStatusText(status: InboundStatus): string {
    const statusMap: Record<InboundStatus, string> = {
      [InboundStatus.PENDING]: '待入库',
      [InboundStatus.IN_PROGRESS]: '入库中',
      [InboundStatus.COMPLETED]: '已完成',
      [InboundStatus.CANCELLED]: '已取消',
    };
    return statusMap[status] || status;
  }

  /**
   * 获取状态颜色
   */
  getStatusColor(status: InboundStatus): string {
    const colorMap: Record<InboundStatus, string> = {
      [InboundStatus.PENDING]: 'default',
      [InboundStatus.IN_PROGRESS]: 'processing',
      [InboundStatus.COMPLETED]: 'success',
      [InboundStatus.CANCELLED]: 'error',
    };
    return colorMap[status] || 'default';
  }

  /**
   * 获取质检状态文本
   */
  getQualityStatusText(status: QualityCheckStatus): string {
    const statusMap: Record<QualityCheckStatus, string> = {
      [QualityCheckStatus.PENDING]: '待质检',
      [QualityCheckStatus.IN_PROGRESS]: '质检中',
      [QualityCheckStatus.PASSED]: '已通过',
      [QualityCheckStatus.FAILED]: '未通过',
      [QualityCheckStatus.PARTIAL]: '部分通过',
    };
    return statusMap[status] || status;
  }

  /**
   * 获取质检状态颜色
   */
  getQualityStatusColor(status: QualityCheckStatus): string {
    const colorMap: Record<QualityCheckStatus, string> = {
      [QualityCheckStatus.PENDING]: 'default',
      [QualityCheckStatus.IN_PROGRESS]: 'processing',
      [QualityCheckStatus.PASSED]: 'success',
      [QualityCheckStatus.FAILED]: 'error',
      [QualityCheckStatus.PARTIAL]: 'warning',
    };
    return colorMap[status] || 'default';
  }
}

export default new InboundService();
