import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Modal,
  Form,
  message,
  Card,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import serviceItemService from '@/services/serviceItems';

const { Search } = Input;

interface ServiceCategory {
  name: string;
  count: number;
}

interface CategoryStatistics {
  total: number;
  byCategory: Record<string, number>;
}

const ServiceCategoryList: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [statistics, setStatistics] = useState<CategoryStatistics>({ total: 0, byCategory: {} });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [catList, stats] = await Promise.all([
        serviceItemService.getCategories(),
        serviceItemService.getStatistics(),
      ]);

      const byCategory = stats?.byCategory || {};
      const merged: ServiceCategory[] = catList.map(name => ({
        name,
        count: byCategory[name] || 0,
      }));

      if (searchText) {
        setCategories(merged.filter(c => c.name.includes(searchText)));
      } else {
        setCategories(merged);
      }

      setStatistics({
        total: catList.length,
        byCategory,
      });
    } catch (error) {
      message.error('加载分类列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!modalVisible) return;
    if (editingName) {
      form.setFieldsValue({ name: editingName });
    } else {
      form.resetFields();
    }
  }, [modalVisible, editingName, form]);

  const handleOpenModal = (category?: ServiceCategory) => {
    setEditingName(category?.name || null);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingName) {
        await serviceItemService.renameCategory(editingName, values.name);
        message.success('重命名成功');
      } else {
        await serviceItemService.createCategory(values.name);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.message || '操作失败');
      console.error(error);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await serviceItemService.deleteCategory(name);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
      console.error(error);
    }
  };

  const columns: ColumnsType<ServiceCategory> = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '服务数量',
      dataIndex: 'count',
      key: 'count',
      width: 150,
      align: 'center',
      render: (count) => <Tag color="blue">{count} 个服务</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            重命名
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            description={`将清空 ${record.count} 个服务项目的分类归属`}
            onConfirm={() => handleDelete(record.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="服务分类总数"
              value={statistics.total}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="服务项目总数"
              value={Object.values(statistics.byCategory).reduce((s, c) => s + c, 0)}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均每类服务数"
              value={statistics.total > 0 ? (Object.values(statistics.byCategory).reduce((s, c) => s + c, 0) / statistics.total).toFixed(1) : 0}
              suffix="个/类"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索分类名称"
            allowClear
            onSearch={(value) => {
              setSearchText(value);
              loadData();
            }}
            style={{ width: 300 }}
            enterButton={<SearchOutlined />}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增分类
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadData}
          >
            刷新
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={categories}
          rowKey="name"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 700, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
        />
      </Card>

      <Modal
        title={editingName ? '重命名服务分类' : '新增服务分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="分类名称"
            name="name"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入服务分类名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ServiceCategoryList;
