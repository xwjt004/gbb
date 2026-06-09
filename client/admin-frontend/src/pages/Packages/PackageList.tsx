import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Image,
  Rate,
  Dropdown,
  MenuProps,
  App,
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  StarOutlined,
  GiftOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Package, PackageSearchParams } from '@/types/package';
import { Status } from '@/types/common';
import PackageDetail from './PackageDetail';
import PackageForm from './PackageForm';
import { packageService } from '@/services/packages';
import packageCategoryService, { type PackageCategory } from '@/services/packageCategoryService';
import { formatImageUrl } from '@/utils/image';
const { Search } = Input;
const { Option } = Select;

const PackageList: React.FC = () => {
  const { modal, message } = App.useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<PackageSearchParams>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Package | undefined>();
  const [stats, setStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    popularPackages: 0,
    avgPrice: 0,
  });
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [sort, setSort] = useState<string>('created_at_desc');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [categories, setCategories] = useState<PackageCategory[]>([]);

  // 加载分类列表
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await packageCategoryService.getActiveCategories();
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [pagination.current, pagination.pageSize, searchParams, priceRange, sort]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      // normalize isPopular which may come as string from Select
      const isPopularParam = typeof searchParams.isPopular === 'string'
        ? searchParams.isPopular === 'true'
        : searchParams.isPopular;

      const { list, pagination: pg } = await packageService.getPackages({
        page: pagination.current,
        limit: pagination.pageSize,
        name: searchParams.name,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        sort,
        status: searchParams.status,
        categoryId: searchParams.categoryId,
        isPopular: isPopularParam,
      });
      const enriched: Package[] = list.map((p: Package) => ({
        ...p,
        originalPrice: p.originalPrice || p.price,
        rating: p.rating || 0,
        images: p.images.length ? p.images : ['/vite.svg'],
        status: (p.status as any) === 'ACTIVE' ? Status.ACTIVE : (p.status as any) === 'INACTIVE' ? Status.INACTIVE : (p.status || Status.ACTIVE),
      }));
      setPackages(enriched);
      setPagination(prev => ({ ...prev, total: pg.total }));
      setStats({
        totalPackages: pg.total,
        activePackages: enriched.filter(p => p.status === Status.ACTIVE).length,
        popularPackages: enriched.filter(p => p.isPopular).length,
        avgPrice: enriched.length ? Math.round(enriched.reduce((sum, p) => sum + p.price, 0) / enriched.length) : 0,
      });
    } catch (e: any) {
      message.error('加载套餐失败: ' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Package> = [
    {
      title: '套餐信息',
      key: 'packageInfo',
      width: 300,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <Image
            width={80}
            height={60}
            src={formatImageUrl(record.images[0])}
            style={{ borderRadius: 4, marginRight: 12 }}
            fallback="/vite.svg"
          />
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
              {record.name}
              {record.isPopular && (
                <Tag color="red" style={{ marginLeft: 8 }}>
                  <StarOutlined /> 热门
                </Tag>
              )}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginBottom: 4 }}>
              {record.description}
            </div>
            <div>
              <Rate disabled value={record.rating} />
              <span style={{ marginLeft: 8, color: '#666', fontSize: '12px' }}>
                {record.rating}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (_, record) => {
        if (record.packageCategory) {
          return (
            <Tag color={record.packageCategory.color || 'default'}>
              {record.packageCategory.name}
            </Tag>
          );
        }
        return record.category ? <Tag>{record.category}</Tag> : '-';
      },
    },
    {
      title: '价格',
      key: 'price',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ color: '#f50', fontWeight: 'bold', fontSize: '16px' }}>
            ¥{record.price}
          </div>
          {record.originalPrice && record.originalPrice > record.price && (
            <div style={{ color: '#999', textDecoration: 'line-through', fontSize: '12px' }}>
              ¥{record.originalPrice}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '服务时长',
      dataIndex: 'duration',
      width: 100,
      render: (duration: number) => `${duration}分钟`,
    },
    {
      title: '预订次数',
      dataIndex: 'orderCount',
      width: 100,
      sorter: (a, b) => a.orderCount - b.orderCount,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: Status, record) => (
        <Space>
          <Tag color={status === Status.ACTIVE ? 'green' : 'red'}>
            {status === Status.ACTIVE ? '上架' : '下架'}
          </Tag>
          <Button size="small" onClick={() => handleToggleStatus(record)}>{status === Status.ACTIVE ? '下架' : '上架'}</Button>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 搜索处理
  const handleSearch = (values: PackageSearchParams) => {
    // merge incoming values with existing search params so multiple filters can be applied together
    setSearchParams(prev => ({ ...(prev || {}), ...(values || {}) }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 查看详情
  const handleViewDetail = async (pkg: Package) => {
    setCurrentPackage(undefined);
    setDetailVisible(true);
    try {
  const mapped = await packageService.getPackageDetail(pkg.id);
  setCurrentPackage(mapped as Package);
    } catch (e: any) {
      message.error('加载详情失败: ' + (e.message || '未知错误'));
      setDetailVisible(false);
    } finally {
    }
  };

  // 编辑套餐
  const handleEdit = (pkg: Package) => {
    setCurrentPackage(pkg);
    setFormVisible(true);
  };

  // 删除套餐
  const handleDelete = (id: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除这个套餐吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await packageService.deletePackage(id);
          message.success('删除成功');
          fetchPackages();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 切换状态
  const handleToggleStatus = (record: Package) => {
    const next = record.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    const actionText = next === Status.ACTIVE ? '上架' : '下架';
    modal.confirm({
      title: `确定${actionText}此套餐？`,
      content: `${actionText}后会影响用户端可见性。`,
      onOk: async () => {
        // 乐观更新
        setPackages(prev => prev.map(p => p.id === record.id ? { ...p, status: next } : p));
        try {
          await packageService.togglePackageStatus(record.id, next);
          message.success(`已${actionText}`);
        } catch (e: any) {
          // 回滚
          setPackages(prev => prev.map(p => p.id === record.id ? { ...p, status: record.status } : p));
          message.error('状态更新失败: ' + (e.message || '未知错误'));
        } finally {
          fetchPackages();
        }
      },
    });
  };

  // 批量操作状态
  const handleBulkStatus = (next: Status) => {
    if (selectedRowKeys.length === 0) {
      return message.warning('请先选择需要操作的套餐');
    }
    const actionText = next === Status.ACTIVE ? '上架' : '下架';
    modal.confirm({
      title: `批量${actionText}套餐`,
      content: `确定要${actionText}选中的 ${selectedRowKeys.length} 个套餐吗？`,
      onOk: async () => {
        const original = packages;
        // 乐观更新
        setPackages(prev => prev.map(p => selectedRowKeys.includes(p.id) ? { ...p, status: next } : p));
        try {
          await packageService.bulkUpdateStatus(selectedRowKeys as (string | number)[], next);
          message.success(`批量${actionText}成功`);
          setSelectedRowKeys([]);
        } catch (e: any) {
          // 回滚
          setPackages(original);
          message.error(`批量${actionText}失败: ` + (e.message || '未知错误'));
        } finally {
          fetchPackages();
        }
      },
    });
  };

  // 导出功能
  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    try {
      setExportLoading(true);
      
      // 构建导出参数
      const exportParams = {
        name: searchParams.name,
        status: searchParams.status,
        category: searchParams.category,
        isPopular: searchParams.isPopular,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        sort,
      };

      // 根据格式调用不同的导出方法
      switch (format) {
        case 'excel':
          await packageService.exportToExcel(exportParams);
          message.success('Excel 文件导出成功');
          break;
        case 'csv':
          await packageService.exportToCSV(exportParams);
          message.success('CSV 文件导出成功');
          break;
        case 'json':
          await packageService.exportToJSON(exportParams);
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
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总套餐数"
              value={stats.totalPackages}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已上架"
              value={stats.activePackages}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="热门套餐"
              value={stats.popularPackages}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均价格"
              value={stats.avgPrice}
              precision={0}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 搜索表单 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              placeholder="搜索套餐名称"
              onSearch={(value) => handleSearch({ name: value })}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="套餐状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleSearch({ status: value })}
            >
              <Option value={Status.ACTIVE}>已上架</Option>
              <Option value={Status.INACTIVE}>已下架</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="套餐分类"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleSearch({ categoryId: value })}
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>
                  <span>
                    {cat.color && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: cat.color,
                          marginRight: 6,
                        }}
                      />
                    )}
                    {cat.name}
                  </span>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="是否热门"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleSearch({ isPopular: value })}
            >
              <Option value={true}>热门套餐</Option>
              <Option value={false}>普通套餐</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Input placeholder="最低价" type="number" onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined;
              if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
              priceDebounceRef.current = setTimeout(() => {
                setPriceRange(r => ({ ...r, min: v }));
                setPagination(p => ({ ...p, current: 1 }));
              }, 300);
            }} />
          </Col>
          <Col span={4}>
            <Input placeholder="最高价" type="number" onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : undefined;
              if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
              priceDebounceRef.current = setTimeout(() => {
                setPriceRange(r => ({ ...r, max: v }));
                setPagination(p => ({ ...p, current: 1 }));
              }, 300);
            }} />
          </Col>
          <Col span={4}>
            <Select value={sort} onChange={v => setSort(v)} style={{ width: '100%' }}>
              <Option value="created_at_desc">最新创建</Option>
              <Option value="created_at_asc">最早创建</Option>
              <Option value="price_asc">价格升序</Option>
              <Option value="price_desc">价格降序</Option>
              <Option value="name_asc">名称升序</Option>
              <Option value="name_desc">名称降序</Option>
              <Option value="popularity">热度</Option>
            </Select>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Row style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormVisible(true)}
            >
              新增套餐
            </Button>
            <Button onClick={() => handleBulkStatus(Status.ACTIVE)}>批量上架</Button>
            <Button onClick={() => handleBulkStatus(Status.INACTIVE)}>批量下架</Button>
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
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={packages}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 套餐详情弹窗 */}
      <PackageDetail
        visible={detailVisible}
        pkg={currentPackage}
        onClose={() => {
          setDetailVisible(false);
          setCurrentPackage(undefined);
        }}
      />

      {/* 套餐表单弹窗 */}
      {formVisible && (
        <PackageForm
          visible={formVisible}
          package={currentPackage}
          onCancel={() => {
            setFormVisible(false);
            setCurrentPackage(undefined);
          }}
          onSubmit={() => {
            setFormVisible(false);
            setCurrentPackage(undefined);
            fetchPackages();
          }}
        />
      )}
    </div>
  );
};

export default PackageList;
