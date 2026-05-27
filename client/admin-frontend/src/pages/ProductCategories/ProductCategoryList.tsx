import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Modal,
  Form,
  message,
  Card,
  Switch,
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
import productCategoryService from '@/services/productCategories';
import type {
  ProductCategory,
} from '@/types/product';

const { Search } = Input;

const ProductCategoryList: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  // 加载分类列表
  const loadCategories = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        name: searchText || undefined,
      };
      const response = await productCategoryService.getCategories(params);
      setCategories(response.list);
      setPagination({
        ...pagination,
        total: response.pagination.total,
      });
    } catch (error) {
      message.error('加载分类列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [pagination.current, pagination.pageSize, searchText]);

  // 打开新增/编辑弹窗（先显示，再在 effect 中填充，避免未挂载表单警告）
  const handleOpenModal = (category?: ProductCategory) => {
    setEditingCategory(category || null);
    setModalVisible(true);
  };

  // Modal 可见后再设置/重置字段，防止 antd 警告: useForm instance not connected
  useEffect(() => {
    if (!modalVisible) return;
    if (editingCategory) {
      form.setFieldsValue(editingCategory as any);
    } else {
      form.resetFields();
    }
  }, [modalVisible, editingCategory, form]);

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCategory) {
        // 更新
        await productCategoryService.updateCategory(editingCategory.id, values);
        message.success('更新成功');
      } else {
        // 新增
        await productCategoryService.createCategory(values);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadCategories();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || '操作失败');
      console.error(error);
    }
  };

  // 删除分类
  const handleDelete = async (id: number) => {
    try {
      await productCategoryService.deleteCategory(id);
      message.success('删除成功');
      loadCategories();
    } catch (error: any) {
      message.error(error.message || '删除失败');
      console.error(error);
    }
  };

  // 搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  // 表格列定义
  const columns: ColumnsType<ProductCategory> = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '分类编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '商品数量',
      dataIndex: ['_count', 'products'],
      key: 'productCount',
      width: 100,
      align: 'center',
      render: (count) => <Tag color="blue">{count || 0}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            description={
              record._count?.products 
                ? `该分类下有 ${record._count.products} 个商品，删除后商品将失去分类归属`
                : '删除后将无法恢复'
            }
            onConfirm={() => handleDelete(record.id)}
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
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总分类数"
              value={pagination.total}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用分类"
              value={categories.filter(c => c.isActive).length}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用分类"
              value={categories.filter(c => !c.isActive).length}
              suffix="个"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={categories.reduce((sum, c) => sum + (c._count?.products || 0), 0)}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索分类名称"
            allowClear
            onSearch={handleSearch}
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
            onClick={loadCategories}
          >
            刷新
          </Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
          }}
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
  width={600}
  destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            sortOrder: 0,
            isActive: true,
          }}
        >
          <Form.Item
            label="分类名称"
            name="name"
            rules={[
              { required: true, message: '请输入分类名称' },
              { max: 50, message: '分类名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item
            label="分类编码"
            name="code"
            rules={[
              { required: true, message: '请输入分类编码' },
              { pattern: /^[A-Z0-9_-]+$/, message: '编码只能包含大写字母、数字、下划线和横线' },
              { max: 20, message: '编码不能超过20个字符' },
            ]}
          >
            <Input placeholder="请输入分类编码，如 PHOTO_PROPS" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            rules={[
              { max: 200, message: '描述不能超过200个字符' },
            ]}
          >
            <Input.TextArea
              placeholder="请输入分类描述"
              rows={3}
              showCount
              maxLength={200}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="排序"
                name="sortOrder"
                rules={[
                  { required: true, message: '请输入排序值' },
                ]}
              >
                <InputNumber
                  placeholder="数字越小越靠前"
                  min={0}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="isActive"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductCategoryList;
