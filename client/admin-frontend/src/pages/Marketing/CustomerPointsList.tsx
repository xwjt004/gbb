import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Table, Button, Input, Select, DatePicker, Space, Tag, message,
  Modal, Form, InputNumber, Popconfirm, Typography, Row, Col, Tooltip,
} from 'antd';

const { Title, Text } = Typography;
import {
  PlusOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined,
  EditOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { pointsService, PointsTransaction, PointsTransactionQuery } from '@/services/points';
import { wxUserService } from '@/services/wxUser';
import type { WxUser } from '@/types/wxUser';

const { RangePicker } = DatePicker;

const TRANSACTION_TYPES: { value: string; label: string }[] = [
  { value: 'CREDIT', label: '增加' },
  { value: 'DEBIT', label: '扣除' },
];

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'purchase', label: '购买积分' },
  { value: 'upload_photo', label: '上传照片' },
  { value: 'upload_video', label: '上传视频' },
  { value: 'play_video', label: '播放视频' },
  { value: 'admin_adjust', label: '管理员调账' },
  { value: 'order_refund', label: '退款返还' },
];

const CustomerPointsList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PointsTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<PointsTransactionQuery>({ page: 1, limit: 20 });

  // 编辑备注
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PointsTransaction | null>(null);
  const [editRemark, setEditRemark] = useState('');

  // 手动调账
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustModalKey, setAdjustModalKey] = useState(0);
  const [adjustForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [wxUserSearchVal, setWxUserSearchVal] = useState('');
  const [wxUserOptions, setWxUserOptions] = useState<WxUser[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pointsService.getList(query);
      setList(result.items);
      setTotal(result.pagination.total);
    } catch {
      message.error('获取积分交易记录失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSearch = (values: any) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      keyword: values.keyword || undefined,
      type: values.type || undefined,
      reason: values.reason || undefined,
      startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
    }));
  };

  const handleReset = () => {
    setQuery({ page: 1, limit: 20 });
  };

  const handleDelete = async (id: string) => {
    try {
      await pointsService.delete(id);
      message.success('删除成功，积分已返还');
      fetchList();
    } catch {
      message.error('删除失败');
    }
  };

  const openEditModal = (record: PointsTransaction) => {
    setEditingRow(record);
    setEditRemark(record.remark || '');
    setEditModalOpen(true);
  };

  const handleEditRemark = async () => {
    if (!editingRow) return;
    try {
      await pointsService.update(editingRow.id, { remark: editRemark });
      message.success('备注已更新');
      setEditModalOpen(false);
      fetchList();
    } catch {
      message.error('更新失败');
    }
  };

  // 搜索客户（用于手动调账）
  const searchWxUser = async (keyword: string) => {
    setWxUserSearchVal(keyword);
    if (!keyword) {
      setWxUserOptions([]);
      return;
    }
    try {
      const res: any = await wxUserService.getList({ keyword, page: 1, pageSize: 20 } as any);
      setWxUserOptions(res?.data?.list || []);
    } catch {
      // ignore
    }
  };

  const openAdjustModal = () => {
    adjustForm.resetFields();
    setAdjustModalKey((k) => k + 1);
    setWxUserSearchVal('');
    setWxUserOptions([]);
    setSubmitting(false);
    setAdjustModalOpen(true);
  };

  const handleAdjust = async (values: any) => {
    setSubmitting(true);
    try {
      const wxUserId = values.wxUserId;
      const amount = values.type === 'DEBIT' ? -Math.abs(values.amount) : Math.abs(values.amount);
      await pointsService.addPoints(wxUserId, amount, values.reason || 'admin_adjust', values.remark);
      message.success('调账成功');
      setAdjustModalOpen(false);
      fetchList();
    } catch {
      message.error('调账失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '客户信息',
      dataIndex: 'wxUser',
      key: 'wxUser',
      width: 220,
      render: (_: any, record: PointsTransaction) => (
        <Space>
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
              background: '#f0f0f0', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#999',
            }}
          >
            {record.wxUser?.avatar
              ? <img src={record.wxUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (record.wxUser?.nickname?.[0] || '?')
            }
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.wxUser?.nickname || '未知'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.wxUser?.phone || '-'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) =>
        type === 'CREDIT'
          ? <Tag color="green">增加</Tag>
          : <Tag color="red">扣除</Tag>,
    },
    {
      title: '变动积分',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      render: (amount: number, record: PointsTransaction) => (
        <span style={{
          fontWeight: 600,
          color: record.type === 'CREDIT' ? '#52c41a' : '#ff4d4f',
        }}>
          {record.type === 'CREDIT' ? '+' : '-'}{amount}
        </span>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      width: 90,
      render: (balance: number) => <span style={{ fontWeight: 500 }}>{balance}</span>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      render: (reason: string) => {
        const opt = REASON_OPTIONS.find((r) => r.value === reason);
        return opt?.label || reason || '-';
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      ellipsis: true,
      render: (remark: string, record: PointsTransaction) => (
        <Space>
          <Text
            style={{ maxWidth: 140 }}
            ellipsis={{ tooltip: remark }}
          >
            {remark || '-'}
          </Text>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
        </Space>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: PointsTransaction) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此交易记录？"
            description="删除后积分余额将自动还原"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>积分明细</Title>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdjustModal}>
              手动调账
            </Button>
          </Col>
        </Row>

        {/* 搜索栏 */}
        <Form layout="inline" onFinish={handleSearch} style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Form.Item name="keyword">
            <Input
              placeholder="搜索客户昵称/手机号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="type">
            <Select
              placeholder="交易类型"
              allowClear
              style={{ width: 120 }}
              options={TRANSACTION_TYPES}
            />
          </Form.Item>
          <Form.Item name="reason">
            <Select
              placeholder="原因"
              allowClear
              style={{ width: 140 }}
              options={REASON_OPTIONS}
            />
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 表格 */}
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
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* 编辑备注弹窗 */}
      <Modal
        title="编辑备注"
        open={editModalOpen}
        onOk={handleEditRemark}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">客户：{editingRow?.wxUser?.nickname || '-'}</Text>
          <br />
          <Text type="secondary">
            变动：{editingRow?.type === 'CREDIT' ? '+' : '-'}{editingRow?.amount} 积分
          </Text>
        </div>
        <Input.TextArea
          value={editRemark}
          onChange={(e) => setEditRemark(e.target.value)}
          rows={3}
          placeholder="输入备注信息"
        />
      </Modal>

      {/* 手动调账弹窗 */}
      <Modal
        title="手动调账"
        open={adjustModalOpen}
        confirmLoading={submitting}
        onOk={async () => {
          try {
            const values = await adjustForm.validateFields();
            await handleAdjust(values);
          } catch {
            // 校验失败，不关闭
          }
        }}
        onCancel={() => setAdjustModalOpen(false)}
        okText="确认"
        cancelText="取消"
        width={520}
      >
        <Form
          key={adjustModalKey}
          form={adjustForm}
          layout="vertical"
          initialValues={{ type: 'CREDIT', amount: 100, reason: 'admin_adjust' }}
        >
          <Form.Item
            name="wxUserId"
            label="选择客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              showSearch
              placeholder="输入昵称或手机号搜索"
              filterOption={false}
              onSearch={searchWxUser}
              notFoundContent={wxUserSearchVal ? '未找到客户' : '输入关键词搜索'}
              options={wxUserOptions.map((u: any) => ({
                label: `${u.nickname || '未知'} (${u.phone || '无手机号'})`,
                value: u.id,
              }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item
              name="type"
              label="调账类型"
              rules={[{ required: true }]}
            >
              <Select style={{ width: 120 }} options={TRANSACTION_TYPES} />
            </Form.Item>
            <Form.Item
              name="amount"
              label={
                <Space size={4}>
                  <span>积分数</span>
                  <Tooltip title="增加或扣除的积分数，仅填正数">
                    <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
                  </Tooltip>
                </Space>
              }
              rules={[{ required: true, message: '请输入积分数' }]}
            >
              <InputNumber min={1} max={999999} style={{ width: 160 }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="reason"
            label="原因"
            rules={[{ required: true, message: '请选择原因' }]}
          >
            <Select options={REASON_OPTIONS} />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="调账说明（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerPointsList;
