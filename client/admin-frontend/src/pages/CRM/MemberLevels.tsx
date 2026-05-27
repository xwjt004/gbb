import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Tag, Modal, Form, Input, InputNumber, message, Popconfirm, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { crmService } from '@/services/crmService';

const MemberLevels: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmService.getMemberLevels();
      const d = (res as any).data || res;
      setList(Array.isArray(d) ? d : []);
    } catch {
      message.error('获取会员等级失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setEditing(record);
    const benefits = Array.isArray(record.benefits) ? record.benefits : [];
    form.setFieldsValue({
      level: record.level,
      name: record.name,
      minGrowth: record.minGrowth,
      maxGrowth: record.maxGrowth,
      benefits: benefits.join(','),
      icon: record.icon,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const data: any = { ...values };
      if (typeof data.benefits === 'string' && data.benefits) {
        data.benefits = data.benefits.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else {
        data.benefits = [];
      }

      if (editing) {
        await crmService.updateMemberLevel(editing.id, data);
        message.success('等级更新成功');
      } else {
        await crmService.createMemberLevel(data);
        message.success('等级创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      // validation or API error
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await crmService.deleteMemberLevel(id);
      message.success('等级已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const levelColors = ['', 'green', 'blue', 'gold', 'orange', 'red'];

  const columns: ColumnsType<any> = [
    { title: '等级', dataIndex: 'level', width: 60 },
    {
      title: '名称', dataIndex: 'name', width: 120,
      render: (v: string, r: any) => <Tag color={levelColors[r.level] || 'default'} style={{ fontSize: 14, padding: '2px 12px' }}>{v}</Tag>,
    },
    { title: '最小成长值', dataIndex: 'minGrowth', width: 110 },
    { title: '最大成长值', dataIndex: 'maxGrowth', width: 110 },
    {
      title: '权益', dataIndex: 'benefits', width: 250,
      render: (v: any) => {
        const items = Array.isArray(v) ? v : [];
        return items.length ? items.map((b: string) => <Tag key={b}>{b}</Tag>) : '-';
      },
    },
    {
      title: '操作', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Popconfirm title="确定删除此等级？" onConfirm={() => handleDelete(r.id)}>
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
          <h2 style={{ margin: 0 }}>会员等级配置</h2>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建等级</Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
        scroll={{ x: 800 }}
      />

      <Modal
        title={editing ? '编辑等级' : '新建等级'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="level" label="等级（数字）" rules={[{ required: true, message: '请输入等级' }]}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="如 1, 2, 3..." disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="等级名称" rules={[{ required: true, message: '请输入等级名称' }]}>
            <Input placeholder="如：普通会员、白银会员" />
          </Form.Item>
          <Form.Item name="minGrowth" label="最小成长值" rules={[{ required: true, message: '请输入最小成长值' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxGrowth" label="最大成长值" rules={[{ required: true, message: '请输入最大成长值' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="benefits" label="权益列表（逗号分隔）">
            <Input placeholder="如：生日礼包,优先预约,专属客服" />
          </Form.Item>
          <Form.Item name="icon" label="图标标识">
            <Input placeholder="如：star, silver, gold" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MemberLevels;
