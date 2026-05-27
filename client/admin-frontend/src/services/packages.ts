import { request } from './api';
import { Package } from '@/types/package';
import { Status } from '@/types/common';
import { mapBackendStatusToFrontend, mapFrontendStatusToBackend } from '@/constants/status';

export type BackendStatus = 'ACTIVE' | 'INACTIVE';

interface BackendPackageListItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  deposit: number;
  duration_minutes: number;
  includes: string[];
  images?: string[];
  category?: string;
  status?: BackendStatus;
  order_count: number;
  created_at: string;
}

export interface PackageListResponse {
  code: number;
  message: string;
  data: {
    packages: Array<{
      id: number;
      name: string;
      description?: string;
      price: number;
      deposit: number;
      duration_minutes: number;
      includes: string[];
      order_count: number;
      created_at: string;
      status?: string;
    }>;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface PackageSearchApiParams {
  page?: number;
  limit?: number;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  category?: string;
}

// 将后端返回结构映射到前端 Package 类型
function mapApiPackage(p: BackendPackageListItem): Package {
  return {
    id: String(p.id),
    name: p.name,
    description: p.description || '',
    price: p.price,
    deposit: p.deposit,
    duration: p.duration_minutes,
    services: p.includes || [],
    images: p.images && p.images.length ? p.images : [],
    status: mapBackendStatusToFrontend(p.status),
    isPopular: (p as any).is_popular || false,
    orderCount: p.order_count,
    rating: 0,
    tags: [],
    category: p.category || '',
    categoryId: (p as any).categoryId,
    packageCategory: (p as any).packageCategory,
    maxBookings: 0,
    createdAt: p.created_at,
    updatedAt: p.created_at,
  };
}

export const packageService = {
  async getPackages(params: PackageSearchApiParams & { status?: Status; isPopular?: boolean }) {
    const query: any = { ...params };
    if (params.status) {
      query.status = mapFrontendStatusToBackend(params.status);
    }
    if (typeof params.isPopular === 'boolean') {
      query.isPopular = params.isPopular;
    }
    const resp = await request.get('/packages', { params: query });
    const body: any = resp.data;
    const data = body.data || body;
    const list: Package[] = (data.packages || []).map(mapApiPackage);
    return { list, pagination: data.pagination };
  },
  async createPackage(payload: any) {
    const resp = await request.post('/packages', payload);
    return resp.data;
  },
  async updatePackage(id: string|number, payload: any) {
    const resp = await request.patch(`/packages/${id}`, payload);
    return resp.data;
  },
  async getPackageDetail(id: string|number) {
    const resp = await request.get(`/packages/${id}`);
    const body: any = resp.data || resp;
    const data = body.data || body;
    // map backend shape to frontend Package
    const mapped: Package = {
      id: String(data.id),
      name: data.name,
      description: data.description || '',
      price: data.price ?? data.price_cents ?? 0,
      deposit: data.deposit ?? 0,
      duration: data.duration_minutes ?? data.duration ?? data.durationMinutes ?? 0,
      services: data.includes || data.services || [],
      images: (data.images && data.images.length) ? data.images : [],
      status: mapBackendStatusToFrontend(data.status),
      isPopular: (data.is_popular !== undefined) ? data.is_popular : (data.isPopular || false),
      orderCount: data.order_count ?? data.orderCount ?? 0,
      rating: data.rating ?? 0,
      tags: data.tags || [],
      category: data.category || '',
      categoryId: data.categoryId,
      packageCategory: data.packageCategory,
      maxBookings: data.max_bookings ?? data.maxBookings ?? 0,
      createdAt: data.created_at ?? data.createdAt ?? '',
      updatedAt: data.updated_at ?? data.updatedAt ?? data.createdAt ?? '',
    };
    return mapped;
  },
  async deletePackage(id: string|number) {
    const resp = await request.delete(`/packages/${id}`);
    return resp.data;
  },
  async togglePackageStatus(id: string|number, next: Status) {
    return request.patch(`/packages/${id}`, { status: mapFrontendStatusToBackend(next) });
  },
  async bulkUpdateStatus(ids: (string|number)[], next: Status) {
    const numericIds = ids.map(id => Number(id));
    await request.patch('/packages/bulk/status', { ids: numericIds, status: mapFrontendStatusToBackend(next) });
  },

  // 导出功能
  async exportToExcel(searchParams: PackageSearchApiParams & { status?: Status; isPopular?: boolean }) {
    const query: any = { ...searchParams };
    if (searchParams.status) {
      query.status = mapFrontendStatusToBackend(searchParams.status);
    }
    if (typeof searchParams.isPopular === 'boolean') {
      query.isPopular = searchParams.isPopular;
    }
    
    const response = await request.get('/packages/export/excel', {
      params: query,
      responseType: 'blob',
    });
    
    // 创建下载链接
    const blob = new Blob([response.data.data || response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 从响应头获取文件名，或使用默认文件名
    const contentDisposition = response.headers?.['content-disposition'];
    let filename = '套餐数据.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async exportToCSV(searchParams: PackageSearchApiParams & { status?: Status; isPopular?: boolean }) {
    const query: any = { ...searchParams };
    if (searchParams.status) {
      query.status = mapFrontendStatusToBackend(searchParams.status);
    }
    if (typeof searchParams.isPopular === 'boolean') {
      query.isPopular = searchParams.isPopular;
    }
    
    const response = await request.get('/packages/export/csv', {
      params: query,
      responseType: 'blob',
    });
    
    // 创建下载链接
    const blob = new Blob([response.data.data || response.data], {
      type: 'text/csv;charset=utf-8',
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 从响应头获取文件名，或使用默认文件名
    const contentDisposition = response.headers?.['content-disposition'];
    let filename = '套餐数据.csv';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
      }
    }
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async exportToJSON(searchParams: PackageSearchApiParams & { status?: Status; isPopular?: boolean }) {
    const query: any = { ...searchParams };
    if (searchParams.status) {
      query.status = mapFrontendStatusToBackend(searchParams.status);
    }
    if (typeof searchParams.isPopular === 'boolean') {
      query.isPopular = searchParams.isPopular;
    }
    
    const response = await request.get('/packages/export/json', {
      params: query,
    });
    
    // 生成JSON文件下载
    const jsonString = JSON.stringify(response.data, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8',
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const filename = `套餐数据_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.json`;
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

export default packageService;