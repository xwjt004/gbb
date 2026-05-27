import { request } from './api';
import type {
  DiyPackage,
  CreateDiyPackageDto,
  UpdateDiyPackageDto,
  QueryDiyPackageDto,
  DiyPackageListResponse,
  PricingPreviewRequest,
  PricingPreviewResponse,
} from '@/types/diy-package';

/**
 * DIY套系服务
 */
class DiyPackagesService {
  /**
   * 创建DIY套系
   */
  async createDiyPackage(data: CreateDiyPackageDto): Promise<DiyPackage> {
    const response = await request.post('/diy-packages', data);
    return response.data.data;
  }

  /**
   * 获取DIY套系列表
   */
  async getDiyPackages(params?: QueryDiyPackageDto): Promise<DiyPackageListResponse> {
    const response = await request.get('/diy-packages', { params });
    return response.data.data;
  }

  /**
   * 获取DIY套系详情
   */
  async getDiyPackageById(id: number): Promise<DiyPackage> {
    const response = await request.get(`/diy-packages/${id}`);
    return response.data.data;
  }

  /**
   * 更新DIY套系
   */
  async updateDiyPackage(id: number, data: UpdateDiyPackageDto): Promise<DiyPackage> {
    const response = await request.patch(`/diy-packages/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除DIY套系
   */
  async deleteDiyPackage(id: number): Promise<void> {
    await request.delete(`/diy-packages/${id}`);
  }

  /**
   * 预览价格计算
   */
  async previewPricing(data: PricingPreviewRequest): Promise<PricingPreviewResponse> {
    const response = await request.post('/diy-packages/preview-pricing', data);
    return response.data.data;
  }

  /**
   * 从 DIY 套系创建订单
   */
  async createOrderFromDiyPackage(
    diyPackageId: number,
    data: {
      userOpenid: string;
      timeSlotId?: number;
      appointmentDate?: string;
      childrenCount?: number;
      customerName?: string;
      notes?: string;
    }
  ): Promise<any> {
    const response = await request.post(`/diy-packages/${diyPackageId}/create-order`, data);
    return response.data.data;
  }
}

export default new DiyPackagesService();
