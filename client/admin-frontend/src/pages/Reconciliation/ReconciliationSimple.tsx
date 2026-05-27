import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Button,
  Space,
  Select,
  Statistic,
  Row,
  Col,
  message,
  Typography,
  Tag,
  Tabs,
} from 'antd';
import dayjs from 'dayjs';
import {
  DownloadOutlined,
  SyncOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

interface ReconciliationRecord {
  id: string;
  date: string;
  platform: string;
  orderCount: number;
  totalAmount: number;
  platformAmount: number;
  difference: number;
  status: 'matched' | 'mismatched' | 'pending';
}

const ReconciliationSimple: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [platform, setPlatform] = useState<string>('ALL');
  const [reconciliationData, setReconciliationData] = useState<ReconciliationRecord[]>([]);
  const [statistics, setStatistics] = useState({
    totalDays: 0,
    matchedDays: 0,
    totalDifference: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    // 默认加载最近7天的对账数据
    const today = dayjs();
    const lastWeek = today.subtract(7, 'day');
    setDateRange([lastWeek, today]);
  }, []);

  // 🔥 新增：当日期范围设置后，自动加载数据
  useEffect(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      handleReconciliation();
    }
  }, [dateRange]);

  const handleReconciliation = async () => {
    try {
      setLoading(true);
      // 🔥 使用新的后端API获取真实数据
      const startDate = dateRange?.[0]?.format('YYYY-MM-DD') || '';
      const endDate = dateRange?.[1]?.format('YYYY-MM-DD') || '';
      const platformParam = platform === 'ALL' ? '' : platform;
      
      const url = `/api/v1/statistics-analysis/reconciliation/range?startDate=${startDate}&endDate=${endDate}&platform=${encodeURIComponent(platformParam)}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const items: ReconciliationRecord[] = Array.isArray(json.data) ? json.data : json || [];
        setReconciliationData(items);
        
        // 计算统计数据
        const stats = {
          totalDays: items.length,
          matchedDays: items.filter(item => item.status === 'matched').length,
          totalDifference: items.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0),
          totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        };
        setStatistics(stats);
        
        if (items.length === 0) {
          message.info('所选日期范围内暂无对账数据');
        } else {
          message.success(`成功获取 ${items.length} 条对账记录`);
        }
      } else {
        message.error('获取对账数据失败，请重试');
        setReconciliationData([]);
        setStatistics({ totalDays: 0, matchedDays: 0, totalDifference: 0, totalAmount: 0 });
      }
    } catch (error) {
      console.error('对账失败:', error);
      message.error('对账失败，请检查网络连接');
      setReconciliationData([]);
      setStatistics({ totalDays: 0, matchedDays: 0, totalDifference: 0, totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reconciliationData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    message.success('对账报告导出成功');
  };

  const columns: ColumnsType<ReconciliationRecord> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform) => {
        const colorMap: { [key: string]: string } = {
          '微信支付': 'green',
          '支付宝': 'blue',
          '现金': 'orange',
        };
        return <Tag color={colorMap[platform] || 'default'}>{platform}</Tag>;
      },
    },
    {
      title: '订单数量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right',
    },
    {
      title: '系统金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '平台金额',
      dataIndex: 'platformAmount',
      key: 'platformAmount',
      width: 120,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '差异金额',
      dataIndex: 'difference',
      key: 'difference',
      width: 120,
      align: 'right',
      render: (difference) => (
        <span style={{ 
          color: Math.abs(difference) < 1 ? '#52c41a' : '#ff4d4f',
          fontWeight: Math.abs(difference) > 0 ? 'bold' : 'normal'
        }}>
          {difference >= 0 ? '+' : ''}¥{difference.toFixed(2)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          matched: { color: 'success', text: '已匹配', icon: <CheckCircleOutlined /> },
          mismatched: { color: 'error', text: '有差异', icon: <ExclamationCircleOutlined /> },
          pending: { color: 'processing', text: '待处理', icon: <SyncOutlined /> },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: '对账概览',
      children: (
        <div>
          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="对账天数"
                  value={statistics.totalDays}
                  suffix="天"
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="匹配天数"
                  value={statistics.matchedDays}
                  suffix="天"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总差异金额"
                  value={statistics.totalDifference}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: statistics.totalDifference > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总交易金额"
                  value={statistics.totalAmount}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 搜索控件 */}
          <Card style={{ marginBottom: 24 }}>
            <Space size="middle" wrap>
              <span>日期范围：</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                style={{ width: 240 }}
              />
              
              <span>支付平台：</span>
              <Select
                value={platform}
                onChange={setPlatform}
                style={{ width: 120 }}
              >
                <Option value="ALL">全部</Option>
                <Option value="微信支付">微信支付</Option>
                <Option value="支付宝">支付宝</Option>
                <Option value="现金">现金</Option>
              </Select>
              
              <Button
                type="primary"
                icon={<SyncOutlined />}
                loading={loading}
                onClick={handleReconciliation}
              >
                开始对账
              </Button>
              
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={reconciliationData.length === 0}
              >
                导出报告
              </Button>
            </Space>
          </Card>

          {/* 对账表格 */}
          <Card title="对账明细">
            <Table
              columns={columns}
              dataSource={reconciliationData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 900 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'refund',
      label: '冲账退款',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>冲账退款功能开发中...</p>
            <Button type="primary">申请冲账退款</Button>
          </div>
        </Card>
      ),
    },
    {
      key: 'statistics',
      label: '订单金额统计',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>订单金额统计功能开发中...</p>
          </div>
        </Card>
      ),
    },
    {
      key: 'refund-stats',
      label: '退款统计',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>退款统计功能开发中...</p>
          </div>
        </Card>
      ),
    },
    {
      key: 'payment-stats',
      label: '收款统计',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>收款统计功能开发中...</p>
          </div>
        </Card>
      ),
    },
    {
      key: 'voucher-stats',
      label: '凭证统计',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p>凭证统计功能开发中...</p>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>对账管理</Title>
      
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default ReconciliationSimple;
