import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  Modal,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { User, UserSearchParams } from '@/types/user';
import { userService } from '@/services/users';
import { exportService } from '@/services/export';
import { Status } from '@/types/common';
import UserForm from './UserForm';
import PageContainer from '@/components/PageContainer';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<UserSearchParams>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    vipUsers: 0,
  });

  // 加载用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getUsers({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParams,
      });
      setUsers(response.data.list);
      setPagination({
        ...pagination,
        total: response.data.pagination.total,
      });
      
      // 搜索结果提示
      if (Object.keys(searchParams).some(key => searchParams[key as keyof UserSearchParams] !== undefined)) {
        console.log(`搜索结果：找到 ${response.data.pagination.total} 个用户`);
      }
    } catch (error) {
      console.error('用户列表加载错误:', error);
      message.error('加载员工列表失败，请检查搜索条件或稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const fetchStats = async () => {
    try {
      const response = await userService.getUserStats();
      setStats(response.data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, searchParams]);

  useEffect(() => {
    fetchStats();
  }, []);

  // 表格列定义
  const handleToggleStatus = async (user: User) => {
    try {
      await userService.toggleUserStatus(user.id);
      message.success('状态已更新');
      fetchUsers();
    } catch (e) {
      message.error('状态更新失败');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: '员工信息',
      key: 'userInfo',
      render: (_, record) => (
        <Space>
          <img
            src={record.avatar || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23e8e8e8%22 rx=%2250%22/%3E%3Ccircle cx=%2250%22 cy=%2238%22 r=%2220%22 fill=%22%23bdbdbd%22/%3E%3Cpath d=%22M20 78c0-16.6 13.4-30 30-30s30 13.4 30 30v8H20v-8z%22 fill=%22%23bdbdbd%22/%3E%3C/svg%3E'}
            alt="头像"
            style={{ width: 40, height: 40, borderRadius: '50%' }}
          />
          <div>
            <div>{record.nickname || '未设置'}</div>
            <div style={{ color: '#999', fontSize: '12px' }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleName',
      render: (text) => text || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: Status) => {
        if (!status) return <Tag>-</Tag>;
        return (
          <Tag color={status === Status.ACTIVE ? 'green' : 'red'}>
            {status === Status.ACTIVE ? '正常' : '禁用'}
          </Tag>
        );
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      render: (time) => time ? new Date(time).toLocaleDateString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.status === Status.INACTIVE && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
          <Button
            type="link"
            icon={record.status === Status.ACTIVE ? <StopOutlined /> : <CheckCircleOutlined style={{ color: 'green' }} />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.status === Status.ACTIVE ? '禁用' : '启用'}
          </Button>
        </Space>
      ),
    },
  ];

  // 搜索处理
  const handleSearch = (values: UserSearchParams) => {
    setSearchParams(values);
    setPagination({ ...pagination, current: 1 });
  };

  // 综合搜索处理（支持手机号/昵称/微信号）
  const handleKeywordSearch = (keyword: string) => {
    if (!keyword) {
      // 清空搜索
      setSearchParams({ 
        ...searchParams, 
        phone: undefined, 
        nickname: undefined, 
        wechatId: undefined,
        fuzzy: undefined 
      });
      setPagination({ ...pagination, current: 1 });
      return;
    }

    // 判断搜索类型
    const phoneRegex = /^1[3-9]\d{9}$/; // 手机号正则
    const isPhone = phoneRegex.test(keyword);
    
    if (isPhone) {
      // 精确手机号搜索
      setSearchParams({
        ...searchParams,
        phone: keyword,
        nickname: undefined,
        fuzzy: undefined
      });
    } else {
      // 模糊搜索昵称
      setSearchParams({
        ...searchParams,
        phone: undefined,
        nickname: keyword,
        fuzzy: 'true'
      });
    }
    
    setPagination({ ...pagination, current: 1 });
  };

  // 清除所有搜索条件
  const handleClearSearch = () => {
    setSearchParams({});
    setPagination({ ...pagination, current: 1 });
  };

  // 编辑用户
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormVisible(true);
  };

  // 删除用户
  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个员工吗？此操作不可恢复。',
      onOk: async () => {
        try {
          await userService.deleteUser(id);
          message.success('删除成功');
          fetchUsers();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    // 检查选中的用户是否都是禁用状态
    const selectedUsers = users.filter(u => selectedRowKeys.includes(u.id));
    const activeUsers = selectedUsers.filter(u => u.status === Status.ACTIVE);

    if (activeUsers.length > 0) {
      message.error(`选中的员工中有 ${activeUsers.length} 个员工状态为"正常"，只能删除状态为"禁用"的员工`);
      return;
    }

    Modal.confirm({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个禁用员工吗？`,
      onOk: async () => {
        try {
          await userService.batchDeleteUsers(selectedRowKeys);
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          fetchUsers();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 导出数据
  const handleExport = async () => {
    try {
      setLoading(true);
      // 过滤掉空值参数
      const filteredParams = Object.fromEntries(
        Object.entries(searchParams).filter(([, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );
      await userService.exportUsers(filteredParams);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  // 后端导出用户数据
  const handleBackendExport = async () => {
    try {
      await exportService.exportUsers();
      message.success('正在导出员工数据，请稍候...');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 表单提交
  const handleFormSubmit = () => {
    setFormVisible(false);
    setEditingUser(undefined);
    fetchUsers();
    fetchStats();
  };

  return (
    <PageContainer>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总员工数" value={stats.totalUsers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="活跃员工" value={stats.activeUsers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日新增" value={stats.newUsersToday} />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 搜索表单 */}
        <Row gutter={16} style={{ marginBottom: 16 }} className="search-form">
          <Col span={6}>
            <Search
              placeholder="搜索昵称/手机号"
              onSearch={handleKeywordSearch}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Search
              placeholder="员工昵称"
              value={searchParams.nickname || ''}
              onChange={(e) => {
                // 实时更新输入值，但不触发搜索
                const nickname = e.target.value;
                setSearchParams(prev => ({ ...prev, nickname: nickname || undefined }));
              }}
              onSearch={(nickname) => {
                // 只在点击搜索按钮或按回车时搜索
                handleSearch({ 
                  ...searchParams, 
                  nickname: nickname || undefined,
                  phone: undefined,
                  wechatId: undefined,
                  fuzzy: nickname ? 'true' : undefined
                });
              }}
              allowClear
              enterButton={false}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="员工状态"
              allowClear
              style={{ width: '100%' }}
              value={searchParams.status}
              onChange={(value) => handleSearch({ ...searchParams, status: value })}
            >
              <Option value={Status.ACTIVE}>正常</Option>
              <Option value={Status.INACTIVE}>禁用</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              style={{ width: '100%' }}
              onChange={(dates) => {
                handleSearch({
                  ...searchParams,
                  startDate: dates?.[0]?.toISOString(),
                  endDate: dates?.[1]?.toISOString(),
                });
              }}
            />
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
              新增员工
            </Button>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              disabled={selectedRowKeys.length === 0}
            >
              批量删除
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'backend',
                    label: '后端导出 (推荐)',
                    icon: <ExportOutlined />,
                    onClick: handleBackendExport,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'frontend',
                    label: '前端导出',
                    icon: <ExportOutlined />,
                    onClick: handleExport,
                  },
                ],
              }}
            >
              <Button icon={<ExportOutlined />}>
                导出数据 <DownOutlined />
              </Button>
            </Dropdown>
            {(searchParams.phone || searchParams.nickname || searchParams.status || searchParams.startDate) && (
              <Button onClick={handleClearSearch}>
                清除筛选
              </Button>
            )}
          </Space>
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => {
              const hasSearch = Object.keys(searchParams).some(key => 
                searchParams[key as keyof UserSearchParams] !== undefined
              );
              return hasSearch 
                ? `搜索到 ${total} 条员工，显示第 ${range[0]}-${range[1]} 条`
                : `共 ${total} 条员工，显示第 ${range[0]}-${range[1]} 条`;
            },
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 员工表单弹窗 */}
      <UserForm
        visible={formVisible}
        user={editingUser}
        onCancel={() => {
          setFormVisible(false);
          setEditingUser(undefined);
        }}
        onSubmit={handleFormSubmit}
      />
    </PageContainer>
  );
};

export default UserList;
