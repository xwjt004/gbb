import React from 'react';
import { Card, Space, Badge, Select, Progress, Typography, Tooltip } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const KeyMetricsPanel: React.FC<any> = ({ userStats, orderStats }) => {
  return (
    <Card
      title={(
        <Space>
          <span>关键业务指标</span>
          <Badge count={4} size="small" />
        </Space>
      )}
      style={{ marginBottom: 16 }}
      extra={(
        <Select defaultValue="today" size="small" style={{ width: 80 }}>
          <Select.Option value="today">今日</Select.Option>
          <Select.Option value="week">本周</Select.Option>
          <Select.Option value="month">本月</Select.Option>
        </Select>
      )}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <span style={{ color: '#a0a0b8' }}>订单转化率</span>
              <Tooltip title="访客转化为付费用户的比例，反映营销效果">
                <ExclamationCircleOutlined style={{ color: '#d4a373', fontSize: 12 }} />
              </Tooltip>
            </Space>
            <Text strong style={{ color: '#00e5ff' }}>{Number(orderStats.conversionRate || 0).toFixed(1)}%</Text>
          </div>
          <Progress percent={orderStats.conversionRate} status="active" strokeColor={{ '0%': '#d4a373', '100%': '#f8e7c1' }} format={(p?: number) => `${(p || 0)}%`} />
        </div>

        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <span style={{ color: '#a0a0b8' }}>VIP用户占比</span>
              <Badge count={userStats.vipUsers} overflowCount={999} size="small" style={{ backgroundColor: '#d4a373' }} />
            </Space>
            <Text strong style={{ color: '#d4a373' }}>{userStats.totalUsers > 0 ? ((Number(userStats.vipUsers || 0) / Number(userStats.totalUsers || 1) * 100).toFixed(1)) : '0'}%</Text>
          </div>
          <Progress percent={userStats.totalUsers > 0 ? (userStats.vipUsers / userStats.totalUsers) * 100 : 0} strokeColor={{ '0%': '#d4a373', '100%': '#b8860b' }} format={(p?: number) => `${((p || 0).toFixed(1))}%`} />
        </div>

        <div>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <span style={{ color: '#a0a0b8' }}>订单完成率</span>
              <Tooltip title="已完成订单占总订单的比例"><CheckCircleOutlined style={{ color: '#d4a373', fontSize: 12 }} /></Tooltip>
            </Space>
            <Text strong style={{ color: '#7c4dff' }}>{orderStats.totalOrders > 0 ? ((Number(orderStats.completedOrders || 0) / Number(orderStats.totalOrders || 1) * 100).toFixed(1)) : '0'}%</Text>
          </div>
          <Progress percent={orderStats.totalOrders > 0 ? (orderStats.completedOrders / orderStats.totalOrders) * 100 : 0} strokeColor={{ '0%': '#7c4dff', '100%': '#00e5ff' }} format={(p?: number) => `${((p || 0).toFixed(1))}%`} />
        </div>
      </Space>
    </Card>
  );
};

export default KeyMetricsPanel;
