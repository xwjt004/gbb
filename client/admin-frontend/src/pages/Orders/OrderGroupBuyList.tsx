import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Card,
  Button,
  Space,
  message,
  Modal,
  Descriptions,
  Image,
  Statistic,
  Row,
  Col,
  Select,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { groupBuyService, type GroupBuyActivity } from '@/services/groupBuy';
import PageContainer from '@/components/PageContainer';

const { Option } = Select;

/** 格式化图片 URL */
const formatImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = (window as any).__BASE_URL__ || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const OrderGroupBuyList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<GroupBuyActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<GroupBuyActivity | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await groupBuyService.getList({
        page,
        limit: pageSize,
        status: statusFilter,
      });
      setList(result.items || []);
      setTotal(result.pagination?.total || 0);
    } catch (err) {
      console.error('获取团购订单失败', err);
      message.error('获取团购订单失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleViewDetail = (activity: GroupBuyActivity) => {
    setSelectedActivity(activity);
    setDetailVisible(true);
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
    ACTIVE: { color: 'processing', icon: <ClockCircleOutlined />, text: '进行中' },
    SUCCESS: { color: 'success', icon: <CheckCircleOutlined />, text: '已成团' },
    FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '已失败' },
  };

  const columns: ColumnsType<GroupBuyActivity> = [
    {
      title: '团购编号',
      key: 'id',
      width: 100,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {record.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      title: '套餐信息',
      key: 'package',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {record.package?.images?.[0] && (
            <Image
              src={formatImageUrl(record.package.images[0])}
              width={48}
              height={48}
              style={{ borderRadius: 6, objectFit: 'cover' }}
              preview={false}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{record.package?.name || '-'}</div>
            {record.package?.groupPrice && (
              <div style={{ color: '#f50', fontSize: 13 }}>
                团购价 ¥{Number(record.package.groupPrice).toFixed(2)}
                <span style={{ color: '#999', textDecoration: 'line-through', marginLeft: 6, fontSize: 12 }}>
                  ¥{Number(record.package.price).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '团长',
      key: 'creator',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.creator?.nickname || '未知'}</div>
          {record.creator?.phone && (
            <div style={{ color: '#999', fontSize: 12 }}>{record.creator.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: '团购价',
      key: 'groupPrice',
      width: 100,
      render: (_, record) => (
        <span style={{ color: '#f50', fontWeight: 600, fontSize: 14 }}>
          ¥{Number(record.package?.groupPrice || record.package?.price || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '入团人数',
      key: 'joinedCount',
      width: 90,
      render: (_, record) => (
        <div>
          <TeamOutlined style={{ marginRight: 4 }} />
          <span style={{ fontWeight: 600 }}>{record._count?.participants || 0}</span>
          <span style={{ color: '#999' }}> / {record.minCount}</span>
        </div>
      ),
    },
    {
      title: '已付款',
      key: 'paidCount',
      width: 80,
      render: (_, record) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>{record.paidCount || 0}</span>
      ),
    },
    {
      title: '未付款',
      key: 'unpaidCount',
      width: 80,
      render: (_, record) => {
        const unpaid = record.unpaidCount != null ? record.unpaidCount : (record._count?.participants || 0);
        return (
          <span style={{ color: unpaid > 0 ? '#fa8c16' : '#999', fontWeight: unpaid > 0 ? 600 : 400 }}>
            {unpaid}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (status: string) => {
        const config = statusConfig[status];
        return config ? (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        ) : (
          <Tag>{status}</Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => (
        <span style={{ fontSize: 13 }}>{val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'}</span>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiredAt',
      width: 160,
      render: (val: string, record) => {
        const expired = dayjs(val);
        const isExpired = expired.isBefore(dayjs());
        return (
          <span style={{ fontSize: 13, color: isExpired && record.status === 'ACTIVE' ? '#f50' : '#999' }}>
            {val ? expired.format('YYYY-MM-DD HH:mm') : '-'}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总团购数"
              value={total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={list.filter((i) => i.status === 'ACTIVE').length}
              valueStyle={{ color: '#1677ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已成团（已付款）"
              value={list.filter((i) => i.status === 'SUCCESS').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已失败"
              value={list.filter((i) => i.status === 'FAILED').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="团购订单"
        extra={
          <Space>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <Option value="ACTIVE">进行中</Option>
              <Option value="SUCCESS">已成团（已付款）</Option>
              <Option value="FAILED">已失败</Option>
            </Select>
            <Button onClick={fetchList}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              if (ps) setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 团购详情弹窗 */}
      <Modal
        title="团购详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={640}
      >
        {selectedActivity && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="套餐名称" span={2}>
              <Space>
                {selectedActivity.package?.images?.[0] && (
                  <Image
                    src={formatImageUrl(selectedActivity.package.images[0])}
                    width={40}
                    height={40}
                    style={{ borderRadius: 4, objectFit: 'cover' }}
                    preview={false}
                  />
                )}
                <span style={{ fontWeight: 600 }}>{selectedActivity.package?.name}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="原价">
              ¥{Number(selectedActivity.package?.price || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="团购价" span={1}>
              <span style={{ color: '#f50', fontWeight: 'bold' }}>
                ¥{Number(selectedActivity.package?.groupPrice || 0).toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="团长">
              {selectedActivity.creator?.nickname || '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="团长手机">
              {selectedActivity.creator?.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={1}>
              <Tag color={statusConfig[selectedActivity.status]?.color}>
                {statusConfig[selectedActivity.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="入团人数">
              {selectedActivity._count?.participants || 0} / {selectedActivity.minCount} 人
            </Descriptions.Item>
            <Descriptions.Item label="已付款人数">
              <span style={{ color: '#52c41a', fontWeight: 600 }}>{selectedActivity.paidCount || 0}</span>
            </Descriptions.Item>
            <Descriptions.Item label="未付款人数">
              <span style={{ color: selectedActivity.unpaidCount > 0 ? '#fa8c16' : '#999' }}>
                {selectedActivity.unpaidCount || 0}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedActivity.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="过期时间" span={1}>
              {dayjs(selectedActivity.expiredAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
};

export default OrderGroupBuyList;
