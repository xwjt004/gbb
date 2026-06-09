import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// 打印设置接口
export interface PrintSettings {
  id: number;
  showShopName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTelephone: boolean;
  showWechatId: boolean;
  showDouyinId: boolean;
  showKuaishouId: boolean;
  showXiaohongshuId: boolean;
  showBusinessScope: boolean;
  showBusinessHours: boolean;
  createdAt: string;
  updatedAt: string;
}

// 更新打印设置DTO
export interface UpdatePrintSettingsDto {
  showShopName?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTelephone?: boolean;
  showWechatId?: boolean;
  showDouyinId?: boolean;
  showKuaishouId?: boolean;
  showXiaohongshuId?: boolean;
  showBusinessScope?: boolean;
  showBusinessHours?: boolean;
}

/**
 * 获取打印设置
 */
export const getPrintSettings = async (): Promise<PrintSettings> => {
  const response = await axios.get(`${API_BASE_URL}/print-settings`);
  return response.data.data;
};

/**
 * 更新打印设置
 */
export const updatePrintSettings = async (data: UpdatePrintSettingsDto): Promise<PrintSettings> => {
  const response = await axios.put(`${API_BASE_URL}/print-settings`, data);
  return response.data.data;
};
