import axios from 'axios';

// 优先使用正确的 VITE_API_URL (若配置为 /api/v1 形式则补全后端基址)
// 兼容旧的 VITE_API_BASE_URL，以防尚未清理
const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = rawApi
  ? (rawApi.startsWith('http') ? rawApi : `http://localhost:3000${rawApi}`)
  : 'http://localhost:3000/api/v1';

export interface ShopInfo {
  id: number;
  shopName: string;
  address: string;
  phone: string;
  telephone?: string;
  shopPhoto?: string;
  locationMap?: string;
  businessScope?: string;
  wechatId?: string;
  douyinId?: string;
  kuaishouId?: string;
  xiaohongshuId?: string;
  businessHours?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateShopInfoDto {
  shopName: string;
  address: string;
  phone: string;
  telephone?: string;
  businessScope?: string;
  wechatId?: string;
  douyinId?: string;
  kuaishouId?: string;
  xiaohongshuId?: string;
  businessHours?: string;
  description?: string;
}

/**
 * 获取店铺信息
 */
export const getShopInfo = async (): Promise<ShopInfo> => {
  const response = await axios.get(`${API_BASE_URL}/shop-info`);
  return response.data.data;
};

/**
 * 更新店铺信息
 */
export const updateShopInfo = async (data: UpdateShopInfoDto): Promise<ShopInfo> => {
  const response = await axios.put(`${API_BASE_URL}/shop-info`, data);
  return response.data.data;
};

/**
 * 上传店铺图片
 * @param fieldName - 'shopPhoto' 或 'locationMap'
 * @param file - 图片文件
 */
export const uploadShopImage = async (
  fieldName: 'shopPhoto' | 'locationMap',
  file: File
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_BASE_URL}/shop-info/upload/${fieldName}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  const data = response.data.data || {};
  // 后端当前返回 { shopPhoto: '/uploads/...' } 或 { locationMap: '/uploads/...' }
  // 统一转换为 { url }
  const url = data.url || data.shopPhoto || data.locationMap;
  return { url };
};
