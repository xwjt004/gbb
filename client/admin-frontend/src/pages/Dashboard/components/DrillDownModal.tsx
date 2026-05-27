import React, { useEffect, useState } from 'react';
import { Modal, Table, Card, Col, Row, Statistic, Spin } from 'antd';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dataDashboardService, RevenueAnalysis } from '@/services/dataDashboard';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface DrillDownModalProps {
  visible: boolean;
  title: string;
  dimension: 'package' | 'channel';
  onClose: () => void;
}

const DrillDownModal: React.FC<DrillDownModalProps> = ({ visible, title, dimension, onClose }) => {
  const [data, setData] = useState<RevenueAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      dataDashboardService.getRevenueAnalysis(dimension, 'thisMonth')
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [visible, dimension]);

  const columns = [
    { title: '类别', dataIndex: 'category', key: 'category' },
    { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v}%` },
    { title: '数量', dataIndex: 'count', key: 'count' },
  ];

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <Spin spinning={loading}>
        {data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic title="总金额" value={data.total} prefix="¥" precision={0} />
                </Card>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.category} ${entry.percentage}%`}
                    >
                      {data.breakdown.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Col>
              <Col span={12}>
                <Table
                  dataSource={data.breakdown}
                  columns={columns}
                  pagination={false}
                  size="small"
                  bordered
                />
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default DrillDownModal;
