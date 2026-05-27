import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, message, Modal, Select } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { autoPurchaseSuggestionService } from '@/services/autoPurchaseSuggestions';
import supplierService from '@/services/supplierService';

const statusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'orange', label: '待处理' },
  CONVERTED: { color: 'green', label: '已转采购单' },
  IGNORED: { color: 'gray', label: '已忽略' },
};

const AutoPurchaseSuggestions: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [convertModal, setConvertModal] = useState<{ visible: boolean; suggestionId: string }>({ visible: false, suggestionId: '' });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [converting, setConverting] = useState(false);

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await autoPurchaseSuggestionService.getList({ page, pageSize, status: statusFilter }) as any;
      const d = res?.data || res;
      setList(d?.items || []);
      if (d?.pagination) setPagination({ current: d.pagination.page || 1, pageSize: d.pagination.pageSize || 20, total: d.pagination.total || 0 });
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleIgnore = async (id: string) => {
    try {
      await autoPurchaseSuggestionService.markIgnored(id);
      message.success('已忽略');
      fetchData(pagination.current);
    } catch {
      message.error('操作失败');
    }
  };

  const openConvertModal = async (id: string) => {
    try {
      const res = await supplierService.getList({ page: 1, pageSize: 1000, status: 'ACTIVE' });
      const data = res as any;
      setSuppliers(data?.list || []);
      setSelectedSupplier('');
      setConvertModal({ visible: true, suggestionId: id });
    } catch {
      message.error('获取供应商列表失败');
    }
  };

  const handleConvert = async () => {
    if (!selectedSupplier) {
      message.warning('请选择供应商');
      return;
    }
    setConverting(true);
    try {
      await autoPurchaseSuggestionService.convertToPO(convertModal.suggestionId, selectedSupplier);
      message.success('采购单创建成功');
      setConvertModal({ visible: false, suggestionId: '' });
      fetchData(pagination.current);
    } catch {
      message.error('转换失败');
    } finally {
      setConverting(false);
    }
  };

  const columns = [
    { title: '商品名称', dataIndex: 'productName', key: 'productName' },
    { title: '当前库存', dataIndex: 'currentStock', key: 'currentStock' },
    { title: '预警值', dataIndex: 'minStock', key: 'minStock' },
    { title: '建议采购量', dataIndex: 'suggestedQty', key: 'suggestedQty' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const m = statusMap[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<ShoppingCartOutlined />} onClick={() => openConvertModal(r.id)}>转为采购单</Button>
              <Button size="small" onClick={() => handleIgnore(r.id)}>忽略</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="自动采购建议" extra={
      <Space>
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          style={{ width: 120 }}
          options={[
            { value: 'PENDING', label: '待处理' },
            { value: 'CONVERTED', label: '已转采购单' },
            { value: 'IGNORED', label: '已忽略' },
            { value: '', label: '全部' },
          ]}
        />
      </Space>
    }>
      <Table
        dataSource={list}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
      />
      <Modal
        title="转为采购单"
        open={convertModal.visible}
        onOk={handleConvert}
        onCancel={() => setConvertModal({ visible: false, suggestionId: '' })}
        confirmLoading={converting}
      >
        <Select
          placeholder="请选择供应商"
          value={selectedSupplier || undefined}
          onChange={setSelectedSupplier}
          style={{ width: '100%' }}
          options={suppliers.map((s: any) => ({ value: s.id, label: `${s.name} (${s.contactPerson})` }))}
        />
      </Modal>
    </Card>
  );
};

export default AutoPurchaseSuggestions;
