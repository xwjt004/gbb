import React from 'react';
import { Card, Row, Col, Statistic, Table, Spin, Empty, Tag } from 'antd';
import { UserOutlined, TeamOutlined, PlusCircleOutlined, RiseOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { UserAnalytics, LoyaltyAnalytics } from '@/services/analyticsService';

interface Props {
  user: UserAnalytics | null;
  loyalty: LoyaltyAnalytics | null;
  loading: boolean;
}

const segmentColors: Record<string, string> = {
  vip: '#f5222d', gold: '#faad14', silver: '#1890ff',
  regular: '#52c41a', new: '#d9d9d9',
};
const segmentLabels: Record<string, string> = {
  vip: 'VIP客户', gold: '黄金客户', silver: '白银客户',
  regular: '常规客户', new: '新客户',
};

const CustomerTab: React.FC<Props> = ({ user, loyalty, loading }) => {
  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!user && !loyalty) return <Empty description="暂无数据" />;

  const growthData = user?.user_growth || [];
  const segmentation = loyalty?.customer_segmentation;
  const repeatCustomers = loyalty?.repeat_customers || [];

  const growthOption = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 50, right: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: growthData.map(d => dayjs(d.date).format('MM-DD')) },
    yAxis: { type: 'value' as const, name: '新增数' },
    series: [{
      type: 'bar', data: growthData.map(d => d.count),
      itemStyle: { color: '#1890ff' },
    }],
  };

  const segPieOption = segmentation ? {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: '60%',
      data: Object.entries(segmentation).map(([k, v]) => ({
        name: segmentLabels[k] || k,
        value: v,
        itemStyle: { color: segmentColors[k] },
      })),
      label: { show: true, formatter: '{b}\n{d}%' },
    }],
  } : null;

  const totalSeg = segmentation ? Object.values(segmentation).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="总用户" value={user?.total_users || 0} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="新增用户" value={user?.new_users || 0} prefix={<PlusCircleOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="活跃用户" value={user?.active_users || 0} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="复购率" value={loyalty?.loyalty_trends?.[0]?.loyalty_rate || 0} suffix="%" precision={1} prefix={<RiseOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="用户增长趋势">
            <ReactECharts option={growthOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="客户分层 (共{totalSeg}人)">
            {segPieOption ? <ReactECharts option={segPieOption} style={{ height: 300 }} /> : <Empty />}
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="客户分层明细">
            {segmentation ? (
              <Table
                rowKey="level"
                dataSource={Object.entries(segmentation).map(([k, v]) => ({
                  level: k, count: v, rate: totalSeg > 0 ? ((v / totalSeg) * 100).toFixed(1) : '0',
                }))}
                pagination={false}
                columns={[
                  {
                    title: '层级', dataIndex: 'level',
                    render: (v: string) => <Tag color={segmentColors[v]}>{segmentLabels[v] || v}</Tag>,
                  },
                  { title: '人数', dataIndex: 'count' },
                  { title: '占比', dataIndex: 'rate', render: (v: string) => `${v}%` },
                ]}
              />
            ) : <Empty />}
          </Card>
        </Col>
      </Row>

      {repeatCustomers.length > 0 && (
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="复购客户">
              <Table
                rowKey="user_id"
                dataSource={repeatCustomers}
                pagination={{ pageSize: 5, showSizeChanger: false }}
                columns={[
                  { title: '昵称', dataIndex: 'nickname' },
                  { title: '订单数', dataIndex: 'order_count' },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default CustomerTab;
