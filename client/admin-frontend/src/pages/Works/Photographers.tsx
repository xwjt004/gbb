import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, message, Tag, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { photographerService, Photographer } from '@/services/photographers';
import dayjs from 'dayjs';

const Photographers: React.FC = () => {
  const [data, setData] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Photographer | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await photographerService.getList({ page, limit: 20 });
      setData(res.items || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      message.error('获取摄影师列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: Photographer) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingItem) {
        await photographerService.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await photographerService.create(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch (e) {
      // validation error
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await photographerService.remove(id);
      message.success('删除成功');
      fetchData();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<Photographer> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: '头像', width: 60,
      render: (_, r) => r.avatar
        ? <Image src={r.avatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
        : <span style={{ fontSize: 24 }}>📷</span>,
    },
    { title: '姓名', dataIndex: 'name' },
    { title: '头衔', dataIndex: 'title' },
    { title: '风格', dataIndex: 'style' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: string) => s === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 60 },
    {
      title: '操作', width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="摄影师管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增摄影师</Button>}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: p => setPage(p),
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑摄影师' : '新增摄影师'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="摄影师姓名" />
          </Form.Item>
          <Form.Item name="title" label="头衔">
            <Input placeholder="如：首席摄影师、摄影总监" />
          </Form.Item>
          <Form.Item name="style" label="风格标签">
            <Input placeholder="如：日系清新、复古文艺" />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} placeholder="摄影师简介" />
          </Form.Item>
          <Form.Item name="avatar" label="头像URL">
            <Input placeholder="头像图片链接" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Photographers;
