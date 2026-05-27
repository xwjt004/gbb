import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Tabs, DatePicker, Button, Alert, Space, Typography, Progress, Select, Form, message, Spin, Modal, Dropdown } from 'antd';
import { useDashboardSettings } from '../../hooks/useDashboardSettings';
import { chartThemes } from '../../config/chartThemes';
import { ThemeEditor } from '../../components/ThemeEditor';
import dayjs, { Dayjs } from 'dayjs';
import { FileExcelOutlined, FilePdfOutlined, DownloadOutlined, SettingOutlined, MoreOutlined, ReloadOutlined, DollarOutlined, ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons';

import { exportExcel, exportPDF, backupData } from '../../components/dashboard/ui/exportUtils';
import SuspiciousPaymentsTable from '../../components/dashboard/ui/SuspiciousPaymentsTable';
import TrendCharts from '../../components/dashboard/ui/TrendCharts';
import RefundDetails from '../../components/dashboard/ui/RefundDetails';
import ReconciliationCard from '../../components/dashboard/ui/ReconciliationCard';
import { DashboardStats, TrendData, SuspiciousPayment, RefundAnalysis } from './dashboardTypes';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

// 类型已拆分到 dashboardTypes.ts

const EnhancedReconciliation: React.FC = () => {
  // State declarations
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const { settings, updateSettings } = useDashboardSettings();
  const [suspiciousPayments, setSuspiciousPayments] = useState<SuspiciousPayment[]>([]);
  const [refundAnalysis, setRefundAnalysis] = useState<RefundAnalysis | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedSuspiciousType, setSelectedSuspiciousType] = useState<'all' | 'duplicate' | 'overpayment' | 'system_error'>('all');

  // API calls with useCallback
  const loadDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/statistics-analysis/dashboard/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      message.error('加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrendData = useCallback(async () => {
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await fetch(
        `/api/v1/statistics-analysis/orders/trend?period=${selectedPeriod}&startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTrendData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载趋势数据失败:', error);
      message.error('加载趋势数据失败');
      setTrendData([]);
    }
  }, [dateRange, selectedPeriod]);

  const loadSuspiciousPayments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/statistics-analysis/payments/suspicious?type=${selectedSuspiciousType}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSuspiciousPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载可疑支付数据失败:', error);
      message.error('加载可疑支付数据失败');
      setSuspiciousPayments([]);
    }
  }, [selectedSuspiciousType]);

  const loadRefundAnalysis = useCallback(async () => {
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      const response = await fetch(
        `/api/v1/statistics-analysis/refunds/analysis?startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRefundAnalysis(data);
    } catch (error) {
      console.error('加载退款分析数据失败:', error);
      message.error('加载退款分析数据失败');
      setRefundAnalysis(null);
    }
  }, [dateRange]);

  // 刷新所有数据
  const refreshAllData = useCallback(() => {
    loadDashboardStats();
    loadTrendData();
    loadSuspiciousPayments();
    loadRefundAnalysis();
  }, [loadDashboardStats, loadTrendData, loadSuspiciousPayments, loadRefundAnalysis]);

  // Effects
  // 自动刷新功能
  useEffect(() => {
    refreshAllData();

    if (settings.autoRefresh !== 'never') {
      const interval = parseInt(settings.autoRefresh) * 1000;
      const timer = setInterval(refreshAllData, interval);
      
      return () => clearInterval(timer);
    }
  }, [refreshAllData, settings.autoRefresh]);

  useEffect(() => {
    loadTrendData();
    loadRefundAnalysis();
  }, [dateRange, selectedPeriod, loadTrendData, loadRefundAnalysis]);

  useEffect(() => {
    loadSuspiciousPayments();
  }, [loadSuspiciousPayments]);

  // 辅助函数
  // 可疑支付的严重性颜色逻辑已移入 SuspiciousPaymentsTable 组件

  // 数据转换工具函数
  const handleExportExcel = async () => {
    console.log('handleExportExcel invoked');
    try {
      setLoading(true);
      message.loading('正在导出Excel...', 0);
      await exportExcel(trendData, refundAnalysis);
      message.destroy();
      message.success('Excel导出成功');
    } catch (error) {
      message.destroy();
      message.error('导出失败，请稍后重试');
      console.error('导出Excel失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    console.log('handleExportPDF invoked');
    try {
      setLoading(true);
      message.loading('正在导出PDF...', 0);
      await exportPDF(dashboardStats, refundAnalysis);
      message.destroy();
      message.success('PDF导出成功');
    } catch (error) {
      message.destroy();
      message.error('导出失败，请稍后重试');
      console.error('导出PDF失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackupData = async () => {
    console.log('handleBackupData invoked');
    try {
      setLoading(true);
      message.loading('正在备份数据...', 0);
      backupData({ dashboardStats, trendData, refundAnalysis, suspiciousPayments });
      message.destroy();
      message.success('数据备份完成');
    } catch (error) {
      message.destroy();
      message.error('备份失败，请稍后重试');
      console.error('数据备份失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showCustomTheme, setShowCustomTheme] = useState(false);

  const handleOpenSettings = () => {
    const [form] = Form.useForm();
    form.setFieldsValue(settings);

    Modal.confirm({
      title: '系统设置',
      width: settings.chartTheme === 'custom' || showCustomTheme ? '80%' : 600,
      content: (
        <>
          <Form form={form} layout="vertical" initialValues={settings}>
            <Form.Item 
              name="defaultDateRange" 
              label="默认时间范围"
            >
              <Select>
                <Option value="7days">近7天</Option>
                <Option value="30days">近30天</Option>
                <Option value="90days">近90天</Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name="autoRefresh" 
              label="自动刷新"
            >
              <Select>
                <Option value="never">从不</Option>
                <Option value="30s">每30秒</Option>
                <Option value="1min">每1分钟</Option>
                <Option value="5min">每5分钟</Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name="chartTheme" 
              label="图表主题"
            >
              <Select
                onChange={(value) => {
                  setShowCustomTheme(value === 'custom');
                  form.setFieldsValue({ chartTheme: value });
                }}
              >
                <Option value="default">默认主题</Option>
                <Option value="dark">暗色主题</Option>
                <Option value="light">浅色主题</Option>
                <Option value="custom">自定义主题</Option>
              </Select>
            </Form.Item>
          </Form>

          {(settings.chartTheme === 'custom' || showCustomTheme) && (
            <div style={{ marginTop: 24 }}>
              <ThemeEditor
                theme={chartThemes.custom}
                onThemeChange={(newTheme) => {
                  const newThemes = { ...chartThemes, custom: newTheme };
                  // 更新主题
                  Object.assign(chartThemes, newThemes);
                }}
              />
            </div>
          )}
        </>
      ),
      onOk: async () => {
        try {
          const values = await form.validateFields();
          updateSettings(values);
          message.success('设置已保存');
        } catch (error) {
          console.error('验证表单失败:', error);
        }
      },
    });
  };

  // Event handlers
  // 可疑支付的查看和标记逻辑已移到 SuspiciousPaymentsTable 组件中

  // 可疑支付表格已拆分到 SuspiciousPaymentsTable 组件

  // Tabs content
  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card title="收入趋势" extra={
              <Select value={selectedPeriod} onChange={setSelectedPeriod} style={{ width: 120 }}>
                <Option value="daily">按日</Option>
                <Option value="weekly">按周</Option>
                <Option value="monthly">按月</Option>
              </Select>
            }>
              <TrendCharts data={trendData} themeKey={settings.chartTheme as keyof typeof chartThemes} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="本月 vs 上月对比" style={{ marginBottom: '16px' }}>
              {dashboardStats && dashboardStats.thisMonth && dashboardStats.lastMonth && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Text>订单数量</Text>
                    <Progress percent={dashboardStats.lastMonth.orders > 0 ? Math.round((dashboardStats.thisMonth.orders / dashboardStats.lastMonth.orders) * 100) : 0} format={() => `${dashboardStats.thisMonth.orders}/${dashboardStats.lastMonth.orders}`} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <Text>收入金额</Text>
                    <Progress percent={dashboardStats.lastMonth.revenue > 0 ? Math.round((dashboardStats.thisMonth.revenue / dashboardStats.lastMonth.revenue) * 100) : 0} format={() => `¥${dashboardStats.thisMonth.revenue}/¥${dashboardStats.lastMonth.revenue}`} />
                  </div>
                  <div>
                    <Text>退款数量</Text>
                    <Progress percent={dashboardStats.lastMonth.refunds > 0 ? Math.round((dashboardStats.thisMonth.refunds / dashboardStats.lastMonth.refunds) * 100) : 0} status={dashboardStats.thisMonth.refunds > dashboardStats.lastMonth.refunds ? 'exception' : 'success'} format={() => `${dashboardStats.thisMonth.refunds}/${dashboardStats.lastMonth.refunds}`} />
                  </div>
                </div>
              )}
            </Card>

            {refundAnalysis && (
              <Card title="退款原因分布">
                <RefundDetails refundAnalysis={refundAnalysis} themeKey={settings.chartTheme as keyof typeof chartThemes} />
              </Card>
            )}
          </Col>
        </Row>
      ),
    },
    {
      key: 'suspicious',
      label: '可疑支付',
      children: (
        <Card title="可疑支付检测" extra={<Select value={selectedSuspiciousType} onChange={setSelectedSuspiciousType} style={{ width: 150 }}><Option value="all">全部</Option><Option value="duplicate">重复支付</Option><Option value="overpayment">超额支付</Option><Option value="system_error">系统错误</Option></Select>}>
          {suspiciousPayments.length > 0 && <Alert message={`发现 ${suspiciousPayments.length} 条可疑支付记录`} type="warning" showIcon style={{ marginBottom: 16 }} />}
          <SuspiciousPaymentsTable data={suspiciousPayments} onRefresh={loadSuspiciousPayments} />
        </Card>
      ),
    },
    {
      key: 'refunds',
      label: '退款分析',
      children: refundAnalysis && <RefundDetails refundAnalysis={refundAnalysis} themeKey={settings.chartTheme as keyof typeof chartThemes} />,
    },
    {
      key: 'reconciliation',
      label: '对账管理',
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <ReconciliationCard />
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>统计分析与对账管理</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange(dates as [Dayjs, Dayjs]);
                // 强制立即更新数据
                loadTrendData();
                loadRefundAnalysis();
              }
            }}
            format="YYYY-MM-DD"
            presets={[
              { label: '今日', value: [dayjs(), dayjs()] },
              { label: '近7天', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: '近30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
              { label: '近90天', value: [dayjs().subtract(89, 'day'), dayjs()] },
            ]}
          />
          <Dropdown
            trigger={['click']}
            menu={{
              onClick: (info) => {
                console.log('Dropdown.menu.onClick', info);
                const key = (info && (info as any).key) || '';
                switch (key) {
                  case 'exportExcel':
                    handleExportExcel();
                    break;
                  case 'exportPDF':
                    handleExportPDF();
                    break;
                  case 'settings':
                    handleOpenSettings();
                    break;
                  case 'backup':
                    handleBackupData();
                    break;
                }
              },
              items: [
                {
                  key: 'exportExcel',
                  label: '导出Excel',
                  icon: <FileExcelOutlined />,
                  onClick: () => { console.log('item exportExcel clicked'); handleExportExcel(); }
                },
                {
                  key: 'exportPDF',
                  label: '导出PDF',
                  icon: <FilePdfOutlined />,
                  onClick: () => { console.log('item exportPDF clicked'); handleExportPDF(); }
                },
                {
                  type: 'divider',
                },
                {
                  key: 'settings',
                  label: '系统设置',
                  icon: <SettingOutlined />,
                  onClick: () => { console.log('item settings clicked'); handleOpenSettings(); }
                },
                {
                  key: 'backup',
                  label: '数据备份',
                  icon: <DownloadOutlined />,
                  onClick: () => { console.log('item backup clicked'); handleBackupData(); }
                },
              ],
            }}
          >
            <Button icon={<MoreOutlined />}>更多</Button>
          </Dropdown>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={refreshAllData}
            loading={loading}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        {dashboardStats && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日订单"
                  value={dashboardStats.today.orders}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日收入"
                  value={dashboardStats.today.revenue}
                  prefix="¥"
                  precision={2}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="今日退款"
                  value={dashboardStats.today.refunds}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="可疑支付"
                  value={dashboardStats.today.suspiciousPayments}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#d46b08' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Tabs 
          defaultActiveKey="overview" 
          style={{ marginBottom: '24px' }}
          items={tabItems}
        />
      </Spin>
    </div>
  );
};

export default EnhancedReconciliation;
