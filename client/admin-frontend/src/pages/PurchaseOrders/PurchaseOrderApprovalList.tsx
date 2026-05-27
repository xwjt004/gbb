import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Spin, Card, Empty, App, Tabs, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import purchaseOrderService from '@/services/purchaseOrderService';
import dayjs from 'dayjs';

const PurchaseOrderApprovalList: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED'>('PENDING');

  const load = async (status: 'PENDING' | 'APPROVED' = activeTab) => {
    try {
      setLoading(true);
      const res = await purchaseOrderService.getList({ status: status as any });
      setData(res.list || []);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeTab]);

  const handleRevoke = (record: any) => {
    modal.confirm({
      title: '撤回审批',
      content: `确定要撤回订单 ${record.purchaseNo} 的审批吗？撤回后订单将回到待审批状态。`,
      onOk: async () => {
        try {
          await purchaseOrderService.revokeApproval(record.id);
          message.success('审批已撤回');
          load();
        } catch (e: any) {
          message.error(e?.message || '撤回失败');
        }
      },
    });
  };

  const pendingColumns = [
    { title: '订单编号', dataIndex: 'purchaseNo', width: 160 },
    { title: '供应商', dataIndex: ['supplier', 'name'], width: 200 },
    { 
      title: '采购日期', 
      dataIndex: 'purchaseDate',
      width: 120,
      render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '实付金额', 
      dataIndex: 'finalAmount', 
      width: 120,
      render: (v: any) => `¥${Number(v || 0).toFixed(2)}` 
    },
    {
      title: '操作',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/purchase-orders/approve/${record.id}`)}>审批</Button>
          <Button type="link" onClick={() => navigate(`/purchase-orders/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  const approvedColumns = [
    { title: '订单编号', dataIndex: 'purchaseNo', width: 160 },
    { title: '供应商', dataIndex: ['supplier', 'name'], width: 200 },
    { 
      title: '采购日期', 
      dataIndex: 'purchaseDate',
      width: 100,
      render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '审批时间', 
      dataIndex: 'approvedAt',
      width: 150,
      render: (v: any) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'
    },
    { 
      title: '实付金额', 
      dataIndex: 'finalAmount', 
      width: 120,
      render: (v: any) => `¥${Number(v || 0).toFixed(2)}` 
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_v: string) => <Tag color="green">已审批</Tag>
    },
    {
      title: '操作',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" danger onClick={() => handleRevoke(record)}>撤回审批</Button>
          <Button type="link" onClick={() => navigate(`/purchase-orders/${record.id}`)}>详情</Button>
        </Space>
      ),
    },
  ];

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <Spin size="large" spinning tip="加载中...">
        <div style={{ height: 200 }} />
      </Spin>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <Card title="采购订单审批管理" extra={<Button onClick={() => load()}>刷新</Button>}>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as any)}
          items={[
            {
              key: 'PENDING',
              label: '待审批',
              children: (
                <Table 
                  rowKey="id" 
                  columns={pendingColumns} 
                  dataSource={data}
                  locale={{ emptyText: <Empty description="暂无待审批的采购订单" /> }}
                />
              ),
            },
            {
              key: 'APPROVED',
              label: '已审批',
              children: (
                <Table 
                  rowKey="id" 
                  columns={approvedColumns} 
                  dataSource={data}
                  locale={{ emptyText: <Empty description="暂无已审批的采购订单" /> }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default PurchaseOrderApprovalList;
