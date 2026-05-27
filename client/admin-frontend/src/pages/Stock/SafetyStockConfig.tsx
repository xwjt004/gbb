import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Select, Spin, Tag, Space, message, Statistic, Row, Col, InputNumber } from 'antd';
import { SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { inventoryIntelligenceService } from '@/services/inventoryIntelligence';

const SafetyStockConfig: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [calcLoading, setCalcLoading] = useState(false);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [demandPeriod, setDemandPeriod] = useState(90);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.getSafetyStock({ page, pageSize: pagination.pageSize });
      setData(res.data?.items || []);
      setPagination(res.data?.pagination || { current: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBatchCalc = async () => {
    setCalcLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.batchCalculateSafetyStock({ serviceLevel, demandPeriodDays: demandPeriod });
      message.success(`计算完成: ${res.data?.updated || 0} 个产品已更新`);
      fetchData();
    } catch (err: any) {
      message.error('计算失败: ' + (err.message || '未知错误'));
    } finally {
      setCalcLoading(false);
    }
  };

  const columns = [
    { title: '产品名称', dataIndex: 'name', key: 'name' },
    { title: '产品编号', dataIndex: 'productNo', key: 'productNo' },
    { title: '当前库存', dataIndex: 'stockQuantity', key: 'stockQuantity' },
    { title: '日消耗量', dataIndex: 'dailyConsumption', key: 'dailyConsumption' },
    {
      title: '安全库存', dataIndex: 'safetyStock', key: 'safetyStock',
      render: (v: number) => <Tag color={v > 0 ? 'blue' : 'default'}>{v}</Tag>,
    },
    { title: '再订货点', dataIndex: 'reorderPoint', key: 'reorderPoint', render: (v: number | null) => v ?? '-' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="安全库存配置" style={{ marginBottom: 16 }}>
        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="产品总数" value={pagination.total} prefix={<SafetyCertificateOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="已配置安全库存" value={data.filter((d: any) => d.safetyStock > 0).length} />
          </Col>
        </Row>

        <Space style={{ marginBottom: 16 }}>
          <span>服务水平:</span>
          <Select value={serviceLevel} onChange={setServiceLevel} style={{ width: 120 }}>
            <Select.Option value={0.9}>90%</Select.Option>
            <Select.Option value={0.95}>95%</Select.Option>
            <Select.Option value={0.975}>97.5%</Select.Option>
            <Select.Option value={0.99}>99%</Select.Option>
          </Select>
          <span>需求周期:</span>
          <InputNumber value={demandPeriod} onChange={(v) => setDemandPeriod(v || 90)} min={30} max={365} addonAfter="天" />
          <Button type="primary" icon={<ReloadOutlined />} loading={calcLoading} onClick={handleBatchCalc}>
            批量计算
          </Button>
          <Button onClick={() => fetchData()}>刷新</Button>
        </Space>

        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            pagination={pagination}
            onChange={(p) => fetchData(p.current)}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default SafetyStockConfig;
