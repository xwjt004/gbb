import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Spin, Tag, Space, Row, Col, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { inventoryIntelligenceService } from '@/services/inventoryIntelligence';

const SalesPrediction: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [method, setMethod] = useState('MA');
  const [periods, setPeriods] = useState(30);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.getSalesPrediction({ method, periods, page, pageSize: pagination.pageSize });
      setData(res.data?.items || []);
      setPagination(res.data?.pagination || { current: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [method, periods]);

  const handleProductClick = async (productId: number) => {
    setDetailLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.getProductSalesPrediction(productId, { method, periods });
      setDetailData(res.data);
      setSelectedProduct(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '产品编号', dataIndex: 'productNo', key: 'productNo' },
    { title: '当前库存', dataIndex: 'currentStock', key: 'currentStock' },
    { title: '预测日销量', dataIndex: 'forecastDaily', key: 'forecastDaily', render: (v: number) => v.toFixed(1) },
    { title: '预测月销量', dataIndex: 'forecastMonthly', key: 'forecastMonthly', render: (v: number) => Math.round(v) },
    {
      title: '置信度', dataIndex: 'confidence', key: 'confidence',
      render: (v: number) => {
        const color = v >= 0.7 ? 'green' : v >= 0.4 ? 'orange' : 'red';
        return <Tag color={color}>{(v * 100).toFixed(0)}%</Tag>;
      },
    },
    { title: '近30天销量', dataIndex: 'last30dSales', key: 'last30dSales' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="销量预测" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select value={method} onChange={setMethod} style={{ width: 120 }}>
            <Select.Option value="MA">移动平均</Select.Option>
            <Select.Option value="ES">指数平滑</Select.Option>
          </Select>
          <Select value={periods} onChange={setPeriods} style={{ width: 120 }}>
            <Select.Option value={7}>7天</Select.Option>
            <Select.Option value={30}>30天</Select.Option>
            <Select.Option value={90}>90天</Select.Option>
          </Select>
        </Space>

        <Spin spinning={loading}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey="productId"
            pagination={pagination}
            onChange={(p) => fetchData(p.current)}
            onRow={(record) => ({
              onClick: () => handleProductClick(record.productId),
              style: { cursor: 'pointer' },
            })}
            size="small"
          />
        </Spin>
      </Card>

      {selectedProduct && (
        <Card title={`预测详情 - ${selectedProduct.productName}`} style={{ marginBottom: 16 }}>
          <Spin spinning={detailLoading}>
            <Row gutter={24} style={{ marginBottom: 16 }}>
              <Col span={6}><Statistic title="当前库存" value={selectedProduct.currentStock} /></Col>
              <Col span={6}><Statistic title="预测日销量" value={selectedProduct.forecastDaily} suffix="件" /></Col>
              <Col span={6}><Statistic title="预测月销量" value={Math.round(selectedProduct.forecastMonthly)} suffix="件" /></Col>
              <Col span={6}>
                <Statistic title="置信度" value={detailData?.confidence ? `${(detailData.confidence * 100).toFixed(0)}%` : '-'} />
              </Col>
            </Row>

            {detailData?.historicalData && detailData.historicalData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={detailData.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="qty" stroke="#1890ff" name="实际销量" dot={false} />
                  {detailData.smoothedValues && (
                    <Line type="monotone" dataKey="smoothed" stroke="#52c41a" strokeDasharray="5 5" name="平滑值" dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Spin>
        </Card>
      )}
    </div>
  );
};

export default SalesPrediction;
