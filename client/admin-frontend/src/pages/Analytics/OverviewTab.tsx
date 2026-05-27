import React from 'react';
import { Card, Row, Col, Statistic, Spin, Empty } from 'antd';
import {
  UserOutlined, ShoppingCartOutlined, DollarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { OverviewData, BehaviorAnalytics, LoyaltyAnalytics } from '@/services/analyticsService';

interface Props {
  overview: OverviewData | null;
  behavior: BehaviorAnalytics | null;
  loyalty: LoyaltyAnalytics | null;
  loading: boolean;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

const OverviewTab: React.FC<Props> = ({ overview, behavior, loyalty, loading }) => {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!overview && !behavior) return <Empty description="暂无数据" />;

  const userStats = overview?.user_analytics;
  const behaviorStats = overview?.behavior_analytics;
  const loyaltyStats = overview?.loyalty_analytics;

  const orderTrends = behavior?.order_trends || [];
  const segmentation = loyalty?.customer_segmentation;

  const trendOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['订单量', '营收'], bottom: 0 },
    grid: { left: 50, right: 30, bottom: 40 },
    xAxis: { type: 'category' as const, data: orderTrends.map(d => dayjs(d.date).format('MM-DD')) },
    yAxis: [
      { type: 'value' as const, name: '订单量' },
      { type: 'value' as const, name: '营收(元)' },
    ],
    series: [
      {
        name: '订单量', type: 'bar', data: orderTrends.map(d => d.order_count),
        itemStyle: { color: '#1890ff' },
      },
      {
        name: '营收', type: 'line', yAxisIndex: 1,
        data: orderTrends.map(d => d.total_amount),
        itemStyle: { color: '#52c41a' }, smooth: true,
      },
    ],
  };

  const segOption = segmentation ? {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { value: segmentation.vip, name: 'VIP', itemStyle: { color: '#f5222d' } },
        { value: segmentation.gold, name: '黄金', itemStyle: { color: '#faad14' } },
        { value: segmentation.silver, name: '白银', itemStyle: { color: '#1890ff' } },
        { value: segmentation.regular, name: '常规', itemStyle: { color: '#52c41a' } },
        { value: segmentation.new, name: '新客', itemStyle: { color: '#d9d9d9' } },
      ],
      label: { show: true, formatter: '{b}: {c}' },
    }],
  } : null;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总用户" value={userStats?.total_users || 0} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总订单" value={behaviorStats?.total_orders || 0} prefix={<ShoppingCartOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总营收"
              value={behaviorStats?.total_revenue || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="复购率"
              value={loyaltyStats?.loyalty_rate || 0}
              suffix="%"
              precision={1}
              valueStyle={{ color: (loyaltyStats?.loyalty_rate || 0) > 30 ? '#3f8600' : '#cf1322' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="订单 & 营收趋势">
            <ReactECharts option={trendOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="客户分层">
            {segOption ? <ReactECharts option={segOption} style={{ height: 300 }} /> : <Empty />}
          </Card>
        </Col>
      </Row>

      {behavior?.payment_behavior && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="支付概况">
              <Row gutter={24}>
                <Col span={6}><Statistic title="总订单" value={behavior.payment_behavior.total_orders} /></Col>
                <Col span={6}><Statistic title="已付清" value={behavior.payment_behavior.paid_orders} valueStyle={{ color: '#3f8600' }} /></Col>
                <Col span={6}><Statistic title="部分付款" value={behavior.payment_behavior.partial_paid_orders} valueStyle={{ color: '#faad14' }} /></Col>
                <Col span={6}><Statistic title="付款率" value={behavior.payment_behavior.payment_rate} suffix="%" precision={1} /></Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default OverviewTab;
