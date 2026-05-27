import React from 'react';
import { Card, Row, Col, Table, Spin, Empty, Tag } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { PackageAnalytics } from '@/services/analyticsService';

interface Props {
  pkg: PackageAnalytics | null;
  loading: boolean;
}

const PackageTab: React.FC<Props> = ({ pkg, loading }) => {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!pkg) return <Empty description="暂无数据" />;

  const popular = pkg.popular_packages || [];
  const revenue = pkg.package_revenue || [];

  const popBarOption = popular.length > 0 ? {
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 40, bottom: 30 },
    xAxis: { type: 'value' as const, name: '订单数' },
    yAxis: { type: 'category' as const, data: popular.map(d => d.package_name).reverse() },
    series: [{
      type: 'bar', data: popular.map(d => d.order_count).reverse(),
      itemStyle: { color: '#1890ff' },
      label: { show: true, position: 'right' },
    }],
  } : null;

  const revPieOption = revenue.length > 0 ? {
    tooltip: { trigger: 'item' as const, formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['30%', '60%'],
      data: revenue.map(d => ({ name: d.package_name, value: d.revenue })),
      label: { show: true, formatter: '{b}\n¥{c}' },
    }],
  } : null;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={
              <span><CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />热门套餐排行</span>
            }
          >
            <Table
              rowKey="package_id"
              dataSource={popular}
              pagination={false}
              columns={[
                {
                  title: '排名', width: 60,
                  render: (_: any, __: any, idx: number) => {
                    const colors = ['#f5222d', '#faad14', '#1890ff'];
                    return <Tag color={colors[idx] || '#d9d9d9'}>{idx + 1}</Tag>;
                  },
                },
                { title: '套餐名称', dataIndex: 'package_name' },
                { title: '订单数', dataIndex: 'order_count' },
                {
                  title: '总营收', dataIndex: 'total_revenue',
                  render: (v: number) => `¥${v.toFixed(2)}`,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="套餐热度 (按订单数)">
            {popBarOption ? <ReactECharts option={popBarOption} style={{ height: 300 }} /> : <Empty />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="套餐营收分布">
            {revPieOption ? <ReactECharts option={revPieOption} style={{ height: 300 }} /> : <Empty />}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PackageTab;
