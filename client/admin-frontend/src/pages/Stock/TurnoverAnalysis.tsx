import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Spin, Tag, Row, Col, Statistic, Tabs } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { inventoryIntelligenceService } from '@/services/inventoryIntelligence';

const evaluationColors: Record<string, string> = {
  EXCELLENT: 'green', GOOD: 'blue', FAIR: 'orange', POOR: 'red',
};

const TurnoverAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [overall, setOverall] = useState<any>(null);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any>({ overstocked: [], understocked: [], fastMoving: [] });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analysisRes, reportRes]: any = await Promise.all([
        inventoryIntelligenceService.getTurnoverAnalysis(),
        inventoryIntelligenceService.getTurnoverReport(),
      ]);
      setOverall(analysisRes.data?.overall);
      setByCategory(analysisRes.data?.byCategory || []);
      setDetails(reportRes.data?.details || []);
      setSuggestions(reportRes.data?.optimizationSuggestions || { overstocked: [], understocked: [], fastMoving: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const detailColumns = [
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '库存数量', dataIndex: 'stockQuantity', key: 'stockQuantity' },
    {
      title: '库存价值', dataIndex: 'stockValue', key: 'stockValue',
      render: (v: number) => `¥${v.toLocaleString()}`,
    },
    { title: '日消耗', dataIndex: 'dailyConsumption', key: 'dailyConsumption' },
    { title: '可售天数', dataIndex: 'daysOfStock', key: 'daysOfStock' },
    {
      title: '评估', dataIndex: 'evaluation', key: 'evaluation',
      render: (v: string) => <Tag color={evaluationColors[v] || 'default'}>{v}</Tag>,
    },
    { title: '建议', dataIndex: 'suggestion', key: 'suggestion', ellipsis: true },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="库存周转分析" style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ marginBottom: 16 }}>刷新</Button>

        <Spin spinning={loading}>
          {overall && (
            <Row gutter={24} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic title="周转率" value={overall.turnoverRatio} precision={2} suffix="次/年" />
              </Col>
              <Col span={6}>
                <Statistic title="库存周转天数" value={overall.daysInventoryOutstanding ?? '-'} suffix="天" />
              </Col>
              <Col span={6}>
                <Statistic title="平均库存成本" value={`¥${(overall.averageInventory || 0).toLocaleString()}`} />
              </Col>
              <Col span={6}>
                <Statistic title="当前库存价值" value={`¥${(overall.currentStockValue || 0).toLocaleString()}`} />
              </Col>
            </Row>
          )}

          <Tabs defaultActiveKey="category" items={[
            {
              key: 'category',
              label: '分类周转',
              children: (
                <>
                  {byCategory.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={byCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="turnoverRatio" fill="#1890ff" name="周转率" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <Table
                    dataSource={byCategory}
                    columns={[
                      { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
                      { title: '周转率', dataIndex: 'turnoverRatio', key: 'turnoverRatio', render: (v: number) => v.toFixed(2) },
                      { title: '周转天数', dataIndex: 'dio', key: 'dio', render: (v: number | null) => v ?? '-' },
                      { title: '库存价值', dataIndex: 'stockValue', key: 'stockValue', render: (v: number) => `¥${v.toLocaleString()}` },
                      { title: '建议', dataIndex: 'suggestion', key: 'suggestion', ellipsis: true },
                    ]}
                    rowKey="categoryId"
                    pagination={false}
                    size="small"
                  />
                </>
              ),
            },
            {
              key: 'product',
              label: '产品明细',
              children: (
                <Table
                  dataSource={details}
                  columns={detailColumns}
                  rowKey="productId"
                  pagination={{ pageSize: 20 }}
                  size="small"
                />
              ),
            },
            {
              key: 'suggestions',
              label: '优化建议',
              children: (
                <Row gutter={16}>
                  <Col span={8}>
                    <Card title="库存过多" size="small" style={{ marginBottom: 16 }}>
                      {suggestions.overstocked.length === 0 && <p>暂无数据</p>}
                      {suggestions.overstocked.map((s: any, i: number) => (
                        <div key={i} style={{ marginBottom: 8, padding: 8, background: '#fff2f0', borderRadius: 4 }}>
                          <strong>{s.productName}</strong> (¥{s.stockValue.toLocaleString()})
                          <br /><small>{s.suggestion}</small>
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="库存不足" size="small" style={{ marginBottom: 16 }}>
                      {suggestions.understocked.length === 0 && <p>暂无数据</p>}
                      {suggestions.understocked.map((s: any, i: number) => (
                        <div key={i} style={{ marginBottom: 8, padding: 8, background: '#fffbe6', borderRadius: 4 }}>
                          <strong>{s.productName}</strong>
                          <br /><small>{s.suggestion}</small>
                        </div>
                      ))}
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card title="畅销品" size="small" style={{ marginBottom: 16 }}>
                      {suggestions.fastMoving.length === 0 && <p>暂无数据</p>}
                      {suggestions.fastMoving.map((s: any, i: number) => (
                        <div key={i} style={{ marginBottom: 8, padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                          <strong>{s.productName}</strong>
                          <br /><small>{s.suggestion}</small>
                        </div>
                      ))}
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]} />
        </Spin>
      </Card>
    </div>
  );
};

export default TurnoverAnalysis;
