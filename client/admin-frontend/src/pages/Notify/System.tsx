import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Tag, Card, Row, Col, Statistic, Space, message, Modal, Input, Form, Popconfirm,
} from 'antd';
import {
  SendOutlined, NotificationOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined,
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

const NotifySystem: React.FC = () => {
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
        type: 'SYSTEM',
      });
      const d = (res as any).data || res;
      setList(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取系统通知失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const data: CreateNotificationData = { type: 'SYSTEM', ...values };
      await notificationService.create(data);
      message.success('系统通知已发布');
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
      title: '内容', dataIndex: 'content', width: 400,
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
      title: '发布时间', dataIndex: 'sentAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : dayjs(list.find(i => i.id === v)?.createdAt).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '错误信息', dataIndex: 'errorMessage', width: 200,
      render: (v: string) => v ? <Tag color="red">{v}</Tag> : '-',
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

  // Re-render sentAt column properly
  const columnsFixed = columns.map(col => {
    const c = col as any;
    return c.dataIndex === 'sentAt'
      ? {
          ...c,
          render: (_: any, r: any) => r.sentAt
            ? dayjs(r.sentAt).format('YYYY-MM-DD HH:mm')
            : dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
        }
      : c;
  });

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>系统通知</h2>
        </Col>
        <Col>
          <Space>
            <Popconfirm title="确认重试所有失败的系统通知？" onConfirm={async () => {
              try {
                await notificationService.retryAllFailed();
                message.success('批量重试已触发');
                fetchData();
              } catch { message.error('批量重试失败'); }
            }}>
              <Button icon={<ReloadOutlined />}>批量重试</Button>
            </Popconfirm>
            <Button type="primary" icon={<SendOutlined />} onClick={() => setSendModalOpen(true)}>
              发布通知
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="通知总数" value={pagination.total} prefix={<NotificationOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已发布" value={list.filter(i => i.status === 'SENT').length} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
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
        columns={columnsFixed}
        dataSource={list}
        loading={loading}
        scroll={{ x: 1000 }}
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
        title="发布系统通知"
        open={sendModalOpen}
        onCancel={() => { setSendModalOpen(false); form.resetFields(); }}
        onOk={handleSend}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="通知标题" rules={[{ required: true, message: '请输入通知标题' }]}>
            <Input placeholder="系统通知标题" />
          </Form.Item>
          <Form.Item name="content" label="通知内容" rules={[{ required: true, message: '请输入通知内容' }]}>
            <TextArea rows={6} placeholder="系统通知详细内容" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotifySystem;
