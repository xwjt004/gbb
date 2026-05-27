/**
 * 数据导出工具函数
 */

// 将数据转换为CSV格式
export const convertToCSV = (data: any[]): string => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 处理特殊字符
        if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};

// 将数据转换为简单的Excel XML格式
export const convertToExcelXML = (data: any[], sheetName: string = 'Sheet1'): string => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  
  const xmlHeader = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
<Worksheet ss:Name="${sheetName}">
<Table>`;

  const xmlFooter = `</Table>
</Worksheet>
</Workbook>`;

  // 构建表头
  const headerRow = `<Row>
${headers.map(header => `<Cell><Data ss:Type="String">${header}</Data></Cell>`).join('')}
</Row>`;

  // 构建数据行
  const dataRows = data.map(row => `<Row>
${headers.map(header => {
  const value = row[header] ?? '';
  const type = typeof value === 'number' ? 'Number' : 'String';
  return `<Cell><Data ss:Type="${type}">${value}</Data></Cell>`;
}).join('')}
</Row>`).join('');

  return xmlHeader + headerRow + dataRows + xmlFooter;
};

// 创建并下载文件
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
