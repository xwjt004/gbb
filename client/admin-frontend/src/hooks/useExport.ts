import { useState } from 'react';
import { message } from 'antd';
import { downloadFile } from '@/utils/helpers';
import * as XLSX from 'xlsx';

interface ExportOptions {
  filename?: string;
  format?: 'xlsx' | 'csv' | 'json';
}

export const useExport = () => {
  const [loading, setLoading] = useState(false);

  // 真正的Excel导出功能
  const exportToExcel = async (data: any[], options: ExportOptions = {}) => {
    const { filename = 'export' } = options;
    
    try {
      setLoading(true);
      
      if (!data || data.length === 0) {
        message.warning('没有数据可导出');
        return;
      }

      // 创建工作表
      const ws = XLSX.utils.json_to_sheet(data);
      
      // 创建工作簿
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // 写入文件
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      downloadFile(blob, `${filename}.xlsx`);
      message.success('导出成功');
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出为CSV
  const exportToCSV = async (data: any[], filename: string = 'export') => {
    try {
      setLoading(true);
      
      if (!data || data.length === 0) {
        message.warning('没有数据可导出');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // 处理包含逗号的值
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      downloadFile(blob, `${filename}.csv`);
      message.success('导出成功');
    } catch (error) {
      console.error('CSV export error:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出为JSON
  const exportToJSON = async (data: any[], filename: string = 'export') => {
    try {
      setLoading(true);
      
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { 
        type: 'application/json;charset=utf-8;' 
      });
      
      downloadFile(blob, `${filename}.json`);
      message.success('导出成功');
    } catch (error) {
      console.error('JSON export error:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量导出
  const exportData = async (
    data: any[], 
    format: 'xlsx' | 'csv' | 'json' = 'xlsx',
    filename: string = 'export'
  ) => {
    switch (format) {
      case 'xlsx':
        return exportToExcel(data, { filename, format });
      case 'csv':
        return exportToCSV(data, filename);
      case 'json':
        return exportToJSON(data, filename);
      default:
        message.error('不支持的导出格式');
    }
  };

  return {
    loading,
    exportToExcel,
    exportToCSV,
    exportToJSON,
    exportData,
  };
};

export default useExport;
