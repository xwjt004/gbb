import React from 'react';
import { Card, Row, Col, Statistic, Spin, Empty } from 'antd';
import { ShoppingCartOutlined, PercentageOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { BehaviorAnalytics, PackageAnalytics } from '@/services/analyticsService';

interface Props {
  behavior: BehaviorAnalytics | null;
  pkg: PackageAnalytics | null;
  loading: boolean;
}

const RevenueTab: React.FC<Props> = ({ behavior, pkg, loading }) => {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!behavior && !pkg) return <Empty description="暂无数据" />;

  const trendData = behavior?.order_trends || [];

  const revenueTrendOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: trendData.map(d => dayjs(d.date).format('MM-DD')) },
    yAxis: { type: 'value' as const, name: '金额(元)' },
    series: [{
      name: '营收', type: 'line', data: trendData.map(d => d.total_amount),
      areaStyle: { color: 'rgba(82, 196, 26, 0.2)' },
      itemStyle: { color: '#52c41a' }, smooth: true, showSymbol: false,
    }],
  };

  const revenueByPackage = pkg?.package_revenue || [];
  const pkgBarOption = revenueByPackage.length > 0 ? {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 20, bottom: 30 },
    xAxis: { type: 'value' as const, name: '营收(元)' },
    yAxis: { type: 'category' as const, data: revenueByPackage.map(d => d.package_name).reverse() },
    series: [{
      type: 'bar', data: revenueByPackage.map(d => d.revenue).reverse(),
      itemStyle: { color: '#1890ff' }, label: { show: true, position: 'right' },
    }],
  } : null;

  const paymentBehavior = behavior?.payment_behavior;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="营收趋势">
            <ReactECharts option={revenueTrendOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="支付概览">
            {paymentBehavior ? (
              <div>
                <Statistic title="总订单" value={paymentBehavior.total_orders} prefix={<ShoppingCartOutlined />} />
                <div style={{ marginTop: 16 }}>
                  <Statistic title="已付清" value={paymentBehavior.paid_orders} valueStyle={{ color: '#3f8600' }} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <Statistic title="部分付款" value={paymentBehavior.partial_paid_orders} valueStyle={{ color: '#faad14' }} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <Statistic title="付款率" value={paymentBehavior.payment_rate} suffix="%" precision={1} prefix={<PercentageOutlined />} />
                </div>
              </div>
            ) : <Empty />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="套餐营收排名">
            {pkgBarOption ? (
              <ReactECharts option={pkgBarOption} style={{ height: Math.max(200, revenueByPackage.length * 40) }} />
            ) : <Empty />}
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="转化率">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic
                  title="浏览→下单"
                  value={behavior?.conversion_rates?.browse_to_order || 0}
                  suffix="%"
                  precision={1}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="下单→支付"
                  value={behavior?.conversion_rates?.order_to_payment || 0}
                  suffix="%"
                  precision={1}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RevenueTab;
