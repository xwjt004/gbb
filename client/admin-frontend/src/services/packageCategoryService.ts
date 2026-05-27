import { request } from './api';

export interface PackageCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    packages: number;
  };
}

export interface CreatePackageCategoryDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  status?: string;
}

export interface UpdatePackageCategoryDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  status?: string;
}

export interface PackageCategoryQueryDto {
  name?: string;
  status?: string;
  page?: number;
  limit?: number;
}

class PackageCategoryService {
  /**
   * 创建套餐分类
   */
  async createCategory(data: CreatePackageCategoryDto): Promise<PackageCategory> {
    const response = await request.post('/package-categories', data);
    return response.data.data;
  }

  /**
   * 获取分类列表
   */
  async getCategories(params?: PackageCategoryQueryDto) {
    const response = await request.get('/package-categories', { params });
    return response.data.data;
  }

  /**
   * 获取所有启用的分类（用于选择器）
   */
  async getActiveCategories(): Promise<PackageCategory[]> {
    const response = await request.get('/package-categories/active');
    return response.data.data;
  }

  /**
   * 获取分类详情
   */
  async getCategoryById(id: number): Promise<PackageCategory> {
    const response = await request.get(`/package-categories/${id}`);
    return response.data.data;
  }

  /**
   * 更新分类
   */
  async updateCategory(id: number, data: UpdatePackageCategoryDto): Promise<PackageCategory> {
    const response = await request.patch(`/package-categories/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: number): Promise<void> {
    await request.delete(`/package-categories/${id}`);
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(sortData: { id: number; sortOrder: number }[]): Promise<void> {
    await request.post('/package-categories/sort', sortData);
  }
}

export default new PackageCategoryService();
