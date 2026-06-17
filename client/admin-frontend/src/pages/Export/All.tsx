import React, { useState } from 'react';
import {
  Card, Button, Space, message, Alert, Tag,
} from 'antd';
import {
  DownloadOutlined,
} from '@ant-design/icons';
import { exportService } from '@/services/export';

const ExportAll: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportService.exportAll();
      message.success('完整数据导出已开始，文件正在下载...');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const sheets = [
    { key: 'orders', label: '订单数据', desc: '所有订单信息，含用户、套餐、金额、状态' },
    { key: 'users', label: '员工数据', desc: '所有注册员工基本信息' },
    { key: 'payments', label: '财务数据', desc: '所有支付记录含金额和状态' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="完整数据导出" variant="borderless">
        <Alert
          message="功能说明"
          description="导出系统中的全部核心数据，生成包含多个 Sheet 的 Excel 文件（订单数据、员工数据、财务数据）。适合全量备份和离线分析。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>导出内容（共 3 个 Sheet）：</div>
          <Space direction="vertical" style={{ width: '100%' }}>
            {sheets.map(s => (
              <div key={s.key}>
                <Tag color="blue">{s.label}</Tag>
                <span style={{ color: '#666', marginLeft: 8 }}>{s.desc}</span>
              </div>
            ))}
          </Space>
        </Card>

        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          loading={exporting}
        >
          导出全部数据 (Excel)
        </Button>
      </Card>
    </div>
  );
};

export default ExportAll;
