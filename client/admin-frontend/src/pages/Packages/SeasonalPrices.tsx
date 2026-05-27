import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, DatePicker, Space, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { seasonalPriceService } from '@/services/seasonalPrices';

const { RangePicker } = DatePicker;

interface SeasonalPricesProps {
  packageId: number;
}

const SeasonalPrices: React.FC<SeasonalPricesProps> = ({ packageId }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await seasonalPriceService.getList({ packageId }) as any;
      const d = res?.data || res;
      setList(Array.isArray(d) ? d : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (packageId) fetchData(); }, [packageId]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const [startDate, endDate] = values.dateRange;
    const payload = {
      packageId,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      price: values.price,
      label: values.label || null,
    };

    try {
      if (editingRecord) {
        await seasonalPriceService.update(editingRecord.id, payload);
        message.success('更新成功');
      } else {
        await seasonalPriceService.create(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await seasonalPriceService.delete(id);
      message.success('删除成功');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const openEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue({
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
      price: record.price,
      label: record.label,
    });
    setModalVisible(true);
  };

  const columns = [
    { title: '开始日期', dataIndex: 'startDate', render: (v: string) => v?.slice(0, 10), key: 'startDate' },
    { title: '结束日期', dataIndex: 'endDate', render: (v: string) => v?.slice(0, 10), key: 'endDate' },
    { title: '价格', dataIndex: 'price', render: (v: number) => `¥${Number(v).toFixed(2)}`, key: 'price' },
    { title: '标签', dataIndex: 'label', key: 'label' },
    {
      title: '操作', key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); form.resetFields(); setModalVisible(true); }}>
          新增季节性价格
        </Button>
      </div>
      <Table dataSource={list} columns={columns} rowKey="id" loading={loading} size="small" pagination={false} />

      <Modal
        title={editingRecord ? '编辑季节性价格' : '新增季节性价格'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => { setModalVisible(false); setEditingRecord(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="dateRange" label="日期范围" rules={[{ required: true, message: '请选择日期范围' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="label" label="标签">
            <Input placeholder="如：旺季、淡季" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SeasonalPrices;
