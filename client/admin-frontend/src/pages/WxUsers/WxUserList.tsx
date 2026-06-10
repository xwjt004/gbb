import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Card, Row, Col, Statistic, Tag } from 'antd';
import { UserOutlined, PhoneOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { WxUser, WxUserSearchParams } from '@/types/wxUser';
import { wxUserService } from '@/services/wxUser';
import PageContainer from '@/components/PageContainer';

const { Search } = Input;
const { Option } = Select;

const memberLevelColor: Record<string, string> = {
  'VIP': 'gold',
  'GOLD': 'orange',
  'SILVER': 'geekblue',
  'REGULAR': 'default',
};

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

const WxUserList: React.FC = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<WxUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<WxUserSearchParams>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState({ total: 0, levelDistribution: [] as { level: string; count: number }[] });

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

  const handleSearch = (keyword: string) => {
    setSearchParams(prev => ({ ...prev, keyword: keyword || undefined }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleLevelFilter = (value?: string) => {
    setSearchParams(prev => ({ ...prev, memberLevel: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const handleStatusFilter = (value?: string) => {
    setSearchParams(prev => ({ ...prev, status: value }));
    setPagination(p => ({ ...p, current: 1 }));
  };

  const columns: ColumnsType<WxUser> = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 140,
      render: (text, record) => (
        <a onClick={() => navigate(`/wx-users/${record.id}`)}>
          {text || '(未设置)'}
        </a>
      ),
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
      render: (level: string) => (
        <Tag color={memberLevelColor[level] || 'default'}>{level || 'NORMAL'}</Tag>
      ),
    },
    {
      title: '订单数',
      dataIndex: 'totalOrders',
      width: 80,
      sorter: true,
    },
    {
      title: '消费金额',
      dataIndex: 'totalAmount',
      width: 110,
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
      title: '最后下单',
      dataIndex: 'lastOrderAt',
      width: 160,
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => new Date(val).toLocaleString('zh-CN'),
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
        <Space wrap>
          <Search
            placeholder="搜索昵称/手机号"
            allowClear
            onSearch={handleSearch}
            style={{ width: 240 }}
          />
          <Select
            placeholder="会员等级"
            allowClear
            style={{ width: 130 }}
            onChange={handleLevelFilter}
          >
            <Option value="VIP">VIP</Option>
            <Option value="GOLD">GOLD</Option>
            <Option value="SILVER">SILVER</Option>
            <Option value="REGULAR">REGULAR</Option>
          </Select>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            onChange={handleStatusFilter}
          >
            <Option value="ACTIVE">正常</Option>
            <Option value="INACTIVE">未激活</Option>
            <Option value="BANNED">禁用</Option>
          </Select>
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
            onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
          }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </PageContainer>
  );
};

export default WxUserList;
