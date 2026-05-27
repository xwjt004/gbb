import React, { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Space, Spin } from 'antd';
import { DollarOutlined, ShoppingCartOutlined, SwapOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import KpiCards, { KpiCardData } from './components/KpiCards';
import TrendChart from './components/TrendChart';
import ComparativeAnalysis from './components/ComparativeAnalysis';
import DrillDownModal from './components/DrillDownModal';
import { dataDashboardService, ComprehensiveTrendItem, ComparativeResult } from '@/services/dataDashboard';

const { RangePicker } = DatePicker;

const BusinessDashboard: React.FC = () => {
  const [trendData, setTrendData] = useState<ComprehensiveTrendItem[]>([]);
  const [comparativeData, setComparativeData] = useState<ComparativeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [drillDown, setDrillDown] = useState<{ visible: boolean; dimension: 'package' | 'channel'; title: string }>({
    visible: false, dimension: 'package', title: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const [trend, comparative] = await Promise.all([
        dataDashboardService.getComprehensiveTrends(startDate, endDate),
        dataDashboardService.getComparativeAnalysis(
          dayjs().startOf('month').format('YYYY-MM-DD'),
          dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
          30,
        ).catch(() => null),
      ]);

      setTrendData(trend || []);
      setComparativeData(comparative);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPI calculations from trend data
  const currentPeriod = trendData.slice(-30);
  const prevPeriod = trendData.slice(-60, -30);

  const totalRevenue = currentPeriod.reduce((s, d) => s + d.revenue, 0);
  const prevRevenue = prevPeriod.length > 0 ? prevPeriod.reduce((s, d) => s + d.revenue, 0) : 0;
  const totalOrders = currentPeriod.reduce((s, d) => s + d.orderCount, 0);
  const prevOrders = prevPeriod.length > 0 ? prevPeriod.reduce((s, d) => s + d.orderCount, 0) : 0;
  const avgAOV = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const prevAOV = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;
  const avgConv = currentPeriod.length > 0 ? Math.round(currentPeriod.reduce((s, d) => s + d.conversionRate, 0) / currentPeriod.length) : 0;
  const prevConv = prevPeriod.length > 0 ? Math.round(prevPeriod.reduce((s, d) => s + d.conversionRate, 0) / prevPeriod.length) : 0;

  const calcChange = (curr: number, prev: number) => prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : 0;

  const kpiData: KpiCardData[] = [
    { title: '本期营收', value: totalRevenue, prefix: '¥', change: calcChange(totalRevenue, prevRevenue), changeLabel: '环比', icon: <DollarOutlined />, onClick: () => setDrillDown({ visible: true, dimension: 'package', title: '营收构成分析' }) },
    { title: '订单量', value: totalOrders, change: calcChange(totalOrders, prevOrders), changeLabel: '环比', icon: <ShoppingCartOutlined />, onClick: () => setDrillDown({ visible: true, dimension: 'package', title: '订单构成分析' }) },
    { title: '客单价', value: avgAOV, prefix: '¥', change: calcChange(avgAOV, prevAOV), changeLabel: '环比', icon: <SwapOutlined /> },
    { title: '转化率', value: avgConv, suffix: '%', change: calcChange(avgConv, prevConv), changeLabel: '环比', icon: <RiseOutlined /> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>数据看板</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
            }}
            allowClear={false}
          />
        </Space>
        <Spin spinning={loading}>
          <KpiCards data={kpiData} />
          <TrendChart data={trendData} />
          <ComparativeAnalysis data={comparativeData} />
        </Spin>
      </Card>

      <DrillDownModal
        visible={drillDown.visible}
        title={drillDown.title}
        dimension={drillDown.dimension}
        onClose={() => setDrillDown({ ...drillDown, visible: false })}
      />
    </div>
  );
};

export default BusinessDashboard;
