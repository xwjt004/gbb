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
  Switch,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic,
  Select,
  InputNumber,
  Image,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ImageUpload from '@/components/ImageUpload';
import serviceItemService from '@/services/serviceItems';
import type {
  ServiceItem,
  ServiceItemStatistics,
} from '@/types/product';

const { Search } = Input;
const { Option } = Select;

const ServiceItemList: React.FC = () => {
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [statistics, setStatistics] = useState<ServiceItemStatistics>({
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: {},
  });
  const [form] = Form.useForm();

  // 加载分类列表和统计数据
  useEffect(() => {
    loadCategories();
    loadStatistics();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await serviceItemService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await serviceItemService.getStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载服务列表
  const loadServiceItems = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchText || undefined,
        category: categoryFilter,
        isActive: statusFilter,
      };

      const response = await serviceItemService.getServiceItems(params);
      setServiceItems(response.list);
      setPagination({
        ...pagination,
        total: response.pagination.total,
      });
    } catch (error) {
      message.error('加载服务列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceItems();
  }, [pagination.current, pagination.pageSize, searchText, categoryFilter, statusFilter]);

  // 打开新增/编辑弹窗
  const handleOpenModal = (service?: ServiceItem) => {
    setModalVisible(true);
    // 等待 Modal 渲染后再设置表单值
    setTimeout(() => {
      if (service) {
        setEditingService(service);
        // 将 category 字符串转换为数组,以适配 mode="tags"
        form.setFieldsValue({
          ...service,
          category: service.category ? [service.category] : [],
        });
      } else {
        setEditingService(null);
        form.resetFields();
      }
    }, 0);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 将 category 数组转换回字符串
      const submitData = {
        ...values,
        category: Array.isArray(values.category) ? values.category[0] : values.category,
      };
      
      if (editingService) {
        // 更新
        await serviceItemService.updateServiceItem(editingService.id, submitData);
        message.success('更新成功');
      } else {
        // 新增
        await serviceItemService.createServiceItem(submitData);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      loadServiceItems();
      loadStatistics();
      loadCategories(); // 重新加载分类（可能有新分类）
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
      console.error(error);
    }
  };

  // 删除服务
  const handleDelete = async (id: number) => {
    try {
      await serviceItemService.deleteServiceItem(id);
      message.success('删除成功');
      loadServiceItems();
      loadStatistics();
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
  const columns: ColumnsType<ServiceItem> = [
    {
      title: '缩略图',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      fixed: 'left',
      render: (images: string[]) => {
        const firstImage = images && images.length > 0 ? images[0] : null;
        return firstImage ? (
          <Image
            src={firstImage}
            alt="服务图片"
            width={50}
            height={50}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            preview={{
              src: firstImage,
            }}
          />
        ) : (
          <div style={{ 
            width: 50, 
            height: 50, 
            background: '#f0f0f0', 
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#999'
          }}>
            无图
          </div>
        );
      },
    },
    {
      title: '服务编号',
      dataIndex: 'serviceNo',
      key: 'serviceNo',
      width: 120,
      fixed: 'left',
    },
    {
      title: '服务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '服务分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '基础价格',
      dataIndex: 'basePrice',
      key: 'basePrice',
      width: 120,
      align: 'right',
      render: (price: number | undefined) => <strong style={{ color: '#f50' }}>¥{Number(price ?? 0).toFixed(2)}</strong>,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: '服务时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      align: 'center',
      render: (duration) => duration ? (
        <span>
          <ClockCircleOutlined /> {duration} 分钟
        </span>
      ) : '-',
    },
    {
      title: '最大容量',
      dataIndex: 'maxCapacity',
      key: 'maxCapacity',
      width: 100,
      align: 'center',
      render: (capacity) => capacity || '-',
    },
    {
      title: '需预约',
      dataIndex: 'requiresBooking',
      key: 'requiresBooking',
      width: 100,
      align: 'center',
      render: (requiresBooking) => (
        <Tag color={requiresBooking ? 'orange' : 'default'}>
          {requiresBooking ? '是' : '否'}
        </Tag>
      ),
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
            title="确定要删除这个服务吗？"
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
    <div style={{ padding: '24px' }} className="service-page">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="服务总数"
              value={statistics.total}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="启用服务"
              value={statistics.active}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用服务"
              value={statistics.inactive}
              suffix="个"
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="服务分类"
              value={categories.length}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 分类统计 */}
      {Object.keys(statistics.byCategory).length > 0 && (
        <Card title="各分类服务数量" style={{ marginBottom: 24 }}>
          <Space wrap>
            {Object.entries(statistics.byCategory).map(([category, count]) => (
              <Tag
                key={category}
                color="blue"
                style={{
                  padding: '8px 16px',
                  border: '2px solid rgba(24, 144, 255, 0.25)',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <span style={{ marginRight: 8, fontSize: 16 }}>{category}:</span>
                <span style={{ fontSize: 20, fontWeight: 800, lineHeight: '20px' }}>{count}</span>
              </Tag>
            ))}
          </Space>
        </Card>
      )}

      {/* 操作栏 */}
      <Card>
        <Space style={{ marginBottom: 16 }} wrap className="service-search">
          <Search
            placeholder="搜索服务名称或编号"
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="选择分类"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setCategoryFilter(value);
              setPagination({ ...pagination, current: 1 });
            }}
          >
            {categories.map(cat => (
              <Option key={cat} value={cat}>{cat}</Option>
            ))}
          </Select>
          <Select
            placeholder="服务状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => {
              // Select 可能会把 value 序列化为字符串（尤其来自 URL 或受控表单）
              // 统一解析为 boolean 或 undefined
              let parsed: boolean | undefined = undefined;
              if (value === null || value === undefined || value === '') parsed = undefined;
              else if (typeof value === 'boolean') parsed = value;
              else if (typeof value === 'string') parsed = value === 'true';

              setStatusFilter(parsed);
              setPagination({ ...pagination, current: 1 });
            }}
          >
            <Option value={'true'}>启用</Option>
            <Option value={'false'}>禁用</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增服务
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadServiceItems();
              loadStatistics();
            }}
          >
            刷新
          </Button>
        </Space>

        {/* 表格 */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
            <Space>
              <span style={{ color: '#666' }}>已选 {selectedRowKeys.length} 项</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消</Button>
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 个服务？`}
                onConfirm={async () => {
                  try {
                    for (const id of selectedRowKeys) {
                      await serviceItemService.deleteServiceItem(Number(id));
                    }
                    message.success('批量删除成功');
                    setSelectedRowKeys([]);
                    loadServiceItems();
                    loadStatistics();
                  } catch { message.error('批量删除失败'); }
                }}
              >
                <Button size="small" danger icon={<DeleteOutlined />}>批量删除</Button>
              </Popconfirm>
            </Space>
          </div>
        )}

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={serviceItems}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
          }}
          scroll={{ x: 1600, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingService ? '编辑服务' : '新增服务'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        destroyOnHidden
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            unit: '次',
            requiresBooking: false,
            isActive: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="服务编号"
                name="serviceNo"
                rules={[{ required: true, message: '请输入服务编号' }]}
              >
                <Input placeholder="如 SRV-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="服务名称"
                name="name"
                rules={[{ required: true, message: '请输入服务名称' }]}
              >
                <Input placeholder="请输入服务名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="服务分类"
                name="category"
                rules={[{ required: true, message: '请输入服务分类' }]}
              >
                <Select
                  placeholder="请选择或输入分类"
                  showSearch
                  mode="tags"
                  maxCount={1}
                >
                  {categories.map(cat => (
                    <Option key={cat} value={cat}>{cat}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="单位"
                name="unit"
                rules={[{ required: true, message: '请输入单位' }]}
              >
                <Input placeholder="如：次、小时、天" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="服务描述"
            name="description"
          >
            <Input.TextArea
              placeholder="请输入服务描述"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="基础价格"
                name="basePrice"
                rules={[{ required: true, message: '请输入基础价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="服务时长（分钟）"
                name="duration"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="最大容量"
                name="maxCapacity"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="服务图片"
            name="images"
            extra="支持上传多张图片，第一张将作为缩略图展示"
          >
            <ImageUpload maxCount={5} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="需要预约"
                name="requiresBooking"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="是"
                  unCheckedChildren="否"
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

export default ServiceItemList;
