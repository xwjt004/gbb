const API_BASE_URL = '/api/v1';

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

  const url = `${API_BASE_URL}/export/orders${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  // 使用window.open直接下载
  window.open(url, '_blank');
};

/**
 * 导出用户数据(后端生成Excel)
 */
export const exportUsers = async () => {
  const url = `${API_BASE_URL}/export/users`;
  window.open(url, '_blank');
};

/**
 * 导出财务数据(后端生成Excel)
 */
export const exportFinancial = async (params: FinancialExportParams) => {
  const queryParams = new URLSearchParams();
  queryParams.append('startDate', params.startDate);
  queryParams.append('endDate', params.endDate);
  
  const url = `${API_BASE_URL}/export/financial?${queryParams.toString()}`;
  window.open(url, '_blank');
};

/**
 * 导出全部数据(后端生成Excel,多Sheet)
 */
export const exportAll = async () => {
  const url = `${API_BASE_URL}/export/all`;
  window.open(url, '_blank');
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
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (onProgress && total > 0) {
        const percent = Math.round((receivedLength / total) * 100);
        onProgress(percent);
      }
    }

    // 合并所有chunks
    const chunksAll = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      chunksAll.set(chunk, position);
      position += chunk.length;
    }

    const blob = new Blob([chunksAll], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 下载文件
    const link = document.createElement('a');
    const blobUrl = URL.createObjectURL(blob);
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('下载失败:', error);
    throw error;
  }
};

export const exportService = {
  exportOrders,
  exportUsers,
  exportFinancial,
  exportAll,
  downloadExcelWithProgress,
};
