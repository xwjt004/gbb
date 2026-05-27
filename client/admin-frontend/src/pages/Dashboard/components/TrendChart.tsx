import React, { useState } from 'react';
import { Card, Tabs } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ComprehensiveTrendItem } from '@/services/dataDashboard';

interface TrendChartProps {
  data: ComprehensiveTrendItem[];
}

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [tab, setTab] = useState('revenue');

  const chartConfigs: Record<string, { lines: { key: string; color: string; name: string }[]; yKey?: string }> = {
    revenue: {
      lines: [
        { key: 'revenue', color: '#3b82f6', name: '营收' },
        { key: 'paidAmount', color: '#10b981', name: '实收' },
      ],
    },
    orders: {
      lines: [
        { key: 'orderCount', color: '#f59e0b', name: '订单量' },
      ],
    },
    refunds: {
      lines: [
        { key: 'refundAmount', color: '#ef4444', name: '退款金额' },
      ],
    },
    comprehensive: {
      lines: [
        { key: 'avgOrderValue', color: '#8b5cf6', name: '客单价' },
        { key: 'conversionRate', color: '#ec4899', name: '转化率(%)' },
      ],
    },
  };

  const config = chartConfigs[tab] || chartConfigs.revenue;

  return (
    <Card title="订单资金趋势" style={{ marginTop: 16 }}>
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'revenue', label: '营收趋势' },
          { key: 'orders', label: '订单趋势' },
          { key: 'refunds', label: '退款趋势' },
          { key: 'comprehensive', label: '综合对比' },
        ]}
      />
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: any, name: any) => {
              if (name === '营收' || name === '实收' || name === '客单价' || name === '退款金额') {
                return [`¥${Number(value).toFixed(2)}`, name];
              }
              if (name === '转化率(%)') {
                return [`${value}%`, name];
              }
              return [value, name];
            }}
          />
          <Legend />
          {config.lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.name}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TrendChart;
