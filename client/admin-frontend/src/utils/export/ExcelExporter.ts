import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any) => any;
}

export interface ExcelExportOptions {
  filename?: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: any[];
  autoFilter?: boolean;
  freeze?: { row?: number; col?: number };
}

/**
 * Excel导出工具类
 * 提供统一的Excel文件导出功能
 */
export class ExcelExporter {
  /**
   * 导出Excel文件
   * @param options 导出选项
   */
  static export(options: ExcelExportOptions): void {
    const {
      filename = `导出数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`,
      sheetName = 'Sheet1',
      columns,
      data,
      autoFilter = true,
      freeze,
    } = options;

    if (!data || data.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 格式化数据
    const formattedData = data.map(row => {
      const formattedRow: any = {};
      columns.forEach(col => {
        const value = row[col.key];
        formattedRow[col.header] = col.format ? col.format(value) : value;
      });
      return formattedRow;
    });

    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // 设置列宽
    ws['!cols'] = columns.map(col => ({
      wch: col.width || 15,
    }));

    // 设置自动筛选
    if (autoFilter && data.length > 0) {
      ws['!autofilter'] = { 
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: data.length, c: columns.length - 1 }
        })
      };
    }

    // 设置冻结窗格(冻结首行)
    if (freeze) {
      ws['!freeze'] = {
        xSplit: freeze.col || 0,
        ySplit: freeze.row || 1,
        topLeftCell: XLSX.utils.encode_cell({
          r: freeze.row || 1,
          c: freeze.col || 0
        }),
        activePane: 'bottomRight',
        state: 'frozen'
      };
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 导出文件
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    saveAs(blob, `${filename}.xlsx`);
  }

  /**
   * 导出多Sheet Excel
   * @param sheets Sheet配置数组
   * @param filename 文件名
   */
  static exportMultiSheet(sheets: ExcelExportOptions[], filename?: string): void {
    if (!sheets || sheets.length === 0) {
      throw new Error('没有Sheet数据可导出');
    }

    const wb = XLSX.utils.book_new();

    sheets.forEach(sheet => {
      if (!sheet.data || sheet.data.length === 0) {
        console.warn(`Sheet "${sheet.sheetName}" 没有数据,跳过`);
        return;
      }

      const formattedData = sheet.data.map(row => {
        const formattedRow: any = {};
        sheet.columns.forEach(col => {
          const value = row[col.key];
          formattedRow[col.header] = col.format ? col.format(value) : value;
        });
        return formattedRow;
      });

      const ws = XLSX.utils.json_to_sheet(formattedData);
      ws['!cols'] = sheet.columns.map(col => ({ wch: col.width || 15 }));
      
      if (sheet.autoFilter) {
        ws['!autofilter'] = { 
          ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: sheet.data.length, c: sheet.columns.length - 1 }
          })
        };
      }
      
      XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName || 'Sheet');
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const finalFilename = filename || `多表导出_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`;
    saveAs(blob, `${finalFilename}.xlsx`);
  }

  /**
   * 导出CSV文件
   * @param options 导出选项
   */
  static exportCSV(options: ExcelExportOptions): void {
    const {
      filename = `导出数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}`,
      columns,
      data,
    } = options;

    if (!data || data.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 格式化数据
    const formattedData = data.map(row => {
      const formattedRow: any = {};
      columns.forEach(col => {
        const value = row[col.key];
        formattedRow[col.header] = col.format ? col.format(value) : value;
      });
      return formattedRow;
    });

    // 创建CSV内容
    const headers = columns.map(col => col.header);
    const csvContent = [
      headers.join(','),
      ...formattedData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          // 处理包含逗号或换行的值
          if (String(value).includes(',') || String(value).includes('\n')) {
            return `"${String(value).replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // 添加BOM以支持Excel正确显示中文
    const blob = new Blob(['\uFEFF' + csvContent], { 
      type: 'text/csv;charset=utf-8' 
    });
    
    saveAs(blob, `${filename}.csv`);
  }
}
