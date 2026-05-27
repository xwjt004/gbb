import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Card, Row, Col, Statistic, Space,
  message, Modal, Input, Form, Popconfirm,
} from 'antd';
import {
  SendOutlined, BellOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { notificationService, CreateNotificationData } from '@/services/notificationService';

const { TextArea } = Input;

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待发送', color: 'orange' },
  SENT: { label: '已发送', color: 'green' },
  FAILED: { label: '发送失败', color: 'red' },
};

const NotifyPush: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        type: 'PUSH',
      });
      const d = (res as any).data || res;
      setList(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取推送记录失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const data: CreateNotificationData = { type: 'PUSH', ...values };
      await notificationService.create(data);
      message.success('推送消息已发送');
      setSendModalOpen(false);
      form.resetFields();
      fetchData();
    } catch {
      // validation error or API error
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<any> = [
    { title: '标题', dataIndex: 'title', width: 250 },
    {
      title: '内容', dataIndex: 'content', width: 350,
      render: (v: string) => (
        <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const m = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '发送时间', dataIndex: 'sentAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    { title: '接收者', dataIndex: 'recipient', width: 150, render: (v: string) => v || '-' },
    {
      title: '错误信息', dataIndex: 'errorMessage', width: 200,
      render: (v: string) => v ? <Tag color="red">{v}</Tag> : '-',
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_: any, r: any) => r.status === 'FAILED' ? (
        <Button type="link" size="small" icon={<ReloadOutlined />} onClick={async () => {
          try {
            await notificationService.retry(r.id);
            message.success('重试已触发');
            fetchData();
          } catch { message.error('重试失败'); }
        }}>重试</Button>
      ) : null,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>消息推送</h2>
        </Col>
        <Col>
          <Space>
            <Popconfirm title="确认重试所有失败的推送？" onConfirm={async () => {
              try {
                await notificationService.retryAllFailed();
                message.success('批量重试已触发');
                fetchData();
              } catch { message.error('批量重试失败'); }
            }}>
              <Button icon={<ReloadOutlined />}>批量重试</Button>
            </Popconfirm>
            <Button type="primary" icon={<SendOutlined />} onClick={() => setSendModalOpen(true)}>
              发送推送
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="推送总数" value={pagination.total} prefix={<BellOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已发送" value={list.filter(i => i.status === 'SENT').length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="发送失败" value={list.filter(i => i.status === 'FAILED').length} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
        }}
      />

      <Modal
        title="发送推送消息"
        open={sendModalOpen}
        onCancel={() => { setSendModalOpen(false); form.resetFields(); }}
        onOk={handleSend}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入推送标题' }]}>
            <Input placeholder="推送消息标题" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入推送内容' }]}>
            <TextArea rows={4} placeholder="推送消息内容" />
          </Form.Item>
          <Form.Item name="recipient" label="接收者（可选）">
            <Input placeholder="指定用户ID，留空则推送给所有用户" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotifyPush;
