import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, message, Popconfirm, App } from 'antd';
import { PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { couponService } from '@/services/coupons';

const statusMap: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '启用' },
  INACTIVE: { color: 'red', label: '禁用' },
  EXPIRED: { color: 'gray', label: '已过期' },
};

const discountTypeMap: Record<string, string> = {
  PERCENT: '百分比',
  FIXED: '固定金额',
};

const CouponList: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { modal } = App.useApp();
  const navigate = useNavigate();

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await couponService.getCoupons({ page, pageSize }) as any;
      const d = res?.data || res;
      setList(d?.list || []);
      if (d?.pagination) setPagination({ current: d.pagination.page || 1, pageSize: d.pagination.pageSize || 20, total: d.pagination.total || 0 });
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await couponService.deleteCoupon(id);
      message.success('删除成功');
      fetchData(pagination.current);
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'couponName', key: 'couponName' },
    { title: '编码', dataIndex: 'couponCode', key: 'couponCode' },
    {
      title: '折扣类型', dataIndex: 'discountType', key: 'discountType',
      render: (v: string) => discountTypeMap[v] || v,
    },
    {
      title: '折扣值', dataIndex: 'discountValue', key: 'discountValue',
      render: (v: number, r: any) => r.discountType === 'PERCENT' ? `${v}%` : `¥${v}`,
    },
    {
      title: '有效期', key: 'period',
      render: (_: any, r: any) => `${dayjs(r.startTime).format('MM-DD')} ~ ${dayjs(r.endTime).format('MM-DD')}`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const m = statusMap[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '使用量', key: 'usage',
      render: (_: any, r: any) => `${r.usedCount || 0}/${r.totalCount}`,
    },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/marketing/coupons/edit/${r.id}`)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleBatchStatus = (nextStatus: string, label: string) => {
    if (selectedRowKeys.length === 0) return message.warning('请先选择优惠券');
    modal.confirm({
      title: `批量${label}`,
      content: `确定要${label}选中的 ${selectedRowKeys.length} 张优惠券吗？`,
      onOk: async () => {
        try {
          for (const id of selectedRowKeys) {
            await couponService.toggleStatus(String(id), nextStatus);
          }
          message.success(`批量${label}成功`);
          setSelectedRowKeys([]);
          fetchData(pagination.current);
        } catch {
          message.error(`批量${label}失败`);
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) return message.warning('请先选择优惠券');
    modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 张优惠券吗？（不可恢复）`,
      okType: 'danger',
      onOk: async () => {
        try {
          for (const id of selectedRowKeys) {
            await couponService.deleteCoupon(String(id));
          }
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchData(pagination.current);
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  return (
    <Card
      title="优惠券管理"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/marketing/coupons/new')}>新建优惠券</Button>}
    >
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
          <Space>
            <span style={{ color: '#666' }}>已选 {selectedRowKeys.length} 项</span>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>取消</Button>
            <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleBatchStatus('ACTIVE', '启用')}>批量启用</Button>
            <Button size="small" icon={<CloseCircleOutlined />} style={{ color: '#ff4d4f' }} onClick={() => handleBatchStatus('INACTIVE', '禁用')}>批量禁用</Button>
            <Button size="small" icon={<DeleteOutlined />} danger onClick={handleBatchDelete}>批量删除</Button>
          </Space>
        </div>
      )}
      <Table
        dataSource={list}
        columns={columns}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          ...pagination,
          onChange: (page, pageSize) => fetchData(page, pageSize),
        }}
      />
    </Card>
  );
};

export default CouponList;
