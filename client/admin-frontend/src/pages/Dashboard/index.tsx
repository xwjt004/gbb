import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, message, Space, Button, Card, Badge } from 'antd';
import {
  DashboardOutlined, ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import ReactECharts from 'echarts-for-react';
import StatCards from '@/components/dashboard/index/StatCards';
import ChartPanel from '@/components/dashboard/index/ChartPanel';
import RecentOrdersPanel from '@/components/dashboard/index/RecentOrdersPanel';
import { Order, OrderStats } from '@/types/order';
import { UserStats } from '@/types/user';
import { PackageStats } from '@/types/package';
import { orderService } from '@/services/orders';
import { userService } from '@/services/users';
import './Dashboard.css';

interface CashFlowTrendData {
  date: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  refundRequested: number;
  refundCompleted: number;
}

interface DashboardData {
  userStats: UserStats;
  orderStats: OrderStats;
  packageStats: PackageStats;
  recentOrders: Order[];
  cashFlowTrends: CashFlowTrendData[];
  radarIndicators: { users: number; revenue: number };
}


/* ── Particle star background ── */
function Particles() {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 1,
      delay: Math.random() * 15,
      duration: Math.random() * 20 + 15,
      opacity: Math.random() * 0.5 + 0.2,
    }));
  }, []);
  return (
    <div className="dashboard-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="dashboard-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: p.id % 3 === 0 ? 'rgba(212,163,115,0.5)' : 'rgba(255,255,255,0.3)',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cashFlowDateRange, setCashFlowDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);
  const [time, setTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'));

  const [data, setData] = useState<DashboardData>({
    userStats: {
      totalUsers: 0, activeUsers: 0, newUsersToday: 0, vipUsers: 0, growthRate: 0,
    },
    orderStats: {
      totalOrders: 0, paidOrders: 0, pendingOrders: 0, confirmedOrders: 0, completedOrders: 0,
      cancelledOrders: 0, paidPendingOrders: 0, unpaidPendingOrders: 0,
      totalRevenue: 0, todayOrders: 0, conversionRate: 0,
    },
    packageStats: {
      totalPackages: 0, activePackages: 0, popularPackages: 0, avgPrice: 0,
      totalBookings: 0, topSellingPackage: { name: '', bookings: 0 },
    },
    recentOrders: [],
    cashFlowTrends: [],
    radarIndicators: { users: 0, revenue: 0 },
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [cashFlowDateRange]);

  /* ── Live clock ── */
  useEffect(() => {
    const t = setInterval(() => setTime(dayjs().format('YYYY-MM-DD HH:mm:ss')), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [userStats, orderStats, cashFlowTrends, recentOrders] = await Promise.all([
        userService.getUserStats(),
        orderService.getOrderStats(),
        orderService.getCashFlowTrendsByDateRange(
          cashFlowDateRange[0].format('YYYY-MM-DD'),
          cashFlowDateRange[1].format('YYYY-MM-DD'),
        ),
        orderService.getOrders({ page: 1, pageSize: 10 }),
      ]);
      const totalUsers = userStats.data?.totalUsers || 0;
      const totalRevenue = orderStats.data?.totalRevenue || 0;
      setData({
        userStats: {
          totalUsers,
          activeUsers: userStats.data?.activeUsers || 0,
          newUsersToday: userStats.data?.newUsersToday || 0,
          vipUsers: userStats.data?.vipUsers || 0,
          growthRate: userStats.data?.growthRate || 0,
        },
        orderStats: {
          totalOrders: orderStats.data?.totalOrders || 0,
          paidOrders: orderStats.data?.paidOrders || 0,
          pendingOrders: orderStats.data?.pendingOrders || 0,
          confirmedOrders: orderStats.data?.confirmedOrders || 0,
          completedOrders: orderStats.data?.completedOrders || 0,
          cancelledOrders: orderStats.data?.cancelledOrders || 0,
          paidPendingOrders: orderStats.data?.paidPendingOrders || 0,
          unpaidPendingOrders: orderStats.data?.unpaidPendingOrders || 0,
          totalRevenue,
          todayOrders: orderStats.data?.todayOrders || 0,
          conversionRate: orderStats.data?.conversionRate || 0,
        },
        packageStats: {
          totalPackages: 0, activePackages: 0, popularPackages: 0, avgPrice: 0,
          totalBookings: 0, topSellingPackage: { name: '', bookings: 0 },
        },
        recentOrders: recentOrders.data?.list || [],
        cashFlowTrends: cashFlowTrends.data || [],
        radarIndicators: {
          users: Math.min(100, Math.round(totalUsers / 10)),
          revenue: Math.min(100, Math.round(totalRevenue / 1000)),
        },
      });
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      message.error('加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    message.success('数据已刷新');
  };

  const handleCashFlowDateChange = (dates: [Dayjs, Dayjs] | null) => {
    if (dates) setCashFlowDateRange(dates);
  };

  /* ── Chart option ── */
  const cashFlowTrendOption = {
    title: {
      text: '预约资金流趋势',
      left: 'left',
      textStyle: { fontSize: 16, fontWeight: 'bold', color: '#e8e8f0' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(16,24,52,0.96)',
      borderColor: 'rgba(212,163,115,0.25)',
      borderWidth: 1,
      padding: [16, 20],
      textStyle: { color: '#e8e8f0', fontSize: 14 },
      extraCssText: 'box-shadow:0 8px 32px rgba(0,0,0,0.5);border-radius:12px;',
      formatter(params: any) {
        if (!params?.length) return '';
        let html = `<div style="margin-bottom:10px;font-weight:bold;font-size:16px;border-bottom:1px solid rgba(212,163,115,0.12);padding-bottom:8px;color:#d4a373;">${params[0].axisValue}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="display:inline-flex;align-items:center;gap:8px;color:#a0a0b8;font-size:14px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};box-shadow:0 0 6px ${p.color};"></span>${p.seriesName}
            </span>
            <strong style="color:#e8e8f0;font-size:15px;">¥${Number(p.value || 0).toFixed(2)}</strong>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: ['订单总金额', '已收款', '未收款', '申请退款', '已退款'],
      top: 28,
      icon: 'roundRect',
      textStyle: { color: '#a0a0b8', fontSize: 12 },
    },
    grid: { left: '3%', right: '4%', bottom: '6%', top: '18%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => i.date) : ['无数据'],
      axisLine: { lineStyle: { color: 'rgba(212,163,115,0.12)' } },
      axisLabel: { color: '#8888a0', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '金额 (元)',
      axisLine: { lineStyle: { color: 'rgba(212,163,115,0.12)' } },
      axisLabel: { formatter: '¥{value}', color: '#8888a0', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(212,163,115,0.05)' } },
    },
    series: [
      { name: '订单总金额', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => Number(i.totalAmount || 0)) : [0],
        itemStyle: { color: '#00e5ff', borderColor: '#00e5ff', borderWidth: 2 },
        lineStyle: { width: 2.5, shadowColor: 'rgba(0,229,255,0.15)', shadowBlur: 6 } },
      { name: '已收款', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => Number(i.paidAmount || 0)) : [0],
        itemStyle: { color: '#d4a373', borderColor: '#d4a373', borderWidth: 2 },
        lineStyle: { width: 2.5, shadowColor: 'rgba(212,163,115,0.15)', shadowBlur: 6 } },
      { name: '未收款', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => Number(i.unpaidAmount || 0)) : [0],
        itemStyle: { color: '#ffab40', borderColor: '#ffab40', borderWidth: 2 },
        lineStyle: { width: 2.5 } },
      { name: '申请退款', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => Number(i.refundRequested || 0)) : [0],
        itemStyle: { color: '#ff4d4f', borderColor: '#ff4d4f', borderWidth: 2 },
        lineStyle: { width: 2.5, type: 'dashed' } },
      { name: '已退款', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
        data: data.cashFlowTrends?.length ? data.cashFlowTrends.map(i => Number(i.refundCompleted || 0)) : [0],
        itemStyle: { color: '#6b6b80', borderColor: '#6b6b80', borderWidth: 2 },
        lineStyle: { width: 2.5 } },
    ],
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut' as any,
  };

  /* ── Radar chart option ── */
  const radarOption = {
    radar: {
      indicator: [
        { name: '用户总量', max: 100 },
        { name: '订单转化率', max: 100 },
        { name: '总收入', max: 100 },
        { name: '活跃度', max: 100 },
        { name: 'VIP占比', max: 100 },
      ],
      shape: 'circle',
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#d4a373', fontSize: 11, fontWeight: 600 },
      splitLine: { lineStyle: { color: 'rgba(212,163,115,0.12)' } },
      splitArea: {
        areaStyle: { color: ['rgba(212,163,115,0.02)', 'rgba(212,163,115,0.06)'] },
      },
      axisLine: { lineStyle: { color: 'rgba(212,163,115,0.15)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          data.radarIndicators?.users ?? 0,
          data.orderStats.conversionRate,
          data.radarIndicators?.revenue ?? 0,
          data.userStats.totalUsers > 0
            ? Number((data.userStats.activeUsers / data.userStats.totalUsers * 100).toFixed(1))
            : 0,
          data.userStats.totalUsers > 0
            ? Number((data.userStats.vipUsers / data.userStats.totalUsers * 100).toFixed(1))
            : 0,
        ],
        name: '业务指标',
        areaStyle: { color: 'rgba(212,163,115,0.2)' },
        lineStyle: { color: '#d4a373', width: 2 },
        itemStyle: { color: '#f8e7c1' },
      }],
      symbol: 'circle',
      symbolSize: 6,
    }],
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(16,24,52,0.96)',
      borderColor: 'rgba(212,163,115,0.25)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#e8e8f0', fontSize: 12 },
      formatter: (params: any) => {
        if (!params?.value) return '';
        const names = ['用户总量', '订单转化率', '总收入', '活跃度', 'VIP占比'];
        let html = '<div style="font-weight:bold;margin-bottom:8px;color:#d4a373;border-bottom:1px solid rgba(212,163,115,0.12);padding-bottom:6px;">业务指标</div>';
        params.value.forEach((v: number, i: number) => {
          html += '<div style="display:flex;justify-content:space-between;gap:24px;font-size:12px;color:#a0a0b8;margin:4px 0;"><span>' + names[i] + '</span><strong style="color:#e8e8f0;">' + (i === 2 ? '¥' + v.toLocaleString() : v) + '</strong></div>';
        });
        return html;
      },
    },
  };

  /* ── System health gauge ── */
  const healthScore = (() => {
    const cr = Number(data.orderStats.conversionRate || 0);
    const orderDenom = data.orderStats.paidOrders + data.orderStats.unpaidPendingOrders;
    const pendingRatio = orderDenom > 0
      ? Math.max(0, 100 - (data.orderStats.pendingOrders / orderDenom) * 100)
      : 100;
    const activeRatio = data.userStats.totalUsers > 0
      ? (data.userStats.activeUsers / data.userStats.totalUsers) * 100
      : 0;
    const completionRatio = data.orderStats.paidOrders > 0
      ? (data.orderStats.completedOrders / data.orderStats.paidOrders) * 100
      : 0;
    return Math.min(100, Math.round(cr * 0.3 + pendingRatio * 0.3 + activeRatio * 0.2 + completionRatio * 0.2));
  })();

  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: 100,
      splitNumber: 5,
      progress: { show: true, width: 10, roundCap: true },
      axisLine: {
        lineStyle: {
          width: 10,
          color: [
            [0.3, '#ff4d4f'],
            [0.7, '#fa8c16'],
            [1, '#52c41a'],
          ],
        },
      },
      axisTick: { distance: -8, length: 6, lineStyle: { color: '#8888b0', width: 1 } },
      splitLine: { distance: -12, length: 12, lineStyle: { color: '#d4a373', width: 2 } },
      axisLabel: { color: '#8888b0', distance: 12, fontSize: 10 },
      pointer: { width: 4, length: '55%', itemStyle: { color: '#d4a373' } },
      detail: {
        valueAnimation: true,
        formatter: '{value}%',
        color: '#d4a373',
        fontSize: 18,
        fontWeight: 'bold',
        offsetCenter: [0, '50%'],
      },
      title: { offsetCenter: [0, '75%'], fontSize: 12, color: '#8888b0' },
      data: [{ value: healthScore, name: '系统健康度' }],
    }],
  };

  return (
    <div className="dashboard-container">
      <Particles />
      <div className="dashboard-orb-bg" />

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div className="dashboard-title-icon"><DashboardOutlined /></div>
          <div>
            <div className="dashboard-title-text">控制台</div>
            <div className="dashboard-title-sub">Dashboard · 系统管理</div>
          </div>
        </div>
        <div className="dashboard-header-right">
          <span className="dashboard-status-dot" />
          <span className="dashboard-time">{time}</span>
          <Button type="default" size="small" icon={<ReloadOutlined />}
            onClick={handleRefresh} loading={refreshing}>刷新</Button>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <StatCards userStats={data.userStats} orderStats={data.orderStats} />

      {/* ── Row 2: Chart + Sidebar ── */}
      <Row gutter={[24, 24]} style={{ marginBottom: 16 }}>
        {/* Chart: 2/3 width */}
        <Col xs={24} lg={16}>
          <ChartPanel
            loading={loading}
            orderTrends={data.cashFlowTrends}
            option={cashFlowTrendOption}
            dateRange={cashFlowDateRange}
            setDateRange={handleCashFlowDateChange}
            refreshing={refreshing}
            handleRefresh={handleRefresh}
          />
        </Col>
        {/* Sidebar: 1/3 width */}
        <Col xs={24} lg={8}>
          <div className="dashboard-sidebar">
            <Card
              title={<Space><span style={{ color: '#d4a373' }}>业务雷达</span><Badge count={5} size="small" style={{ backgroundColor: '#d4a373' }} /></Space>}
              className="sidebar-chart-card"
            >
              <ReactECharts option={radarOption} style={{ height: 260 }} />
            </Card>
            <Card
              title={<Space><span style={{ color: '#d4a373' }}>系统健康</span></Space>}
              className="sidebar-chart-card"
            >
              <ReactECharts option={gaugeOption} style={{ height: 240 }} />
            </Card>
          </div>
        </Col>
      </Row>

      {/* ── Row 3: Recent Orders ── */}
      <RecentOrdersPanel
        recentOrders={data.recentOrders as any}
        loading={loading}
        onRefresh={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;
