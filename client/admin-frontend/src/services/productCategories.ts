import { request } from './api';
import type {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryQueryDto,
  ProductCategoryListResponse,
} from '@/types/product';

/**
 * 商品分类服务
 */
class ProductCategoryService {
  /**
   * 创建商品分类
   */
  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategory> {
    const response = await request.post('/product-categories', data);
    return response.data.data;
  }

  /**
   * 获取分类列表（分页）
   */
  async getCategories(params?: ProductCategoryQueryDto): Promise<ProductCategoryListResponse> {
    const response = await request.get('/product-categories', { params });
    return response.data.data;
  }

  /**
   * 获取所有启用的分类（用于选择器）
   */
  async getActiveCategories(): Promise<ProductCategory[]> {
    const response = await request.get('/product-categories/active');
    return response.data.data;
  }

  /**
   * 获取分类详情
   */
  async getCategoryById(id: number): Promise<ProductCategory> {
    const response = await request.get(`/product-categories/${id}`);
    return response.data.data;
  }

  /**
   * 更新分类
   */
  async updateCategory(id: number, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    const response = await request.patch(`/product-categories/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: number): Promise<void> {
    await request.delete(`/product-categories/${id}`);
  }

  /**
   * 批量更新排序
   */
  async updateSortOrder(sortData: { id: number; sortOrder: number }[]): Promise<void> {
    await request.patch('/product-categories/sort', sortData);
  }
}

export default new ProductCategoryService();
