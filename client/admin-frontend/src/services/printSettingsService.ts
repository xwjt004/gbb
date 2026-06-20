import api from './api';

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
  const response = await api.get('/print-settings');
  return response.data.data;
};

/**
 * 更新打印设置
 */
export const updatePrintSettings = async (data: UpdatePrintSettingsDto): Promise<PrintSettings> => {
  const response = await api.put('/print-settings', data);
  return response.data.data;
};
