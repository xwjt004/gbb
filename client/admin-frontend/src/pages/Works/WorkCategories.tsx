import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { workCategoryService, WorkCategory } from '@/services/workCategories';

const WorkCategories: React.FC = () => {
  const [data, setData] = useState<WorkCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkCategory | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await workCategoryService.getList({ page: 1, limit: 100 });
      setData(res.items || []);
    } catch (e) {
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (item: WorkCategory) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    try {
      if (editingItem) {
        await workCategoryService.update(editingItem.id, values);
        message.success('更新成功');
      } else {
        await workCategoryService.create(values);
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
      await workCategoryService.remove(id);
      message.success('删除成功');
      fetchData();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<WorkCategory> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '分类名称', dataIndex: 'name' },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
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
      <Card title="作品分类管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增分类</Button>}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：百日照、周岁照" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkCategories;
