import React, { useEffect, useState } from 'react';
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
import CategoryFormModal from '../../components/CategoryFormModal';
import packageCategoryService, { PackageCategory } from '../../services/packageCategoryService';
import dayjs from 'dayjs';

const PackageCategoryManage: React.FC = () => {
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PackageCategory | undefined>();
  
  // 搜索条件
  const [searchName, setSearchName] = useState('');
  const [searchStatus, setSearchStatus] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, [currentPage, pageSize, searchName, searchStatus]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      
      if (searchName) params.name = searchName;
      if (searchStatus) params.status = searchStatus;

      const result = await packageCategoryService.getCategories(params);
      setCategories(result.items || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCategory(undefined);
    setModalVisible(true);
  };

  const handleEdit = (category: PackageCategory) => {
    setEditingCategory(category);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await packageCategoryService.deleteCategory(id);
      message.success('删除成功');
      fetchCategories();
    } catch (error: any) {
      console.error('删除失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('删除失败');
      }
    }
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingCategory(undefined);
    fetchCategories();
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCategories();
  };

  const handleReset = () => {
    setSearchName('');
    setSearchStatus('');
    setCurrentPage(1);
  };

  const columns: ColumnsType<PackageCategory> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      width: 150,
      render: (text, record) => (
        <Space>
          {record.color && (
            <Badge color={record.color} />
          )}
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      width: 80,
      sorter: (a, b) => a.sortOrder - b.sortOrder,
    },
    {
      title: '套餐数量',
      dataIndex: '_count',
      width: 100,
      render: (count) => (
        <Tag color="blue">{count?.packages || 0} 个</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={
              record._count && record._count.packages > 0
                ? `该分类下有 ${record._count.packages} 个套餐，无法删除`
                : '确定要删除此分类吗？'
            }
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record._count && record._count.packages > 0}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record._count && record._count.packages > 0}
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
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增分类
          </Button>
        }
      >
        {/* 搜索区域 */}
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索分类名称"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            placeholder="选择状态"
            value={searchStatus || undefined}
            onChange={setSearchStatus}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="ACTIVE">启用</Select.Option>
            <Select.Option value="INACTIVE">禁用</Select.Option>
          </Select>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
          >
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <CategoryFormModal
        visible={modalVisible}
        category={editingCategory}
        onCancel={() => {
          setModalVisible(false);
          setEditingCategory(undefined);
        }}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default PackageCategoryManage;
