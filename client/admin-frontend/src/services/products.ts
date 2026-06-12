import { request } from './api';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductListResponse,
  ProductStatistics,
  UpdateStockDto,
  BatchUpdateStatusDto,
} from '@/types/product';

/**
 * 商品服务
 */
class ProductService {
  /**
   * 创建商品
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    const response = await request.post('/products', data);
    return response.data.data;
  }

  /**
   * 获取商品列表（分页）
   */
  async getProducts(params?: ProductQueryDto): Promise<ProductListResponse> {
    // 处理参数：将前端的查询参数映射到后端期望的格式
    const processedParams: any = params ? { ...params } : {};
    
    // 处理搜索关键词：前端使用 name，后端期望 keyword
    if (processedParams.name) {
      processedParams.keyword = processedParams.name;
      delete processedParams.name;
    }
    
    // 处理库存筛选：前端使用 lowStock/outOfStock，后端期望 stockStatus
    if (processedParams.lowStock) {
      processedParams.stockStatus = 'LOW';
      delete processedParams.lowStock;
    }
    if (processedParams.outOfStock) {
      processedParams.stockStatus = 'OUT';
      delete processedParams.outOfStock;
    }
    
    const response = await request.get('/products', { params: processedParams });
    return response.data.data;
  }

  /**
   * 获取商品详情
   */
  async getProductById(id: number): Promise<Product> {
    const response = await request.get(`/products/${id}`);
    return response.data.data;
  }

  /**
   * 更新商品
   */
  async updateProduct(id: number, data: UpdateProductDto): Promise<Product> {
    const response = await request.patch(`/products/${id}`, data);
    return response.data.data;
  }

  /**
   * 删除商品
   */
  async deleteProduct(id: number): Promise<void> {
    await request.delete(`/products/${id}`);
  }

  /**
   * 获取商品统计信息
   */
  async getStatistics(): Promise<ProductStatistics> {
    const response = await request.get('/products/statistics');
    return response.data.data;
  }

  /**
   * 更新库存
   */
  async updateStock(id: number, data: Omit<UpdateStockDto, 'productId'>): Promise<Product> {
    const response = await request.patch(`/products/${id}/stock`, data);
    return response.data.data;
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(data: BatchUpdateStatusDto): Promise<void> {
    await request.patch('/products/batch/status', data);
  }

  /**
   * 导出到Excel
   */
  async exportToExcel(params?: any) {
    const response = await request.get('/products/export/excel', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data.data || response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 从 Content-Disposition 解析文件名
    const disposition = response.headers?.['content-disposition'];
    let filename = `商品数据_${new Date().getTime()}.xlsx`;
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/i);
      if (match) {
        filename = decodeURIComponent(match[1]);
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 导出到CSV
   */
  async exportToCSV(params?: any) {
    const response = await request.get('/products/export/csv', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data.data || response.data], {
      type: 'text/csv; charset=utf-8',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const disposition = response.headers?.['content-disposition'];
    let filename = `商品数据_${new Date().getTime()}.csv`;
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/i);
      if (match) {
        filename = decodeURIComponent(match[1]);
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * 导出到JSON
   */
  async exportToJSON(params?: any) {
    const response = await request.get('/products/export/json', { params });
    const jsonString = JSON.stringify(response.data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `商品数据_${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new ProductService();
