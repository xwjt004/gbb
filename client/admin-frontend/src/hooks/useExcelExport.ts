import { useState } from 'react';
import { message } from 'antd';
import { ExcelExporter, ExcelExportOptions } from '@/utils/export/ExcelExporter';

/**
 * Excel导出Hook
 * 提供简单易用的导出功能和状态管理
 */
export const useExcelExport = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * 导出Excel文件
   * @param options 导出选项
   */
  const exportExcel = async (options: ExcelExportOptions) => {
    try {
      setLoading(true);
      setProgress(0);
      
      message.loading({ content: '正在生成Excel文件...', key: 'export', duration: 0 });
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 15;
          return next >= 90 ? 90 : next;
        });
      }, 100);

      // 执行导出
      ExcelExporter.export(options);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      message.success({ content: 'Excel文件导出成功!', key: 'export', duration: 2 });
    } catch (error: any) {
      console.error('Excel export error:', error);
      message.error({ 
        content: `导出失败: ${error.message || '未知错误'}`, 
        key: 'export',
        duration: 3
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  /**
   * 导出多Sheet Excel
   * @param sheets Sheet配置数组
   * @param filename 文件名
   */
  const exportMultiSheet = async (sheets: ExcelExportOptions[], filename?: string) => {
    try {
      setLoading(true);
      setProgress(0);
      
      message.loading({ content: '正在生成多表Excel文件...', key: 'export', duration: 0 });
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 10;
          return next >= 90 ? 90 : next;
        });
      }, 150);

      // 执行导出
      ExcelExporter.exportMultiSheet(sheets, filename);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      message.success({ content: 'Excel文件导出成功!', key: 'export', duration: 2 });
    } catch (error: any) {
      console.error('Multi-sheet export error:', error);
      message.error({ 
        content: `导出失败: ${error.message || '未知错误'}`, 
        key: 'export',
        duration: 3
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  /**
   * 导出CSV文件
   * @param options 导出选项
   */
  const exportCSV = async (options: ExcelExportOptions) => {
    try {
      setLoading(true);
      message.loading({ content: '正在生成CSV文件...', key: 'export', duration: 0 });
      
      ExcelExporter.exportCSV(options);
      
      message.success({ content: 'CSV文件导出成功!', key: 'export', duration: 2 });
    } catch (error: any) {
      console.error('CSV export error:', error);
      message.error({ 
        content: `导出失败: ${error.message || '未知错误'}`, 
        key: 'export',
        duration: 3
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    progress,
    exportExcel,
    exportMultiSheet,
    exportCSV,
  };
};
