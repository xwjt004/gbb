import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Button, message, Popconfirm, Modal, List, Typography } from 'antd';
import { PlusOutlined, BulbOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { smartMarketingService } from '@/services/smartMarketing';

const { Text } = Typography;

const statusMap: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '启用' },
  INACTIVE: { color: 'red', label: '禁用' },
};

const SegmentList: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [presets, setPresets] = useState<any[]>([]);
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await smartMarketingService.getSegments({ page, pageSize }) as any;
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

  const handleDelete = async (id: string) => {
    try {
      await smartMarketingService.deleteSegment(id);
      message.success('删除成功');
      fetchData(pagination.current);
    } catch {
      message.error('删除失败');
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await smartMarketingService.refreshSegment(id);
      message.success('刷新成功');
      fetchData(pagination.current);
    } catch {
      message.error('刷新失败');
    }
  };

  const showPresets = async () => {
    try {
      const res = await smartMarketingService.getPresetSegments() as any;
      setPresets(res?.data || []);
      setPresetModalOpen(true);
    } catch {
      message.error('获取预设模板失败');
    }
  };

  const applyPreset = async (preset: any) => {
    try {
      await smartMarketingService.createSegment({
        name: preset.name,
        description: preset.description,
        rules: preset.rules,
      });
      message.success('分群创建成功');
      setPresetModalOpen(false);
      fetchData(1);
    } catch (e: any) {
      message.error(e?.message || '创建失败');
    }
  };

  const renderRules = (rules: any[]) => {
    if (!rules || rules.length === 0) return '-';
    return rules.map((r, i) => (
      <Tag key={i} style={{ marginBottom: 2 }}>
        {r.field} {r.operator} {r.value}
      </Tag>
    ));
  };

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '规则',
      dataIndex: 'rules',
      key: 'rules',
      render: (rules: any[]) => renderRules(rules),
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      key: 'memberCount',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (v: string) => {
        const m = statusMap[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => navigate(`/marketing/segments/${record.id}`)}>查看</a>
          <a onClick={() => navigate(`/marketing/segments/edit/${record.id}`)}>编辑</a>
          <a onClick={() => handleRefresh(record.id)}>刷新计数</a>
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
        title="客户分群"
        extra={
          <Space>
            <Button icon={<BulbOutlined />} onClick={showPresets}>从模板创建</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/marketing/segments/new')}>
              新建分群
            </Button>
          </Space>
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
        title="从预设模板创建"
        open={presetModalOpen}
        onCancel={() => setPresetModalOpen(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={presets}
          renderItem={(item: any) => (
            <List.Item
              actions={[
                <Button type="primary" size="small" onClick={() => applyPreset(item)}>
                  创建
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.name}
                description={
                  <div>
                    <Text type="secondary">{item.description}</Text>
                    <div style={{ marginTop: 4 }}>
                      {item.rules?.map((r: any, i: number) => (
                        <Tag key={i}>{r.field} {r.operator} {r.value}</Tag>
                      ))}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default SegmentList;
