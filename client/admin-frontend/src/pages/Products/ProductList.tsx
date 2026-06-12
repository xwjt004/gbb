import React, { useState, useEffect, useRef } from 'react';
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
  Descriptions,
  Badge,
  Image,
  Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  StockOutlined,
  WarningOutlined,
  ExportOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ImageUpload from '@/components/ImageUpload';
import RichTextEditor from '@/components/RichTextEditor';
import { formatImageUrl } from '@/utils/image';
import productService from '@/services/products';
import productCategoryService from '@/services/productCategories';
import type {
  Product,
  ProductCategory,
  ProductStatistics,
} from '@/types/product';

const { Search } = Input;
const { Option } = Select;

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>();
  const [stockFilter, setStockFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [statistics, setStatistics] = useState<ProductStatistics>({
    total: 0,
    active: 0,
    inactive: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [form] = Form.useForm();
  const [stockForm] = Form.useForm();
  const isFirstRender = useRef(true);

  // 加载分类列表和初始数据
  useEffect(() => {
    loadCategories();
    loadStatistics();
    loadProducts(); // 初始加载商品数据
    // 监听入库/库存更新事件，刷新商品与统计
    const onInventoryUpdated = () => {
      loadProducts(1, undefined);
      loadStatistics();
    };
    const onInboundCreated = () => {
      loadProducts(1, undefined);
      loadStatistics();
    };
    window.addEventListener('inventory:updated', onInventoryUpdated as EventListener);
    window.addEventListener('inbound:created', onInboundCreated as EventListener);
    return () => {
      window.removeEventListener('inventory:updated', onInventoryUpdated as EventListener);
      window.removeEventListener('inbound:created', onInboundCreated as EventListener);
    };
  }, []);

  // 筛选条件变化时重新加载数据（跳过初始渲染）
  useEffect(() => {
    // 跳过首次渲染
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadProducts();
  }, [searchText, categoryFilter, statusFilter, stockFilter]);

  const loadCategories = async () => {
    try {
      const data = await productCategoryService.getActiveCategories();
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const data = await productService.getStatistics();
      setStatistics(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载商品列表
  /**
   * 加载商品列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param overrides 覆盖的筛选参数（用于在 setState 尚未生效时立即使用新值）
   */
  const loadProducts = async (
    page?: number,
    pageSize?: number,
    overrides?: {
      searchText?: string | undefined;
      categoryFilter?: number | undefined;
      statusFilter?: boolean | undefined;
      stockFilter?: string | undefined;
    }
  ) => {
    setLoading(true);
    try {
      const currentPage = page || pagination.current;
      const currentPageSize = pageSize || pagination.pageSize;

      const name = overrides?.searchText !== undefined ? overrides.searchText : searchText;
      const categoryId = overrides?.categoryFilter !== undefined ? overrides.categoryFilter : categoryFilter;
      const status = overrides?.statusFilter !== undefined ? overrides.statusFilter : statusFilter;
      const stock = overrides?.stockFilter !== undefined ? overrides.stockFilter : stockFilter;

      const params: any = {
        page: currentPage,
        pageSize: currentPageSize,
        name: name || undefined,
        categoryId: categoryId,
        // isActive 的布尔到数字转换已在 service 层统一处理
        isActive: status,
      };

      // 库存筛选
      if (stock === 'low') {
        params.lowStock = true;
      } else if (stock === 'out') {
        params.outOfStock = true;
      }

      const response = await productService.getProducts(params);
      setProducts(response.list);
      setPagination({
        current: response.pagination.page,
        pageSize: response.pagination.pageSize,
        total: response.pagination.total,
      });
    } catch (error) {
      message.error('加载商品列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 打开新增/编辑弹窗
  const handleOpenModal = (product?: Product) => {
    setModalVisible(true);
    // 等待 Modal 渲染后再设置表单值
    setTimeout(() => {
      if (product) {
        setEditingProduct(product);
        form.setFieldsValue(product);
      } else {
        setEditingProduct(null);
        form.resetFields();
      }
    }, 0);
  };

  // 打开库存调整弹窗
  const handleOpenStockModal = (product: Product) => {
    setEditingProduct(product);
    stockForm.resetFields();
    setStockModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      console.log('=== 商品表单提交 ===');
      console.log('编辑的商品:', editingProduct);
      console.log('提交的表单数据:', values);
      console.log('isActive 值:', values.isActive);
      
      if (editingProduct) {
        // 更新
        const result = await productService.updateProduct(editingProduct.id, values);
        console.log('更新结果:', result);
        message.success('更新成功');
      } else {
        // 新增
        await productService.createProduct(values);
        message.success('添加成功');
      }
      
      setModalVisible(false);
      // 确保先刷新数据
      await loadProducts();
      await loadStatistics();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '操作失败');
      console.error('提交错误:', error);
    }
  };

  // 提交库存调整
  const handleStockSubmit = async () => {
    if (!editingProduct) return;
    
    try {
      const values = await stockForm.validateFields();
      await productService.updateStock(editingProduct.id, values);
      message.success('库存调整成功');
      setStockModalVisible(false);
      loadProducts();
      loadStatistics();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || '库存调整失败');
      console.error(error);
    }
  };

  // 删除商品
  const handleDelete = async (id: number) => {
    try {
      await productService.deleteProduct(id);
      message.success('删除成功');
      loadProducts();
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
  // 直接传入 overrides，避免 setState 尚未生效时使用旧值
  loadProducts(1, undefined, { searchText: value });
  };

  // 获取库存状态
  const getStockStatus = (product: Product) => {
    if (product.stockQuantity <= 0) {
      return { status: 'error', text: '缺货', color: 'red' };
    } else if (product.stockQuantity <= product.lowStock) {
      return { status: 'warning', text: '库存不足', color: 'orange' };
    }
    return { status: 'success', text: '正常', color: 'green' };
  };

  // 表格列定义
  const columns: ColumnsType<Product> = [
    {
      title: '缩略图',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      fixed: 'left',
      render: (images: string[]) => {
        const firstImage = images && images.length > 0 ? images[0] : null;
        const imageUrl = firstImage ? formatImageUrl(firstImage) : null;
        return imageUrl ? (
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 4,
              overflow: 'hidden',
              display: 'inline-block',
              background: '#f0f0f0',
              cursor: 'pointer',
            }}
            onClick={() => window.open(imageUrl, '_blank')}
          >
            <img
              src={imageUrl}
              alt="商品图片"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
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
      title: '商品编号',
      dataIndex: 'productNo',
      key: 'productNo',
      width: 120,
      fixed: 'left',
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '规格',
      dataIndex: 'specification',
      key: 'specification',
      width: 150,
      ellipsis: true,
    },
    {
      title: '商品描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: '采购价',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 100,
      align: 'right',
      render: (price: number | undefined) => `¥${Number(price ?? 0).toFixed(2)}`,
    },
    {
      title: '销售价',
      dataIndex: 'salePrice',
      key: 'salePrice',
      width: 100,
      align: 'right',
      render: (price: number | undefined) => <strong style={{ color: '#f50' }}>¥{Number(price ?? 0).toFixed(2)}</strong>,
    },
    {
      title: '库存',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 120,
      align: 'center',
      render: (stockQuantity, record) => {
        const status = getStockStatus(record);
        return (
          <Badge status={status.status as any} text={`${stockQuantity} ${record.unit}`} />
        );
      },
    },
    {
      title: '最低库存',
      dataIndex: 'lowStock',
      key: 'lowStock',
      width: 100,
      align: 'center',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      render: (text) => text || '-',
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
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<StockOutlined />}
            onClick={() => handleOpenStockModal(record)}
          >
            库存
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            编辑
          </Button>
          {!record.isActive && (
            <Popconfirm
              title="确定要删除这个商品吗？"
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
          )}
          {record.isActive && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled
              title="启用状态的商品不能删除，请先禁用"
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 导出功能
  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    try {
      setExportLoading(true);

      const exportParams: any = {};
      if (searchText) exportParams.keyword = searchText;
      if (categoryFilter) exportParams.categoryId = categoryFilter;
      if (statusFilter !== undefined) exportParams.isActive = statusFilter;
      if (stockFilter === 'low') exportParams.stockStatus = 'LOW';
      else if (stockFilter === 'out') exportParams.stockStatus = 'OUT';

      switch (format) {
        case 'excel':
          await productService.exportToExcel(exportParams);
          message.success('Excel 文件导出成功');
          break;
        case 'csv':
          await productService.exportToCSV(exportParams);
          message.success('CSV 文件导出成功');
          break;
        case 'json':
          await productService.exportToJSON(exportParams);
          message.success('JSON 文件导出成功');
          break;
      }
    } catch (error: any) {
      message.error('导出失败: ' + (error.message || '未知错误'));
    } finally {
      setExportLoading(false);
    }
  };

  // 导出菜单配置
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出 Excel',
      onClick: () => handleExport('excel'),
    },
    {
      key: 'csv',
      label: '导出 CSV',
      onClick: () => handleExport('csv'),
    },
    {
      key: 'json',
      label: '导出 JSON',
      onClick: () => handleExport('json'),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="商品总数"
              value={statistics.total}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="启用商品"
              value={statistics.active}
              suffix="个"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="禁用商品"
              value={statistics.inactive}
              suffix="个"
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="库存不足"
              value={statistics.lowStock}
              suffix="个"
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="缺货商品"
              value={statistics.outOfStock}
              suffix="个"
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="平均售价"
              value={
                products.length > 0
                  ? (products.reduce((sum, p) => sum + Number(p.salePrice || 0), 0) / products.length).toFixed(2)
                  : 0
              }
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      <Card>
  <Space style={{ marginBottom: 16 }} wrap className="product-search">
          <Search
            placeholder="搜索商品名称或编号"
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
              const v = value as number | undefined;
              setCategoryFilter(v);
              setPagination({ ...pagination, current: 1 });
              // 立即使用新分类值加载
              loadProducts(1, undefined, { categoryFilter: v });
            }}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="商品状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => {
              const v = value as boolean | undefined;
              setStatusFilter(v);
              setPagination({ ...pagination, current: 1 });
              // 立即使用新状态值加载（并在 loadProducts 中转换为 1/0）
              loadProducts(1, undefined, { statusFilter: v });
            }}
          >
            <Option value={true}>启用</Option>
            <Option value={false}>禁用</Option>
          </Select>
          <Select
            placeholder="库存状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => {
              const v = value as string | undefined;
              setStockFilter(v);
              // 立即按新筛选条件重新加载，重置到第一页，确保筛选即时生效
              setPagination({ ...pagination, current: 1 });
              loadProducts(1, undefined, { stockFilter: v });
            }}
          >
            <Option value="low">库存不足</Option>
            <Option value="out">缺货</Option>
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新增商品
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadProducts();
              loadStatistics();
            }}
          >
            刷新
          </Button>
          <Dropdown
            menu={{ items: exportMenuItems }}
            placement="bottomLeft"
            arrow
          >
            <Button
              loading={exportLoading}
              icon={<ExportOutlined />}
            >
              导出数据 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
            <Space>
              <span style={{ color: '#666' }}>已选 {selectedRowKeys.length} 项</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消</Button>
              <Popconfirm
                title={`确定批量上架选中的 ${selectedRowKeys.length} 个商品？`}
                onConfirm={async () => {
                  try {
                    for (const id of selectedRowKeys) {
                      await productService.updateProduct(Number(id), { isActive: true });
                    }
                    message.success('批量上架成功');
                    setSelectedRowKeys([]);
                    loadProducts();
                    loadStatistics();
                  } catch { message.error('批量上架失败'); }
                }}
              >
                <Button size="small" style={{ color: '#52c41a' }}>批量上架</Button>
              </Popconfirm>
              <Popconfirm
                title={`确定批量下架选中的 ${selectedRowKeys.length} 个商品？`}
                onConfirm={async () => {
                  try {
                    for (const id of selectedRowKeys) {
                      await productService.updateProduct(Number(id), { isActive: false });
                    }
                    message.success('批量下架成功');
                    setSelectedRowKeys([]);
                    loadProducts();
                    loadStatistics();
                  } catch { message.error('批量下架失败'); }
                }}
              >
                <Button size="small" style={{ color: '#ff4d4f' }}>批量下架</Button>
              </Popconfirm>
            </Space>
          </div>
        )}

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={products}
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
              loadProducts(page, pageSize);
            },
          }}
          scroll={{ x: 2150, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingProduct ? '编辑商品' : '新增商品'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={800}
        destroyOnHidden
        styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            unit: '个',
            stockQuantity: 0,
            lowStock: 10,
            isActive: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="商品编号"
                name="productNo"
                rules={[{ required: true, message: '请输入商品编号' }]}
              >
                <Input placeholder="如 PROD-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="商品名称"
                name="name"
                rules={[{ required: true, message: '请输入商品名称' }]}
              >
                <Input placeholder="请输入商品名称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="商品分类"
                name="categoryId"
                rules={[{ required: true, message: '请选择商品分类' }]}
              >
                <Select placeholder="请选择分类">
                  {categories.map(cat => (
                    <Option key={cat.id} value={cat.id}>{cat.name}</Option>
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
                <Input placeholder="如：个、套、张" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="规格说明"
            name="specification"
          >
            <Input.TextArea
              placeholder="请输入规格说明"
              rows={2}
            />
          </Form.Item>

          <Form.Item
            label="商品描述"
            name="description"
          >
            <Input.TextArea
              placeholder="请输入商品描述"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="采购价"
                name="costPrice"
                rules={[{ required: true, message: '请输入采购价' }]}
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
                label="销售价"
                name="salePrice"
                rules={[{ required: true, message: '请输入销售价' }]}
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
                label="条码"
                name="barcode"
              >
                <Input placeholder="商品条码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="初始库存"
                name="stockQuantity"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="最低库存"
                name="lowStock"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="10"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="最高库存"
                name="maxStock"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="品牌"
                name="brand"
              >
                <Input placeholder="商品品牌" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="型号"
                name="model"
              >
                <Input placeholder="商品型号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="基础销量"
                name="baseSales"
                tooltip="用于展示的初始销量，可提升商品吸引力。显示销量 = 基础销量 + 实际销量"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="商品图片"
            name="images"
            extra="建议分辨率 800×600 px 以上，72 DPI 网页分辨率，文件大小 100KB ~ 5MB，支持 JPG/PNG。第一张将作为缩略图展示"
          >
            <ImageUpload maxCount={5} />
          </Form.Item>

          <Form.Item
            label="商品详情"
            name="detailContent"
            extra="支持添加富文本、图片和视频，用于小程序端展示详细商品信息"
          >
            <RichTextEditor />
          </Form.Item>

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
        </Form>
      </Modal>

      {/* 库存调整弹窗 */}
      <Modal
        title={`库存调整 - ${editingProduct?.name}`}
        open={stockModalVisible}
        onOk={handleStockSubmit}
        onCancel={() => setStockModalVisible(false)}
        width={500}
        destroyOnHidden
      >
        {editingProduct && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="当前库存">
                <Tag color={getStockStatus(editingProduct).color}>
                  {editingProduct.stockQuantity} {editingProduct.unit}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最低库存">
                {editingProduct.lowStock} {editingProduct.unit}
              </Descriptions.Item>
            </Descriptions>

            <Form
              form={stockForm}
              layout="vertical"
              initialValues={{
                operation: 'ADD',
              }}
            >
              <Form.Item
                label="操作类型"
                name="operation"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="ADD">入库（增加）</Option>
                  <Option value="SUBTRACT">出库（减少）</Option>
                  <Option value="SET">设置（直接设置）</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="数量"
                name="quantity"
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 0, message: '数量不能为负数' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="请输入数量"
                  suffix={editingProduct.unit}
                />
              </Form.Item>

              <Form.Item
                label="调整原因"
                name="reason"
              >
                <Input.TextArea
                  placeholder="请输入调整原因（可选）"
                  rows={3}
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ProductList;
