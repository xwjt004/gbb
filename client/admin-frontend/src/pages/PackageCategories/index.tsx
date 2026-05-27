import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  message,
  Input,
  Select,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import CategoryModal from '../../components/CategoryModal';
import packageCategoryService, { type PackageCategory } from '../../services/packageCategoryService';

const { Search } = Input;

const PackageCategoriesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<PackageCategory | null>(null);
  
  // 搜索条件
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  useEffect(() => {
    fetchCategories();
  }, [page, pageSize, searchName, filterStatus]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const result = await packageCategoryService.getCategories({
        page,
        limit: pageSize,
        name: searchName || undefined,
        status: filterStatus,
      });
      setCategories(result.items || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      message.error(error.message || '获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setCurrentCategory(null);
    setModalVisible(true);
  };

  const handleEdit = (category: PackageCategory) => {
    setCurrentCategory(category);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await packageCategoryService.deleteCategory(id);
      message.success('删除成功');
      fetchCategories();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const handleModalSuccess = () => {
    fetchCategories();
  };

  const handleSearch = (value: string) => {
    setSearchName(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string | undefined) => {
    setFilterStatus(value);
    setPage(1);
  };

  const columns: ColumnsType<PackageCategory> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PackageCategory) => (
        <Space>
          {record.color && (
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: record.color,
                border: '1px solid #d9d9d9',
              }}
            />
          )}
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 100,
      render: (icon: string) => icon || '-',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a, b) => a.sortOrder - b.sortOrder,
    },
    {
      title: '套餐数量',
      key: 'packageCount',
      width: 100,
      render: (_, record: PackageCategory) => (
        <Badge
          count={record._count?.packages || 0}
          showZero
          color="blue"
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: PackageCategory) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            description={
              record._count?.packages
                ? `该分类下有 ${record._count.packages} 个套餐，无法删除`
                : '删除后不可恢复'
            }
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={!!record._count?.packages}
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={!!record._count?.packages}
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
      <Card
        title="套餐分类管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增分类
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} size="middle">
          <Search
            placeholder="搜索分类名称"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={handleSearch}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 150 }}
            onChange={handleStatusFilter}
            value={filterStatus}
          >
            <Select.Option value="ACTIVE">启用</Select.Option>
            <Select.Option value="INACTIVE">停用</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>

      <CategoryModal
        visible={modalVisible}
        category={currentCategory}
        onClose={() => setModalVisible(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PackageCategoriesPage;
