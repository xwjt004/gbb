import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
const { Text } = Typography;
import {
  RiseOutlined, FallOutlined,
} from '@ant-design/icons';

/* ── SVG Circular Ring ── */
interface RingProps {
  value: number;
  size: number;
  stroke: string;
  strokeBg?: string;
  children: React.ReactNode;
}

const CircularRing: React.FC<RingProps> = ({ value, size, stroke, strokeBg = 'rgba(212,163,115,0.08)', children }) => {
  const sw = 5;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={strokeBg} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth={sw}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </div>
  );
};

/* ── Trend Badge ── */
const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
  const up = value >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
      color: up ? '#52c41a' : '#ff4d4f', background: up ? 'rgba(82,196,26,0.1)' : 'rgba(255,77,79,0.1)',
      padding: '0 6px', borderRadius: 10, lineHeight: '18px',
    }}>
      {up ? <RiseOutlined /> : <FallOutlined />}{Math.abs(value)}%
    </span>
  );
};

/* ── Props ── */
interface Props {
  userStats: any;
  orderStats: any;
}

const StatCards: React.FC<Props> = ({ userStats, orderStats }) => {
  const cr = Number(orderStats.conversionRate || 0);
  const ringSize = 110;

  /* Normalize values to 0-100 for ring fill */
  const userPct = Math.min(userStats.totalUsers / 2000 * 100, 100);
  const paidOrderPct = Math.min(orderStats.paidOrders / 1000 * 100, 100);
  const revenuePct = Math.min(orderStats.totalRevenue / 100000 * 100, 100);
  const paidPending = Number(orderStats.paidPendingOrders || 0);
  const unpaidPending = Number(orderStats.unpaidPendingOrders || 0);
  const totalPending = paidPending + unpaidPending;
  const pendingPct = totalPending > 0
    ? Math.min(totalPending / 50 * 100, 100)
    : 100;
  const refundedOrders = Number(orderStats.refundedOrders || 0);
  const refundPct = Math.min(refundedOrders / 100 * 100, 100);

  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {/* ── Users ── */}
      <Col xs={12} lg={6}>
        <Card styles={{ body: { padding: '20px 16px', textAlign: 'center' as const } }}>
          <CircularRing value={userPct} size={ringSize} stroke="url(#goldGrad)">
            <div style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg,#bf953f,#fcf6ba,#b38728,#fbf5b7,#aa771c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>{userStats.totalUsers}</div>
            <div style={{ fontSize: 11, color: '#8888b0', marginTop: 2 }}>总用户</div>
          </CircularRing>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <TrendBadge value={userStats.growthRate} />
            <Text type="secondary" style={{ fontSize: 11 }}>新增 <span style={{ color: '#f8e7c1' }}>{userStats.newUsersToday}</span></Text>
          </div>
          {/* SVG gradient definition for gold ring */}
          <svg width={0} height={0}><defs><linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#bf953f" /><stop offset="50%" stopColor="#fcf6ba" /><stop offset="100%" stopColor="#aa771c" /></linearGradient></defs></svg>
        </Card>
      </Col>

      {/* ── Paid Orders ── */}
      <Col xs={12} lg={6}>
        <Card styles={{ body: { padding: '20px 16px', textAlign: 'center' as const } }}>
          <CircularRing value={paidOrderPct} size={ringSize} stroke="#00e5ff">
            <div style={{ fontSize: 24, fontWeight: 800, color: '#00e5ff', lineHeight: 1.1 }}>{orderStats.paidOrders}</div>
            <div style={{ fontSize: 11, color: '#8888b0', marginTop: 2 }}>已支付总订单</div>
          </CircularRing>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <TrendBadge value={cr} />
            <Text type="secondary" style={{ fontSize: 11 }}>今日 <span style={{ color: '#00e5ff' }}>{orderStats.todayOrders}</span></Text>
          </div>
        </Card>
      </Col>

      {/* ── Revenue ── */}
      <Col xs={12} lg={6}>
        <Card styles={{ body: { padding: '20px 16px', textAlign: 'center' as const } }}>
          <CircularRing value={revenuePct} size={ringSize} stroke="#52c41a">
            <div style={{ fontSize: 24, fontWeight: 800, color: '#52c41a', lineHeight: 1.1 }}>¥{Number(orderStats.totalRevenue).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#8888b0', marginTop: 2 }}>总收入</div>
          </CircularRing>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>转化率 <span style={{ color: '#d4a373' }}>{cr}%</span></Text>
          </div>
        </Card>
      </Col>

      {/* ── Pending (split into paid & unpaid) ── */}
      <Col xs={12} lg={6}>
        <Card styles={{ body: { padding: '20px 16px', textAlign: 'center' as const } }}>
          <CircularRing value={pendingPct} size={ringSize} stroke={totalPending > 0 ? '#ffab40' : '#52c41a'}>
            <div style={{ fontSize: 24, fontWeight: 800, color: totalPending > 0 ? '#ffab40' : '#52c41a', lineHeight: 1.1 }}>{totalPending}</div>
            <div style={{ fontSize: 11, color: '#8888b0', marginTop: 2 }}>待处理</div>
          </CircularRing>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Text style={{ fontSize: 12, color: paidPending > 0 ? '#ee0a24' : '#52c41a' }}>
              已付款 <strong>{paidPending}</strong>
            </Text>
            <Text style={{ fontSize: 12, color: unpaidPending > 0 ? '#fa8c16' : '#8888b0' }}>
              未付款 <strong>{unpaidPending}</strong>
            </Text>
          </div>
        </Card>
      </Col>

      {/* ── Refunded Orders ── */}
      <Col xs={12} lg={6}>
        <Card styles={{ body: { padding: '20px 16px', textAlign: 'center' as const } }}>
          <CircularRing value={refundPct} size={ringSize} stroke="#ff4d4f">
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ff4d4f', lineHeight: 1.1 }}>{refundedOrders}</div>
            <div style={{ fontSize: 11, color: '#8888b0', marginTop: 2 }}>已退款订单</div>
          </CircularRing>
        </Card>
      </Col>
    </Row>
  );
};

export default StatCards;
