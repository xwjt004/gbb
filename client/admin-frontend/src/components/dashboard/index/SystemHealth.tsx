import React from 'react';
import { Alert, Space, Divider, Badge, Button } from 'antd';
import { CheckCircleOutlined, BellOutlined } from '@ant-design/icons';

const SystemHealth: React.FC<any> = ({ systemHealth = {}, notifications = [] }) => {
  const formatPct = (v: any) => {
    if (v === null || v === undefined || v === '') return '%';
    // 如果是数字则附带百分号，如果已经是字符串且包含 % 则直接返回
    if (typeof v === 'number') return `${v}%`;
    if (typeof v === 'string') return v.includes('%') ? v : `${v}%`;
    return '%';
  };

  const cpuText = formatPct(systemHealth.cpu);
  const memText = formatPct(systemHealth.memory);
  const diskText = formatPct(systemHealth.disk);

  return (
    <Alert
      message={(
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>系统运行正常</span>
          <Badge count={(notifications || []).filter((n: any) => !n.read).length} size="small">
            <Button type="text" icon={<BellOutlined />} size="small">通知</Button>
          </Badge>
        </Space>
      )}
      description={(
        <Space split={<Divider type="vertical" />}>
          <span>CPU: {cpuText}</span>
          <span>内存: {memText}</span>
          <span>磁盘: {diskText}</span>
          <span>网络: 正常</span>
        </Space>
      )}
      type="success"
      showIcon={false}
      style={{ borderRadius: 8 }}
    />
  );
};

export default SystemHealth;
