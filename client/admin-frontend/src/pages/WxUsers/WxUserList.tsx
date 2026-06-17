import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Input, Select, Card, Row, Col, Statistic, Tag, DatePicker, Tooltip, Modal, message } from 'antd';
import { UserOutlined, PhoneOutlined, CrownOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { WxUser, WxUserSearchParams } from '@/types/wxUser';
import { wxUserService } from '@/services/wxUser';
import { crmService } from '@/services/crmService';
import PageContainer from '@/components/PageContainer';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const levelColors = ['green', 'geekblue', 'gold', 'orange', 'red'];

const churnStatusMap: Record<string, { text: string; color: string }> = {
  'ACTIVE': { text: '活跃', color: 'green' },
  'AT_RISK': { text: '有流失风险', color: 'orange' },
  'CHURNED': { text: '已流失', color: 'red' },
};

const statusMap: Record<string, { text: string; color: string }> = {
  'ACTIVE': { text: '正常', color: 'green' },
  'INACTIVE': { text: '未激活', color: 'default' },
  'BANNED': { text: '禁用', color: 'red' },
};

const sortOptions = [
  { value: 'created_at_desc', label: '注册时间从新到旧' },
  { value: 'created_at_asc', label: '注册时间从旧到新' },
  { value: 'total_orders_desc', label: '订单数从多到少' },
  { value: 'total_orders_asc', label: '订单数从少到多' },
  { value: 'total_amount_desc', label: '消费金额从高到低' },
  { value: 'total_amount_asc', label: '消费金额从低到高' },
  { value: 'last_order_desc', label: '最后下单从新到旧' },
  { value: 'last_order_asc', label: '最后下单从旧到新' },
];

const WxUserList: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<WxUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<WxUserSearchParams>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState({ total: 0, levelDistribution: [] as { level: string; count: number }[] });
  const [memberLevels, setMemberLevels] = useState<{ level: number; name: string }[]>([]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await wxUserService.getList({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParams,
      });
      setList(res.data.list);
      setPagination(p => ({ ...p, total: res.data.pagination.total }));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const s = await wxUserService.getStats();
      setStats(s);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchList(); }, [pagination.current, pagination.pageSize, searchParams]);
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    crmService.getMemberLevels().then((res: any) => {
      const d = res?.data || res || [];
      setMemberLevels(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const handleSearch = (keyword: string) => {
    setSearchParams(prev => ({ ...prev, keyword: keyword || undefined }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleOpenidSearch = (openid: string) => {
    setSearchParams(prev => ({ ...prev, openid: openid || undefined }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleLevelFilter = (value?: string) => {
    setSearchParams(prev => ({ ...prev, memberLevel: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleChurnFilter = (value?: string) => {
    setSearchParams(prev => ({ ...prev, churnStatus: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleStatusFilter = (value?: string) => {
    setSearchParams(prev => ({ ...prev, status: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleSortChange = (value?: string) => {
    setSearchParams(prev => ({ ...prev, sort: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleDateRangeChange = useCallback((dates: any) => {
    setSearchParams(prev => ({
      ...prev,
      startDate: dates?.[0]?.toISOString(),
      endDate: dates?.[1]?.toISOString(),
    }));
    setPagination(p => ({ ...p, current: 1 }));
  }, []);

  const handleDelete = (record: WxUser) => {
    if ((record.totalOrders || 0) > 0) {
      message.warning(`该客户有 ${record.totalOrders} 笔订单，无法删除`);
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除客户「${record.nickname || record.realName || record.openid}」吗？`,
      onOk: async () => {
        try {
          await wxUserService.delete(record.id);
          message.success('删除成功');
          fetchList();
          fetchStats();
        } catch (e: any) {
          message.error(e?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  // 列名 → 后端排序前缀映射
  const sortKeyMap: Record<string, string> = {
    totalOrders: 'total_orders',
    totalAmount: 'total_amount',
    lastOrderAt: 'last_order',
    createdAt: 'created_at',
  };
  const reverseSortKeyMap: Record<string, string> = Object.fromEntries(
    Object.entries(sortKeyMap).map(([k, v]) => [v, k]),
  );

  // 从当前 sort 参数中解析出高亮的列
  const currentSortKey = searchParams.sort
    ? reverseSortKeyMap[searchParams.sort.replace(/_(asc|desc)$/, '')] || undefined
    : undefined;
  const currentSortOrder = searchParams.sort
    ? (searchParams.sort.endsWith('_asc') ? 'ascend' as const : 'descend' as const)
    : undefined;

  const handleTableChange = useCallback((pg: any, _filters: any, sorter: any) => {
    setPagination(prev => ({
      ...prev,
      current: pg.current,
      pageSize: pg.pageSize,
    }));
    if (sorter?.columnKey && sorter?.order) {
      const prefix = sortKeyMap[sorter.columnKey];
      if (prefix) {
        const sort = `${prefix}_${sorter.order === 'ascend' ? 'asc' : 'desc'}`;
        setSearchParams(prev => ({ ...prev, sort }));
      }
    } else {
      setSearchParams(prev => ({ ...prev, sort: undefined }));
    }
  }, []);

  const columns: ColumnsType<WxUser> = [
    {
      title: '微信ID',
      dataIndex: 'openid',
      width: 140,
      render: (text: string) => text ? (
        <Tooltip title={text}>
          <code style={{ fontSize: 12 }}>{text.substring(0, 8)}...</code>
        </Tooltip>
      ) : '-',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 120,
      render: (text, record) => (
        <a onClick={() => navigate(`/wx-users/${record.id}`)}>
          {text || '(未设置)'}
        </a>
      ),
    },
    {
      title: '真实姓名',
      dataIndex: 'realName',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 130,
      render: (text) => text ? <span><PhoneOutlined /> {text}</span> : '-',
    },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      width: 110,
      render: (level: string) => {
        const idx = memberLevels.findIndex(l => l.name === level);
        const color = idx >= 0 ? levelColors[idx] || 'default' : 'default';
        return <Tag color={color}>{level || '普通会员'}</Tag>;
      },
    },
    {
      title: '订单数',
      key: 'totalOrders',
      dataIndex: 'totalOrders',
      width: 80,
      sorter: true,
      sortOrder: currentSortKey === 'totalOrders' ? currentSortOrder : undefined,
    },
    {
      title: '消费金额',
      key: 'totalAmount',
      dataIndex: 'totalAmount',
      width: 110,
      sorter: true,
      sortOrder: currentSortKey === 'totalAmount' ? currentSortOrder : undefined,
      render: (val: number) => `¥${Number(val || 0).toFixed(2)}`,
    },
    {
      title: '活跃状态',
      dataIndex: 'churnStatus',
      width: 110,
      render: (status: string) => {
        const m = churnStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => {
        const m = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      width: 160,
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最后下单',
      key: 'lastOrderAt',
      dataIndex: 'lastOrderAt',
      width: 160,
      sorter: true,
      sortOrder: currentSortKey === 'lastOrderAt' ? currentSortOrder : undefined,
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '注册时间',
      key: 'createdAt',
      dataIndex: 'createdAt',
      width: 160,
      sorter: true,
      sortOrder: currentSortKey === 'createdAt' ? currentSortOrder : undefined,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          disabled={(record.totalOrders || 0) > 0}
          onClick={() => handleDelete(record)}
        >
          删除
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card><Statistic title="客户总数" value={stats.total} prefix={<UserOutlined />} /></Card>
        </Col>
        {stats.levelDistribution.map(l => (
          <Col span={6} key={l.level}>
            <Card>
              <Statistic
                title={`${l.level} 会员`}
                value={l.count}
                prefix={<CrownOutlined />}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 12]}>
          <Search
            placeholder="搜索昵称/手机号/姓名"
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
          />
          <Input.Search
            placeholder="微信ID"
            allowClear
            onSearch={handleOpenidSearch}
            style={{ width: 200 }}
          />
          <Select
            placeholder="会员等级"
            allowClear
            style={{ width: 120 }}
            onChange={handleLevelFilter}
          >
            {memberLevels.map(l => (
              <Option key={l.name} value={l.name}>{l.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="活跃状态"
            allowClear
            style={{ width: 130 }}
            onChange={handleChurnFilter}
          >
            <Option value="ACTIVE">活跃</Option>
            <Option value="AT_RISK">有流失风险</Option>
            <Option value="CHURNED">已流失</Option>
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            onChange={handleStatusFilter}
          >
            <Option value="ACTIVE">正常</Option>
            <Option value="INACTIVE">未激活</Option>
            <Option value="BANNED">禁用</Option>
          </Select>
          <Select
            placeholder="排序方式"
            allowClear
            style={{ width: 180 }}
            onChange={handleSortChange}
          >
            {sortOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>{opt.label}</Option>
            ))}
          </Select>
          <RangePicker
            placeholder={['注册开始', '注册结束']}
            onChange={handleDateRangeChange}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `共 ${total} 条，第 ${range[0]}-${range[1]} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1600 }}
        />
      </Card>
    </PageContainer>
  );
};

export default WxUserList;
