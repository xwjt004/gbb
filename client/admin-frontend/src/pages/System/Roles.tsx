import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Card, Modal, Form, Input, message, Tree, Spin, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { simple } from '@/services/api';

interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  status: string;
  _count: { users: number };
  permissions?: { permission: string }[];
}

interface PermissionNode {
  key: string;
  label: string;
  children?: PermissionNode[];
}

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionTree, setPermissionTree] = useState<PermissionNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await simple.get('/roles');
      const data = res.data || res;
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      message.error('获取角色列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissionTree = useCallback(async () => {
    try {
      const res: any = await simple.get('/roles/permission-tree');
      const data = res.data || res;
      setPermissionTree(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissionTree();
  }, [fetchRoles, fetchPermissionTree]);

  const openCreate = () => {
    setEditingRole(null);
    setCheckedKeys([]);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({ name: role.name, description: role.description });
    setCheckedKeys(role.permissions?.map(p => p.permission) || []);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = { ...values, permissions: checkedKeys };

      if (editingRole) {
        await simple.patch(`/roles/${editingRole.id}`, payload);
        message.success('角色更新成功');
      } else {
        await simple.post('/roles', payload);
        message.success('角色创建成功');
      }
      setModalOpen(false);
      fetchRoles();
    } catch {
      // validation error or API error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await simple.delete(`/roles/${id}`);
      message.success('角色已删除');
      fetchRoles();
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<Role> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '角色名称', dataIndex: 'name', width: 150 },
    { title: '描述', dataIndex: 'description', width: 200, render: (v: string | null) => v || '-' },
    {
      title: '类型', dataIndex: 'isSystem', width: 100,
      render: (v: boolean) => v ? <Tag color="blue">系统角色</Tag> : <Tag>自定义</Tag>,
    },
    { title: '用户数', dataIndex: ['_count', 'users'], width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'red'}>{v === 'ACTIVE' ? '启用' : '禁用'}</Tag>,
    },
    {
      title: '操作', width: 150,
      render: (_: any, record: Role) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          {!record.isSystem && (
            <Popconfirm title="确定删除此角色？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const convertToTreeData = (nodes: PermissionNode[]): any[] =>
    nodes.map(n => ({
      title: n.label,
      key: n.key,
      children: n.children ? convertToTreeData(n.children) : undefined,
    }));

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="角色管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建角色</Button>}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={roles}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '新建角色'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="例：运营专员" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="角色描述" />
          </Form.Item>
          <Form.Item label="权限配置">
            {permissionTree.length > 0 ? (
              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 12 }}>
                <Tree
                  checkable
                  defaultExpandAll
                  checkedKeys={checkedKeys}
                  onCheck={(keys) => setCheckedKeys(keys as string[])}
                  treeData={convertToTreeData(permissionTree)}
                />
              </div>
            ) : (
              <Spin size="small" />
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Roles;
