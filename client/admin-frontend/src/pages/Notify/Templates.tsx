import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { notificationService } from '@/services/notificationService';

const { TextArea } = Input;

const typeMap: Record<string, { label: string; color: string }> = {
  PUSH: { label: '消息推送', color: 'blue' },
  EMAIL: { label: '邮件', color: 'geekblue' },
  SYSTEM: { label: '系统通知', color: 'green' },
  WECHAT: { label: '微信模板消息', color: 'cyan' },
};

const NotificationTemplates: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const watchType = Form.useWatch('type', form);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getTemplates({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      const d = (res as any).data || res;
      setList(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      type: record.type,
      title: record.title,
      content: record.content,
      variables: record.variables || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await notificationService.updateTemplate(editing.id, values);
        message.success('模板更新成功');
      } else {
        await notificationService.createTemplate(values);
        message.success('模板创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      // validation error or API error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteTemplate(id);
      message.success('模板已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<any> = [
    { title: '模板名称', dataIndex: 'name', width: 150 },
    {
      title: '类型', dataIndex: 'type', width: 100,
      render: (v: string) => {
        const m = typeMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    { title: '标题', dataIndex: 'title', width: 250 },
    {
      title: '内容', dataIndex: 'content', width: 300,
      render: (v: string) => (
        <div style={{ maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
      ),
    },
    {
      title: '变量', dataIndex: 'variables', width: 150,
      render: (v: string[]) => v?.length ? v.map(vv => <Tag key={vv}>{vv}</Tag>) : '-',
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除此模板？" onConfirm={() => handleDelete(r.id)}>
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
          <h2 style={{ margin: 0 }}>通知模板管理</h2>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建模板</Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        scroll={{ x: 1300 }}
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
        title={editing ? '编辑模板' : '新建模板'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
            <Input placeholder="例：订单确认通知" />
          </Form.Item>
          <Form.Item name="type" label="通知类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select>
              <Select.Option value="PUSH">消息推送</Select.Option>
              <Select.Option value="EMAIL">邮件</Select.Option>
              <Select.Option value="SYSTEM">系统通知</Select.Option>
              <Select.Option value="WECHAT">微信模板消息</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题模板" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="支持 {{变量名}} 占位，例：订单 {{orderNo}} 已确认" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容模板"
            rules={[{ required: true, message: '请输入内容' }]}
            extra={watchType === 'WECHAT' ? '微信类型请填写微信模板 ID（template_id）' : undefined}
          >
            <TextArea
              rows={watchType === 'WECHAT' ? 2 : 6}
              placeholder={watchType === 'WECHAT' ? '例：z9j3K7wL5mN8pQ2rT6vX' : '支持 {{变量名}} 占位'}
            />
          </Form.Item>
          <Form.Item name="variables" label="变量列表">
            <Select mode="tags" placeholder="输入变量名后按回车添加，不含 {{}}">
              <Select.Option value="name">name</Select.Option>
              <Select.Option value="orderNo">orderNo</Select.Option>
              <Select.Option value="amount">amount</Select.Option>
              <Select.Option value="date">date</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NotificationTemplates;
