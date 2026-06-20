import api from './api';
import dayjs from 'dayjs';

export interface OrderExportParams {
  startDate?: string;
  endDate?: string;
  orderStatus?: string;
  paymentStatus?: string;
  userId?: string;
  packageId?: string;
}

export interface FinancialExportParams {
  startDate: string;
  endDate: string;
}

/**
 * 导出订单数据(后端生成Excel)
 */
export const exportOrders = async (params?: OrderExportParams) => {
  const queryParams = new URLSearchParams();

  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.orderStatus) queryParams.append('orderStatus', params.orderStatus);
  if (params?.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
  if (params?.userId) queryParams.append('userId', params.userId);
  if (params?.packageId) queryParams.append('packageId', params.packageId);

  const qs = queryParams.toString();
  const url = `/export/orders${qs ? '?' + qs : ''}`;
  try {
    const response = await api.get(url, { responseType: 'blob' });
    downloadBlob(response.data, `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出用户数据(后端生成Excel)
 */
export const exportUsers = async () => {
  try {
    const response = await api.get('/export/users', { responseType: 'blob' });
    downloadBlob(response.data, `用户数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出财务数据(后端生成Excel)
 */
export const exportFinancial = async (params: FinancialExportParams) => {
  try {
    const response = await api.get('/export/financial', {
      params: { startDate: params.startDate, endDate: params.endDate },
      responseType: 'blob',
    });
    downloadBlob(response.data, `财务明细_${dayjs(params.startDate).format('YYYYMMDD')}-${dayjs(params.endDate).format('YYYYMMDD')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出全部数据(后端生成Excel,多Sheet)
 */
export const exportAll = async () => {
  try {
    const response = await api.get('/export/all', { responseType: 'blob' });
    downloadBlob(response.data, `完整数据导出_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出套系数据
 */
export const exportPackages = async () => {
  try {
    const response = await api.get('/export/packages', { responseType: 'blob' });
    downloadBlob(response.data, `套系数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出商品数据
 */
export const exportProducts = async () => {
  try {
    const response = await api.get('/export/products', { responseType: 'blob' });
    downloadBlob(response.data, `商品数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出服务项目数据
 */
export const exportServiceItems = async () => {
  try {
    const response = await api.get('/export/service-items', { responseType: 'blob' });
    downloadBlob(response.data, `服务项目_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出顾客数据
 */
export const exportCustomers = async () => {
  try {
    const response = await api.get('/export/customers', { responseType: 'blob' });
    downloadBlob(response.data, `顾客数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出团购数据
 */
export const exportGroupBuys = async () => {
  try {
    const response = await api.get('/export/group-buys', { responseType: 'blob' });
    downloadBlob(response.data, `团购数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出积分/优惠券数据
 */
export const exportPoints = async () => {
  try {
    const response = await api.get('/export/points', { responseType: 'blob' });
    downloadBlob(response.data, `优惠券数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出拍摄日程数据
 */
export const exportTimeSlots = async () => {
  try {
    const response = await api.get('/export/time-slots', { responseType: 'blob' });
    downloadBlob(response.data, `拍摄日程_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出退款数据
 */
export const exportRefunds = async () => {
  try {
    const response = await api.get('/export/refunds', { responseType: 'blob' });
    downloadBlob(response.data, `退款数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出采购订单数据
 */
export const exportPurchaseOrders = async () => {
  try {
    const response = await api.get('/export/purchase-orders', { responseType: 'blob' });
    downloadBlob(response.data, `采购订单_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出库存商品数据
 */
export const exportStockItems = async () => {
  try {
    const response = await api.get('/export/stock-items', { responseType: 'blob' });
    downloadBlob(response.data, `库存商品_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出供应商数据
 */
export const exportSuppliers = async () => {
  try {
    const response = await api.get('/export/suppliers', { responseType: 'blob' });
    downloadBlob(response.data, `供应商数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出在途商品数据
 */
export const exportInTransit = async () => {
  try {
    const response = await api.get('/export/in-transit', { responseType: 'blob' });
    downloadBlob(response.data, `在途商品_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 导出入库记录数据
 */
export const exportInbound = async () => {
  try {
    const response = await api.get('/export/inbound', { responseType: 'blob' });
    downloadBlob(response.data, `入库记录_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
};

/**
 * 使用fetch下载文件(带进度)
 */
export const downloadExcelWithProgress = async (
  url: string,
  filename: string,
  onProgress?: (percent: number) => void
): Promise<void> => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress(percent);
        }
      },
    });

    downloadBlob(response.data, filename);
  } catch (error) {
    console.error('下载失败:', error);
    throw error;
  }
};

function downloadBlob(data: Blob | unknown, filename: string) {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export const exportService = {
  exportOrders,
  exportUsers,
  exportFinancial,
  exportAll,
  exportPackages,
  exportProducts,
  exportServiceItems,
  exportCustomers,
  exportGroupBuys,
  exportPoints,
  exportTimeSlots,
  exportRefunds,
  exportPurchaseOrders,
  exportStockItems,
  exportSuppliers,
  exportInTransit,
  exportInbound,
  downloadExcelWithProgress,
};
