import { request } from './api';
import type {
  ServiceItem,
  CreateServiceItemDto,
  UpdateServiceItemDto,
  ServiceItemQueryDto,
  ServiceItemListResponse,
  ServiceItemStatistics,
} from '@/types/product';

/**
 * 服务项目服务
 */
class ServiceItemService {
  /**
   * 创建服务项目
   */
  async createServiceItem(data: CreateServiceItemDto): Promise<ServiceItem> {
    const response = await request.post('/service-items', data);
    return response.data.data;
  }

  /**
   * 获取服务项目列表（分页）
   */
  async getServiceItems(params?: ServiceItemQueryDto): Promise<ServiceItemListResponse> {
    const response = await request.get('/service-items', { params });
    return response.data.data;
  }

  /**
   * 获取服务项目详情
   */
  async getServiceItemById(id: number): Promise<ServiceItem> {
    const response = await request.get(`/service-items/${id}`);
    return response.data.data;
  }

  /**
   * 更新服务项目
   */
  async updateServiceItem(id: number, data: UpdateServiceItemDto): Promise<ServiceItem> {
    const response = await request.patch(`/service-items/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除服务项目
   */
  async deleteServiceItem(id: number): Promise<void> {
    await request.delete(`/service-items/${id}`);
  }

  /**
   * 获取所有服务分类
   */
  async getCategories(): Promise<string[]> {
    const response = await request.get('/service-items/categories');
    return response.data.data;
  }

  /**
   * 获取服务统计信息
   */
  async getStatistics(): Promise<ServiceItemStatistics> {
    const response = await request.get('/service-items/statistics');
    return response.data.data;
  }

  /**
   * 按分类查询服务项目
   */
  async getServicesByCategory(category: string): Promise<ServiceItem[]> {
    const response = await request.get(`/service-items/by-category/${encodeURIComponent(category)}`);
    return response.data.data;
  }
}

export default new ServiceItemService();
