import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Tag, Space, Select, Button, message, Modal, Typography, Row, Col, InputNumber, DatePicker, Descriptions, Divider,
} from 'antd';
const { Title, Text } = Typography;
import { ReloadOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { groupBuyService, GroupBuyActivity, GroupBuyQuery } from '@/services/groupBuy';
import { simple } from '@/services/api';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: '进行中', color: 'blue' },
  { value: 'SUCCESS', label: '已成团', color: 'green' },
  { value: 'FAILED', label: '已失败', color: 'red' },
];

interface WxUserOption {
  id: string;
  nickname: string;
  phone: string;
}

interface PackageOption {
  id: number;
  name: string;
  price: number;
}

const GroupBuyList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<GroupBuyActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<GroupBuyQuery>({ page: 1, limit: 20 });

  // 新建团购弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [users, setUsers] = useState<WxUserOption[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [minCount, setMinCount] = useState(3);

  // 编辑团购弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<GroupBuyActivity | null>(null);
  const [editMinCount, setEditMinCount] = useState<number>(3);
  const [editGroupPrice, setEditGroupPrice] = useState<number>(0);
  const [editExpiredAt, setEditExpiredAt] = useState<string>('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await groupBuyService.getList(query);
      setList(result.items);
      setTotal(result.pagination.total);
    } catch {
      message.error('获取团购列表失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 套餐搜索
  const searchPackages = async (keyword: string = '') => {
    try {
      const res: any = await simple.get('/packages', {
        params: { page: 1, limit: 50, keyword, status: 'ACTIVE' },
      });
      const data = res?.data?.items || res?.data || [];
      setPackages(data.map((p: any) => ({ id: p.id, name: p.name, price: p.price })));
    } catch {
      // ignore
    }
  };

  // 用户搜索
  const searchUsers = async (keyword: string = '') => {
    try {
      const res: any = await simple.get('/wx-users', {
        params: { page: 1, limit: 50, keyword },
      });
      const data = res?.data?.items || res?.data || [];
      setUsers(data.map((u: any) => ({ id: u.id, nickname: u.nickname || '未知', phone: u.phone || '' })));
    } catch {
      // ignore
    }
  };

  const handleEdit = async () => {
    if (!editRecord) return;
    try {
      await groupBuyService.update(editRecord.id, {
        minCount: editMinCount,
        expiredAt: editExpiredAt || undefined,
      });
      message.success('已更新');
      setEditOpen(false);
      fetchList();
    } catch {
      message.error('更新失败');
    }
  };

  const handleCreate = async () => {
    if (!selectedPkg || !selectedUser) {
      message.warning('请选择套餐和开团人');
      return;
    }
    setCreateLoading(true);
    try {
      await groupBuyService.create({ packageId: selectedPkg, creatorUserId: selectedUser, minCount });
      message.success('创建成功');
      setCreateOpen(false);
      setSelectedPkg(null);
      setSelectedUser(null);
      setMinCount(3);
      fetchList();
    } catch {
      message.error('创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      title: '套餐信息',
      dataIndex: 'package',
      key: 'package',
      width: 220,
      render: (pkg: GroupBuyActivity['package']) => (
        <Space>
          {pkg?.images?.[0] ? (
            <img
              src={pkg.images[0]}
              alt=""
              style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover', background: '#f0f0f0' }}
            />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 4, background: '#f0f0f0' }} />
          )}
          <div>
            <div style={{ fontWeight: 500 }}>{pkg?.name || '-'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ¥{pkg?.price ?? '-'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '开团人',
      dataIndex: 'creator',
      key: 'creator',
      width: 160,
      render: (creator: GroupBuyActivity['creator']) => (
        <Space>
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%', overflow: 'hidden',
              background: '#f0f0f0', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: '#999',
            }}
          >
            {creator?.avatar
              ? <img src={creator.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (creator?.nickname?.[0] || '?')
            }
          </div>
          <div>
            <div style={{ fontSize: 13 }}>{creator?.nickname || '未知'}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{creator?.phone || '-'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '参团人数',
      key: 'participants',
      width: 100,
      render: (_: any, record: GroupBuyActivity) => (
        <span>
          <Text strong>{record._count?.participants || 0}</Text>
          <Text type="secondary"> / {record.minCount}</Text>
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const opt = STATUS_OPTIONS.find((s) => s.value === status);
        return <Tag color={opt?.color}>{opt?.label || status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '过期时间',
      dataIndex: 'expiredAt',
      key: 'expiredAt',
      width: 170,
      render: (t: string, record: GroupBuyActivity) => {
        const expired = new Date(t) < new Date();
        return (
          <Text type={expired && record.status === 'ACTIVE' ? 'danger' : 'secondary'}>
            {dayjs(t).format('YYYY-MM-DD HH:mm')}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: GroupBuyActivity) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditRecord(record);
              setEditMinCount(record.minCount);
              setEditGroupPrice(Number(record.package?.groupPrice ?? record.package?.price) || 0);
              setEditExpiredAt(record.expiredAt);
              setEditOpen(true);
            }}
          >
            编辑
          </Button>
          {record.status === 'ACTIVE' && (
            <Button
              type="link"
              danger
              onClick={() => {
                Modal.confirm({
                  title: '确认取消',
                  content: '确定取消该团购活动吗？取消后团员将无法继续参团。',
                  onOk: async () => {
                    try {
                      await groupBuyService.cancel(record.id);
                      message.success('已取消');
                      fetchList();
                    } catch {
                      message.error('取消失败');
                    }
                  },
                });
              }}
            >
              撤销
            </Button>
          )}
          {record.status === 'FAILED' && (
            <Button
              type="link"
              style={{ color: '#52c41a' }}
              onClick={() => {
                Modal.confirm({
                  title: '确认恢复',
                  content: '确定恢复该团购活动吗？恢复后有效期将延长48小时。',
                  onOk: async () => {
                    try {
                      await groupBuyService.restore(record.id);
                      message.success('已恢复');
                      fetchList();
                    } catch {
                      message.error('恢复失败');
                    }
                  },
                });
              }}
            >
              恢复
            </Button>
          )}
          <Button
            type="link"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: '确定删除该团购活动记录吗？',
                onOk: async () => {
                  try {
                    await groupBuyService.delete(record.id);
                    message.success('已删除');
                    fetchList();
                  } catch {
                    message.error('删除失败');
                  }
                },
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>团购活动列表</Title>
          </Col>
          <Col>
            <Space>
              <Select
                placeholder="状态筛选"
                allowClear
                style={{ width: 130 }}
                value={query.status}
                onChange={(val) => setQuery((prev) => ({ ...prev, page: 1, status: val }))}
                options={STATUS_OPTIONS}
              />
              <Button icon={<ReloadOutlined />} onClick={() => { setQuery({ page: 1, limit: 20 }); }}>
                重置
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                setSelectedPkg(null);
                setSelectedUser(null);
                setMinCount(3);
                setCreateOpen(true);
                searchPackages();
                searchUsers();
              }}>
                新建团购
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={list}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page || 1,
            pageSize: query.limit || 20,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, limit) => setQuery((prev) => ({ ...prev, page, limit })),
          }}
          scroll={{ x: 1024 }}
        />
      </Card>

      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>新建团购</span>}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createLoading}
        okText="创建"
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>选择套餐</div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="搜索并选择套餐"
              filterOption={false}
              value={selectedPkg}
              onChange={(val) => setSelectedPkg(val)}
              onSearch={searchPackages}
              onFocus={() => searchPackages()}
              options={packages.map((p) => ({
                value: p.id,
                label: `${p.name} ¥${p.price}`,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>开团人</div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="搜索并选择用户"
              filterOption={false}
              value={selectedUser}
              onChange={(val) => setSelectedUser(val)}
              onSearch={searchUsers}
              onFocus={() => searchUsers()}
              options={users.map((u) => ({
                value: u.id,
                label: `${u.nickname}${u.phone ? ` (${u.phone})` : ''}`,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>成团人数</div>
            <InputNumber min={2} max={100} value={minCount} onChange={(v) => setMinCount(v || 3)} style={{ width: '100%' }} addonAfter="人" />
          </div>
        </Space>
      </Modal>

      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>编辑团购</span>}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
        okText="保存"
        width={640}
        destroyOnClose
      >
        {editRecord && (
          <>
            <Descriptions
              column={2}
              bordered
              size="small"
              style={{ marginBottom: 24 }}
              labelStyle={{ width: 100, fontWeight: 500, color: '#666' }}
            >
              <Descriptions.Item label="套餐名称" span={2}>
                <span style={{ fontWeight: 600, color: '#333' }}>
                  {editRecord.package?.name || '-'}
                </span>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ¥{editRecord.package?.price}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="开团人">
                {editRecord.creator?.nickname || '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="当前进度">
                <Tag color="blue">
                  {editRecord._count?.participants || 0} / {editMinCount || editRecord.minCount}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>人</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                {(() => {
                  const opt = STATUS_OPTIONS.find(s => s.value === editRecord.status);
                  return <Tag color={opt?.color}>{opt?.label || editRecord.status}</Tag>;
                })()}
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain style={{ fontSize: 13, color: '#999', margin: '16px 0' }}>
              编辑设置
            </Divider>

            <Row gutter={24}>
              <Col span={8}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>成团人数</div>
                <InputNumber
                  min={2}
                  max={100}
                  value={editMinCount}
                  onChange={(v) => setEditMinCount(v || 3)}
                  style={{ width: '100%' }}
                  addonAfter="人"
                />
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>团购价</div>
                <div style={{
                  padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6,
                  background: '#f5f5f5', color: '#ee0a24', fontWeight: 700, fontSize: 18, lineHeight: '30px',
                }}>
                  ¥{editGroupPrice}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  在套餐编辑中修改团购价
                </div>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>过期时间</div>
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  value={editExpiredAt ? dayjs(editExpiredAt) : null}
                  onChange={(d) => setEditExpiredAt(d?.toISOString() || '')}
                />
              </Col>
            </Row>
          </>
        )}
      </Modal>
    </div>
  );
};

export default GroupBuyList;
