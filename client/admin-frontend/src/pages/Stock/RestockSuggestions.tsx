import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Select, Spin, Tag, Space, message, Modal, Row, Col, Statistic } from 'antd';
import { ShoppingCartOutlined, ThunderboltOutlined, PlusOutlined } from '@ant-design/icons';
import { inventoryIntelligenceService } from '@/services/inventoryIntelligence';
import { autoPurchaseSuggestionService } from '@/services/autoPurchaseSuggestions';

const urgencyColors: Record<string, string> = { HIGH: 'red', MEDIUM: 'orange', LOW: 'green' };
const statusColors: Record<string, string> = { PENDING: 'orange', CONVERTED: 'green', IGNORED: 'default' };

const RestockSuggestions: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [urgency, setUrgency] = useState<string | undefined>(undefined);
  const [genLoading, setGenLoading] = useState(false);
  const [convertModal, setConvertModal] = useState<{ visible: boolean; id: string }>({ visible: false, id: '' });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.getRestockSuggestions({ urgency, page, pageSize: pagination.pageSize });
      setData(res.data?.items || []);
      setPagination(res.data?.pagination || { current: 1, pageSize: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [urgency]);

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const res: any = await inventoryIntelligenceService.generateRestockSuggestions();
      message.success(`生成了 ${res.data?.generated || 0} 条补货建议`);
      fetchData();
    } catch (err: any) {
      message.error('生成失败: ' + (err.message || '未知错误'));
    } finally {
      setGenLoading(false);
    }
  };

  const handleConvert = async () => {
    try {
      const res: any = await inventoryIntelligenceService.convertSuggestionToPO(convertModal.id);
      if (res.data?.error) {
        message.error(res.data.error);
      } else {
        message.success(`已生成采购单: ${res.data?.purchaseNo}`);
        setConvertModal({ visible: false, id: '' });
        fetchData();
      }
    } catch (err: any) {
      message.error('转换失败: ' + (err.message || '未知错误'));
    }
  };

  const handleIgnore = async (id: string) => {
    try {
      await autoPurchaseSuggestionService.markIgnored(id);
      message.success('已忽略');
      fetchData();
    } catch (err: any) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: '产品名称', dataIndex: 'productName', key: 'productName' },
    { title: '当前库存', dataIndex: 'currentStock', key: 'currentStock' },
    { title: '建议补货量', dataIndex: 'suggestedQty', key: 'suggestedQty' },
    {
      title: '紧急程度', dataIndex: 'urgency', key: 'urgency',
      render: (v: string) => <Tag color={urgencyColors[v] || 'default'}>{v === 'HIGH' ? '高' : v === 'MEDIUM' ? '中' : '低'}</Tag>,
    },
    { title: '预计可售天数', dataIndex: 'daysUntilStockout', key: 'daysUntilStockout' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Button type="primary" size="small" onClick={() => setConvertModal({ visible: true, id: record.id })}>
                转采购单
              </Button>
              <Button size="small" onClick={() => handleIgnore(record.id)}>忽略</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="补货建议" style={{ marginBottom: 16 }}>
        <Row gutter={24} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="待处理" value={data.filter((d: any) => d.status === 'PENDING').length} prefix={<ShoppingCartOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="高紧急度" value={data.filter((d: any) => d.urgency === 'HIGH').length} prefix={<ThunderboltOutlined />} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>

        <Space style={{ marginBottom: 16 }}>
          <Select value={urgency} onChange={setUrgency} style={{ width: 120 }} allowClear placeholder="紧急程度">
            <Select.Option value="HIGH">高</Select.Option>
            <Select.Option value="MEDIUM">中</Select.Option>
            <Select.Option value="LOW">低</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} loading={genLoading} onClick={handleGenerate}>
            生成建议
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

      <Modal
        title="确认转采购单"
        open={convertModal.visible}
        onOk={handleConvert}
        onCancel={() => setConvertModal({ visible: false, id: '' })}
      >
        <p>确认将此补货建议转为采购订单？</p>
      </Modal>
    </div>
  );
};

export default RestockSuggestions;
