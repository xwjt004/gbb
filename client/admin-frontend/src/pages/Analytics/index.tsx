import React, { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Tabs } from 'antd';
import dayjs from 'dayjs';
import { analyticsService } from '@/services/analyticsService';
import type {
  OverviewData, UserAnalytics, BehaviorAnalytics,
  PackageAnalytics, LoyaltyAnalytics,
} from '@/services/analyticsService';
import OverviewTab from './OverviewTab';
import RevenueTab from './RevenueTab';
import CustomerTab from './CustomerTab';
import PackageTab from './PackageTab';

const { RangePicker } = DatePicker;

const AnalyticsCenter: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'), dayjs(),
  ]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [behavior, setBehavior] = useState<BehaviorAnalytics | null>(null);
  const [pkg, setPkg] = useState<PackageAnalytics | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyAnalytics | null>(null);

  const params = {
    startDate: dateRange[0].format('YYYY-MM-DD'),
    endDate: dateRange[1].format('YYYY-MM-DD'),
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, ua, bh, pk, ly] = await Promise.all([
        analyticsService.getOverview(params).catch(() => null),
        analyticsService.getUserAnalytics(params).catch(() => null),
        analyticsService.getBehaviorAnalytics(params).catch(() => null),
        analyticsService.getPackageAnalytics(params).catch(() => null),
        analyticsService.getLoyaltyAnalytics(params).catch(() => null),
      ]);
      const extract = (res: any) => res?.data || res;
      setOverview(extract(ov));
      setUserAnalytics(extract(ua));
      setBehavior(extract(bh));
      setPkg(extract(pk));
      setLoyalty(extract(ly));
    } catch {
      // errors handled per-call
    } finally {
      setLoading(false);
    }
  }, [dateRange[0].valueOf(), dateRange[1].valueOf()]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabItems = [
    {
      key: 'overview', label: '综合看板',
      children: <OverviewTab overview={overview} behavior={behavior} loyalty={loyalty} loading={loading} dateRange={dateRange} />,
    },
    {
      key: 'revenue', label: '营收分析',
      children: <RevenueTab behavior={behavior} pkg={pkg} loading={loading} />,
    },
    {
      key: 'customer', label: '客户分析',
      children: <CustomerTab user={userAnalytics} loyalty={loyalty} loading={loading} />,
    },
    {
      key: 'package', label: '套餐分析',
      children: <PackageTab pkg={pkg} loading={loading} />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>数据分析中心</h2>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
            }}
            allowClear={false}
          />
        </div>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </div>
  );
};

export default AnalyticsCenter;
