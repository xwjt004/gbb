import React from 'react';
import { Card, Statistic, Row, Col, Table } from 'antd';
import { RefundAnalysis } from '../../../pages/Dashboard/dashboardTypes';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { chartThemes } from '../../../config/chartThemes';

interface Props {
  refundAnalysis: RefundAnalysis;
  themeKey: keyof typeof chartThemes;
}

export const RefundDetails: React.FC<Props> = ({ refundAnalysis, themeKey }) => {
  const theme = chartThemes[themeKey] || chartThemes.default;

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="退款统计概览">
            <Row gutter={[16, 16]}>
              <Col span={6}><Statistic title="总退款数" value={refundAnalysis.summary.totalRefunds} suffix="笔" /></Col>
              <Col span={6}><Statistic title="退款总额" value={refundAnalysis.summary.totalAmount} prefix="¥" precision={2} /></Col>
              <Col span={6}><Statistic title="退款率" value={refundAnalysis.summary.refundRate} suffix="%" /></Col>
              <Col span={6}><Statistic title="平均退款金额" value={refundAnalysis.summary.avgRefundAmount} prefix="¥" precision={2} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="退款趋势">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={refundAnalysis.trend} style={{ backgroundColor: theme.backgroundColor }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                <XAxis dataKey="date" stroke={theme.textColor} />
                <YAxis stroke={theme.textColor} />
                <Tooltip contentStyle={{ backgroundColor: theme.tooltipBackground, color: theme.tooltipText, border: `1px solid ${theme.gridColor}` }} />
                <Legend wrapperStyle={{ color: theme.textColor }} />
                <Bar dataKey="count" fill={theme.colors[0]} name="退款笔数" animationDuration={1000} animationBegin={0} animationEasing="ease-in-out" />
                <Bar dataKey="amount" fill={theme.colors[1]} name="退款金额" animationDuration={1000} animationBegin={200} animationEasing="ease-in-out" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="退款原因分析">
            {refundAnalysis.byReason && refundAnalysis.byReason.length > 0 ? (
              <Table
                dataSource={refundAnalysis.byReason}
                rowKey="reason"
                columns={[
                  { title: '退款原因', dataIndex: 'reason', key: 'reason' },
                  { title: '数量', dataIndex: 'count', key: 'count' },
                  { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (p: number) => `${p}%` }
                ]}
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}><span>暂无退款原因数据</span></div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default RefundDetails;
