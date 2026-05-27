import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Table, Button, Space, App, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { smartMarketingService } from '@/services/smartMarketing';

const genderMap: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };

const SegmentDetail: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const loadSegment = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await smartMarketingService.getSegment(id) as any;
      setSegment(res?.data || res);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (page = 1, pageSize = 20) => {
    if (!id) return;
    try {
      setMemberLoading(true);
      const res = await smartMarketingService.getSegmentMembers(id, { page, pageSize }) as any;
      const d = res?.data || res;
      setMembers(d?.items || []);
      if (d?.pagination) {
        setPagination({
          current: d.pagination.page || 1,
          pageSize: d.pagination.pageSize || 20,
          total: d.pagination.total || 0,
        });
      }
    } catch {
      setMembers([]);
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    loadSegment();
    loadMembers();
  }, [id]);

  const handleRefresh = async () => {
    if (!id) return;
    try {
      await smartMarketingService.refreshSegment(id);
      message.success('刷新成功');
      loadSegment();
    } catch {
      message.error('刷新失败');
    }
  };

  if (loading || !segment) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  const memberColumns = [
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', render: (v: string) => v || '-' },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (v: number) => genderMap[v] || '-',
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', render: (v: string) => v || '-' },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      key: 'memberLevel',
      render: (v: string) => v || 'NORMAL',
    },
    { title: '订单数', dataIndex: 'totalOrders', key: 'totalOrders' },
    {
      title: '消费金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: number) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <a onClick={() => navigate(`/users/profile/${record.id}`)}>查看详情</a>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="分群详情"
        extra={
          <Space>
            <Button onClick={() => navigate('/marketing/segments')}>返回列表</Button>
            <Button onClick={() => navigate(`/marketing/segments/edit/${segment.id}`)}>编辑</Button>
            <Button onClick={handleRefresh}>刷新计数</Button>
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="名称">{segment.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={segment.status === 'ACTIVE' ? 'green' : 'red'}>
              {segment.status === 'ACTIVE' ? '启用' : '禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="成员数">{segment.memberCount}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>{segment.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="规则" span={2}>
            {segment.rules?.map((r: any, i: number) => (
              <Tag key={i} style={{ marginBottom: 4 }}>
                {r.field} {r.operator} {r.value}
              </Tag>
            )) || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {segment.createdAt ? new Date(segment.createdAt).toLocaleString('zh-CN') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="分群成员" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          columns={memberColumns}
          dataSource={members}
          loading={memberLoading}
          pagination={{
            ...pagination,
            onChange: (page, pageSize) => loadMembers(page, pageSize),
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 人`,
          }}
        />
      </Card>
    </div>
  );
};

export default SegmentDetail;
