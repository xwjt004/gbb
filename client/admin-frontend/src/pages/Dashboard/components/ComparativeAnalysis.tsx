import React from 'react';
import { Card, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { ComparativeResult } from '@/services/dataDashboard';

interface ComparativeAnalysisProps {
  data: ComparativeResult | null;
}

const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({ data }) => {
  if (!data) return null;

  const columns = [
    { title: '指标', dataIndex: 'metric', key: 'metric', width: 150 },
    { title: '当前周期', dataIndex: 'current', key: 'current', width: 120 },
    { title: '对比周期', dataIndex: 'previous', key: 'previous', width: 120 },
    {
      title: '变化', dataIndex: 'change', key: 'change', width: 120,
      render: (_: any, r: any) => {
        const val = parseFloat(r.change);
        if (isNaN(val) || val === 0) return <Tag>{r.change}%</Tag>;
        return val > 0
          ? <Tag color="green"><ArrowUpOutlined /> {r.change}%</Tag>
          : <Tag color="red"><ArrowDownOutlined /> {Math.abs(val)}%</Tag>;
      },
    },
  ];

  const rows = [
    { key: 'revenue', metric: '营收', current: `¥${data.current.revenue.toLocaleString()}`, previous: `¥${data.previous.revenue.toLocaleString()}`, change: data.comparison.revenueGrowth },
    { key: 'orders', metric: '订单量', current: data.current.orders, previous: data.previous.orders, change: data.comparison.ordersGrowth },
    { key: 'aov', metric: '客单价', current: `¥${data.current.avgOrderValue}`, previous: `¥${data.previous.avgOrderValue}`, change: data.comparison.avgOrderValueGrowth },
    { key: 'refundRate', metric: '退款率', current: `${data.current.refundRate}%`, previous: `${data.previous.refundRate}%`, change: data.comparison.refundRateChange },
  ];

  return (
    <Card title="对比分析（环比）" style={{ marginTop: 16 }}>
      <Table
        dataSource={rows}
        columns={columns}
        pagination={false}
        bordered
        size="middle"
      />
    </Card>
  );
};

export default ComparativeAnalysis;
