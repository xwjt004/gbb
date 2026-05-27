import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, message, Popconfirm, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { smartMarketingService } from '@/services/smartMarketing';

const statusMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: '草稿' },
  SENDING: { color: 'processing', label: '发送中' },
  SENT: { color: 'success', label: '已发送' },
  COMPLETED: { color: 'green', label: '已完成' },
  CANCELLED: { color: 'red', label: '已取消' },
};

const typeMap: Record<string, string> = {
  COUPON_PUSH: '优惠券推送',
  NOTIFICATION_PUSH: '通知推送',
};

const CampaignList: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const navigate = useNavigate();

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await smartMarketingService.getCampaigns({ page, pageSize }) as any;
      const d = res?.data || res;
      setList(d?.items || []);
      if (d?.pagination) {
        setPagination({
          current: d.pagination.page || 1,
          pageSize: d.pagination.pageSize || 20,
          total: d.pagination.total || 0,
        });
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (campaignId: string) => {
    try {
      await smartMarketingService.deleteCampaign(campaignId);
      message.success('删除成功');
      fetchData(pagination.current);
    } catch {
      message.error('删除失败');
    }
  };

  const handleSend = (campaign: any) => {
    setSelectedCampaign(campaign);
    setSendModalOpen(true);
  };

  const confirmSend = async () => {
    if (!selectedCampaign) return;
    setSending(true);
    try {
      const res = await smartMarketingService.sendCampaign(selectedCampaign.id) as any;
      message.success(res?.message || '发送成功');
      setSendModalOpen(false);
      fetchData(pagination.current);
    } catch (e: any) {
      message.error(e?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型',
      dataIndex: 'campaignType',
      key: 'campaignType',
      width: 120,
      render: (v: string) => typeMap[v] || v,
    },
    {
      title: '目标分群',
      key: 'segment',
      width: 120,
      render: (_: any, r: any) => r.segment?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => {
        const m = statusMap[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '发送数',
      dataIndex: 'sentCount',
      key: 'sentCount',
      width: 80,
    },
    {
      title: '查看/点击/转化',
      key: 'stats',
      width: 200,
      render: (_: any, r: any) => (
        <span>
          {r.openedCount}/{r.clickedCount}/{r.convertedCount}
        </span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => (v ? new Date(v).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => navigate(`/marketing/campaigns/funnel/${record.id}`)}>数据看板</a>
          {record.status === 'DRAFT' && (
            <>
              <a onClick={() => navigate(`/marketing/campaigns/edit/${record.id}`)}>编辑</a>
              <a onClick={() => handleSend(record)}>发送</a>
            </>
          )}
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: 'red' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="营销活动"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/marketing/campaigns/new')}>
            新建活动
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => fetchData(page, pageSize),
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal
        title="确认发送活动"
        open={sendModalOpen}
        onOk={confirmSend}
        onCancel={() => setSendModalOpen(false)}
        confirmLoading={sending}
        okText="确认发送"
        cancelText="取消"
      >
        <p>确定要发送活动「{selectedCampaign?.name}」吗？</p>
        <p>活动将向目标分群的所有成员推送{selectedCampaign?.campaignType === 'COUPON_PUSH' ? '优惠券' : '通知'}。</p>
      </Modal>
    </div>
  );
};

export default CampaignList;
