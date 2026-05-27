import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Select, InputNumber, Spin, Tag, Space, message, Row, Col, Statistic } from 'antd';
import { WarningOutlined, StopOutlined, DollarOutlined } from '@ant-design/icons';
import { inventoryIntelligenceService } from '@/services/inventoryIntelligence';

const statusColors: Record<string, string> = { SLOW_MOVING: 'orange', DEAD_STOCK: 'red', NORMAL: 'green' };

const SlowMovingAlerts: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalSlowMoving: 0, totalDeadStock: 0, totalStockValue: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [thresholdDays, setThresholdDays] = useState(90);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [checkLoading, setCheckLoading] = useState(false);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.getSlowMovingProducts({
        thresholdDays, status: statusFilter, page, pageSize: pagination.pageSize,
      });
      setData(res.data?.items || []);
      setSummary(res.data?.summary || { totalSlowMoving: 0, totalDeadStock: 0, totalStockValue: 0 });
      setPagination(res.data?.pagination || { current: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [thresholdDays, statusFilter]);

  const handleCheck = async () => {
    setCheckLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.checkSlowMoving();
      message.success(`检查完成: ${res.data?.slowMovingCount || 0} 个呆滞品, 创建 ${res.data?.alertsCreated || 0} 条预警`);
      fetchData();
    } catch (err: any) {
      message.error('检查失败');
    } finally {
      setCheckLoading(false);
    }
  };

  const columns = [
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '产品编号', dataIndex: 'productNo', key: 'productNo' },
    { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
    { title: '库存数量', dataIndex: 'stockQuantity', key: 'stockQuantity' },
    {
      title: '库存价值', dataIndex: 'stockValue', key: 'stockValue',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    {
      title: '最后出库', dataIndex: 'lastSaleDate', key: 'lastSaleDate',
      render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '从未出库',
    },
    { title: '闲置天数', dataIndex: 'daysSinceLastSale', key: 'daysSinceLastSale' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => (
        <Tag color={statusColors[v] || 'default'}>
          {v === 'SLOW_MOVING' ? '呆滞' : v === 'DEAD_STOCK' ? '死库存' : '正常'}
        </Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="呆滞库存预警" style={{ marginBottom: 16 }}>
        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="呆滞品" value={summary.totalSlowMoving} prefix={<WarningOutlined />} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={6}>
            <Statistic title="死库存" value={summary.totalDeadStock} prefix={<StopOutlined />} valueStyle={{ color: '#cf1322' }} />
          </Col>
          <Col span={6}>
            <Statistic title="占用资金" value={`¥${summary.totalStockValue.toLocaleString()}`} prefix={<DollarOutlined />} />
          </Col>
        </Row>

        <Space style={{ marginBottom: 16 }}>
          <span>闲置阈值:</span>
          <InputNumber value={thresholdDays} onChange={(v) => setThresholdDays(v || 90)} min={30} max={365} addonAfter="天" />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }} allowClear placeholder="状态">
            <Select.Option value="SLOW_MOVING">呆滞</Select.Option>
            <Select.Option value="DEAD_STOCK">死库存</Select.Option>
          </Select>
          <Button type="primary" loading={checkLoading} onClick={handleCheck}>运行检查</Button>
          <Button onClick={() => fetchData()}>刷新</Button>
        </Space>

        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="productId"
            pagination={pagination}
            onChange={(p) => fetchData(p.current)}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default SlowMovingAlerts;
