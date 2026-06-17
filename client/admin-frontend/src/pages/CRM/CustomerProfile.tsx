import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Descriptions, Tag, Table, Progress, Spin, message, Button, Avatar, Statistic, Divider,
} from 'antd';
import { ArrowLeftOutlined, CrownOutlined, ShoppingCartOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { crmService } from '@/services/crmService';

const statusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '正常', color: 'green' },
  INACTIVE: { label: '禁用', color: 'red' },
  BANNED: { label: '封禁', color: 'red' },
};

const churnMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '活跃', color: 'green' },
  AT_RISK: { label: '流失风险', color: 'orange' },
  CHURNED: { label: '已流失', color: 'red' },
};

const orderStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'orange' },
  CONFIRMED: { label: '已确认', color: 'blue' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  COMPLETED: { label: '已完成', color: 'green' },
  CANCELLED: { label: '已取消', color: 'default' },
};

const CustomerProfile: React.FC = () => {
  const { wxUserId } = useParams<{ wxUserId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!wxUserId) return;
    setLoading(true);
    crmService.getCustomerProfile(wxUserId)
      .then((res: any) => {
        const d = res.data || res;
        setProfile(d);
      })
      .catch(() => message.error('获取客户画像失败'))
      .finally(() => setLoading(false));
  }, [wxUserId]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!profile) return <div style={{ padding: 24 }}>客户不存在</div>;

  const { basic, member, stats, orders, coupons } = profile;

  const orderColumns = [
    { title: '订单号', dataIndex: 'orderNo', width: 200 },
    { title: '套系', dataIndex: 'packageName', width: 150 },
    {
      title: '金额', dataIndex: 'totalAmount', width: 120,
      render: (v: string) => `¥${Number(v).toFixed(2)}`,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: string) => {
        const m = orderStatusMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '下单时间', dataIndex: 'createdAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  const couponColumns = [
    { title: '券名', dataIndex: 'name', width: 150 },
    { title: '编码', dataIndex: 'code', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: string) => {
        const m: Record<string, any> = { UNUSED: { label: '未使用', color: 'blue' }, USED: { label: '已使用', color: 'default' }, EXPIRED: { label: '已过期', color: 'red' } };
        const s = m[v] || { label: v, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '过期时间', dataIndex: 'expiredAt', width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  const growthPercent = member.growthProgress?.max > 0
    ? Math.round((member.growthPoints / member.growthProgress.max) * 100)
    : 100;

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')} style={{ marginBottom: 16 }}>
        返回客户列表
      </Button>

      {/* 会员卡片 */}
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Row align="middle" gutter={24}>
          <Col>
            <Avatar size={80} src={basic.avatar} icon={<CrownOutlined />} style={{ border: '3px solid white' }} />
          </Col>
          <Col flex="auto">
            <div style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{basic.nickname || '未知用户'}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              <Tag color="gold" style={{ fontSize: 14, padding: '2px 12px' }}>{member.level}</Tag>
              <span style={{ marginLeft: 12 }}>成长值: {member.growthPoints}</span>
              {member.nextLevel && (
                <span style={{ marginLeft: 12 }}>
                  距离 {member.nextLevel.name} 还差 {member.growthProgress.remaining} 成长值
                </span>
              )}
            </div>
            <Progress
              percent={growthPercent}
              showInfo={false}
              strokeColor="#ffd700"
              trailColor="rgba(255,255,255,0.3)"
              style={{ marginTop: 8, maxWidth: 400 }}
            />
          </Col>
        </Row>
      </Card>

      {/* 基本信息 + 消费统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card title="基本信息" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="昵称">{basic.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{basic.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="真实姓名">{basic.realName || '-'}</Descriptions.Item>
              <Descriptions.Item label="生日">{basic.birthday ? dayjs(basic.birthday).format('MM月DD日') : '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[basic.status]?.color}>{statusMap[basic.status]?.label || basic.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">{stats.createdAt ? dayjs(stats.createdAt).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
              <Descriptions.Item label="最后登录">{stats.lastLoginAt ? dayjs(stats.lastLoginAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
              <Descriptions.Item label="关联后台用户">{basic.linkedUserName || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="消费统计" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="总订单" value={stats.totalOrders} prefix={<ShoppingCartOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title="总消费" value={`¥${Number(stats.totalAmount || 0).toFixed(2)}`} prefix={<DollarOutlined />} />
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="客户状态"
                  value={churnMap[stats.churnStatus]?.label || stats.churnStatus}
                  valueStyle={{ color: stats.churnStatus === 'ACTIVE' ? '#52c41a' : '#faad14' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最后下单"
                  value={stats.lastOrderAt ? dayjs(stats.lastOrderAt).format('MM-DD') : '无订单'}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 订单历史 */}
      <Card title="订单历史" size="small" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          columns={orderColumns}
          dataSource={orders}
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 优惠券 */}
      <Card title="优惠券" size="small">
        <Table
          rowKey="id"
          columns={couponColumns}
          dataSource={coupons}
          pagination={false}
          size="small"
          scroll={{ x: 600 }}
        />
      </Card>
    </div>
  );
};

export default CustomerProfile;
