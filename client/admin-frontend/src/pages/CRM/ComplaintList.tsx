import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Card, Modal, Form, Input, Select, message, Popconfirm, Row, Col, Statistic,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { crmService } from '@/services/crmService';

const { TextArea } = Input;

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'red' },
  PROCESSING: { label: '处理中', color: 'blue' },
  RESOLVED: { label: '已解决', color: 'green' },
  CLOSED: { label: '已关闭', color: 'default' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  LOW: { label: '低', color: 'default' },
  NORMAL: { label: '中', color: 'blue' },
  HIGH: { label: '高', color: 'orange' },
  URGENT: { label: '紧急', color: 'red' },
};

const ComplaintList: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmService.getComplaints({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      const d = (res as any).data || res;
      setList(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取投诉列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      wxUserId: record.wxUserId,
      orderId: record.orderId,
      title: record.title,
      description: record.description,
      priority: record.priority,
    });
    setModalOpen(true);
  };

  const openResolve = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      status: 'RESOLVED',
      resolution: record.resolution || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editing?.id) {
        // 检查如果是编辑状态/处理结果的表单（只有resolution和status）
        const isResolve = values.status && values.resolution !== undefined;
        if (isResolve || values.title === undefined) {
          // 处理操作
          const updateData: any = {};
          if (values.status) updateData.status = values.status;
          if (values.resolution !== undefined) updateData.resolution = values.resolution;
          await crmService.updateComplaint(editing.id, updateData);
          message.success('处理成功');
        } else {
          await crmService.updateComplaint(editing.id, values);
          message.success('投诉更新成功');
        }
      } else {
        await crmService.createComplaint(values);
        message.success('投诉创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      // validation or API error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await crmService.deleteComplaint(id);
      message.success('投诉已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<any> = [
    { title: '投诉编号', dataIndex: 'complaintNo', width: 160 },
    {
      title: '客户', dataIndex: 'wxUser', width: 120,
      render: (u: any) => u?.nickname || u?.phone || '-',
    },
    { title: '标题', dataIndex: 'title', width: 200 },
    {
      title: '优先级', dataIndex: 'priority', width: 80,
      render: (v: string) => {
        const m = priorityMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => {
        const m = statusMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '处理人', dataIndex: 'handler', width: 100,
      render: (h: any) => h?.nickname || '-',
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_: any, r: any) => (
        <Space>
          {(r.status === 'PENDING' || r.status === 'PROCESSING') && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => openResolve(r)}>
              处理
            </Button>
          )}
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="删除此投诉？" onConfirm={() => handleDelete(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>客诉管理</h2>
        </Col>
        <Col>
          <Space>
            <Popconfirm title="手动触发流失检测？" onConfirm={async () => {
              try { await crmService.detectChurn(); message.success('流失检测完成'); } catch { message.error('检测失败'); }
            }}>
              <Button>流失检测</Button>
            </Popconfirm>
            <Popconfirm title="手动触发会员升级？" onConfirm={async () => {
              try { await crmService.upgradeAll(); message.success('升级完成'); } catch { message.error('升级失败'); }
            }}>
              <Button>会员升级</Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建投诉</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="待处理" value={list.filter(i => i.status === 'PENDING').length} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="处理中" value={list.filter(i => i.status === 'PROCESSING').length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已解决" value={list.filter(i => i.status === 'RESOLVED').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="总计" value={pagination.total} /></Card></Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select placeholder="状态" allowClear style={{ width: 120 }} value={filters.status}
            onChange={(v) => { setFilters(prev => ({ ...prev, status: v })); setPagination(p => ({ ...p, current: 1 })); }}>
            <Select.Option value="PENDING">待处理</Select.Option>
            <Select.Option value="PROCESSING">处理中</Select.Option>
            <Select.Option value="RESOLVED">已解决</Select.Option>
            <Select.Option value="CLOSED">已关闭</Select.Option>
          </Select>
          <Select placeholder="优先级" allowClear style={{ width: 120 }} value={filters.priority}
            onChange={(v) => { setFilters(prev => ({ ...prev, priority: v })); setPagination(p => ({ ...p, current: 1 })); }}>
            <Select.Option value="LOW">低</Select.Option>
            <Select.Option value="NORMAL">中</Select.Option>
            <Select.Option value="HIGH">高</Select.Option>
            <Select.Option value="URGENT">紧急</Select.Option>
          </Select>
          <Button onClick={() => { setFilters({}); setPagination(p => ({ ...p, current: 1 })); }}>重置</Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current, pageSize: pagination.pageSize, total: pagination.total,
          showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
        }}
      />

      <Modal
        title={editing?.resolution !== undefined && editing?.id ? '处理投诉' : editing ? '编辑投诉' : '新建投诉'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical">
          {!editing?.resolution && !editing?.id && (
            <>
              <Form.Item name="wxUserId" label="客户 ID" rules={[{ required: true, message: '请输入客户ID' }]}>
                <Input placeholder="微信用户 UUID" />
              </Form.Item>
              <Form.Item name="orderId" label="关联订单号">
                <Input placeholder="可选" />
              </Form.Item>
              <Form.Item name="title" label="投诉标题" rules={[{ required: true, message: '请输入投诉标题' }]}>
                <Input placeholder="投诉标题" />
              </Form.Item>
              <Form.Item name="description" label="投诉描述" rules={[{ required: true, message: '请输入投诉描述' }]}>
                <TextArea rows={4} placeholder="详细描述投诉内容" />
              </Form.Item>
              <Form.Item name="priority" label="优先级">
                <Select>
                  <Select.Option value="LOW">低</Select.Option>
                  <Select.Option value="NORMAL">中</Select.Option>
                  <Select.Option value="HIGH">高</Select.Option>
                  <Select.Option value="URGENT">紧急</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
          {(editing?.id && (editing?.resolution !== undefined || form.getFieldValue('status'))) && (
            <>
              <Form.Item name="status" label="处理状态">
                <Select>
                  <Select.Option value="PROCESSING">处理中</Select.Option>
                  <Select.Option value="RESOLVED">已解决</Select.Option>
                  <Select.Option value="CLOSED">已关闭</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="resolution" label="处理说明">
                <TextArea rows={4} placeholder="描述处理结果" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ComplaintList;
