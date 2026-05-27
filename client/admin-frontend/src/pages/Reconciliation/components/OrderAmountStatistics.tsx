import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Space,
  Statistic,
  Table,
  Tag,
  Progress,
  message,
} from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  DollarCircleOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface OrderStatistics {
  totalOrders: number;
  totalAmount: number;
  averageOrderValue: number;
  paidAmount: number;
  unpaidAmount: number;
  refundAmount: number;
  growthRate: number;
}

interface TrendData {
  date: string;
  orders: number;
  amount: number;
  paidAmount: number;
  refundAmount: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  count: number;
  color: string;
}

interface TopItem {
  id: string;
  name: string;
  amount: number;
  orders: number;
  avgAmount: number;
  growth: number;
}

const OrderAmountStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [dimension, setDimension] = useState<'time' | 'package' | 'user' | 'status'>('time');
  const [statistics, setStatistics] = useState<OrderStatistics>({
    totalOrders: 0,
    totalAmount: 0,
    averageOrderValue: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    refundAmount: 0,
    growthRate: 0,
  });
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  useEffect(() => {
    loadStatisticsData();
  }, [timeRange, dateRange, dimension]);

  const loadStatisticsData = async () => {
    setLoading(true);
    try {
      try {
        const res = await fetch('/api/v1/orders/statistics');
        if (res.ok) {
          const json = await res.json();
          setStatistics(json.statistics || {
            totalOrders: 0,
            totalAmount: 0,
            averageOrderValue: 0,
            paidAmount: 0,
            unpaidAmount: 0,
            refundAmount: 0,
            growthRate: 0,
          });
          setTrendData(json.trend || []);
          setCategoryData(json.categories || []);
          setTopItems(json.topItems || []);
        } else {
          setTrendData([]);
          setCategoryData([]);
          setTopItems([]);
        }
      } catch (err) {
        console.error('请求订单统计失败', err);
        setTrendData([]);
        setCategoryData([]);
        setTopItems([]);
      }
    } catch (error) {
      message.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpOutlined style={{ color: '#52c41a' }} />
    ) : (
      <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
    );
  };

  const topItemColumns: ColumnsType<TopItem> = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <div style={{ 
          width: 24, 
          height: 24, 
          borderRadius: '50%', 
          background: index < 3 ? '#faad14' : '#d9d9d9',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {index + 1}
        </div>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '总金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => formatCurrency(amount),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: '订单数',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a, b) => a.orders - b.orders,
    },
    {
      title: '平均金额',
      dataIndex: 'avgAmount',
      key: 'avgAmount',
      render: (avgAmount) => formatCurrency(avgAmount),
    },
    {
      title: '增长率',
      dataIndex: 'growth',
      key: 'growth',
      render: (growth) => (
        <span style={{ color: growth >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {getGrowthIcon(growth)} {Math.abs(growth).toFixed(1)}%
        </span>
      ),
      sorter: (a, b) => a.growth - b.growth,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 筛选控件 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <span>时间范围：</span>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 120 }}
              >
                <Option value="today">今日</Option>
                <Option value="week">本周</Option>
                <Option value="month">本月</Option>
                <Option value="quarter">本季度</Option>
                <Option value="year">本年</Option>
                <Option value="custom">自定义</Option>
              </Select>

              {timeRange === 'custom' && (
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: 240 }}
                />
              )}

              <span>统计维度：</span>
              <Select
                value={dimension}
                onChange={setDimension}
                style={{ width: 120 }}
              >
                <Option value="time">时间维度</Option>
                <Option value="package">套餐维度</Option>
                <Option value="user">用户维度</Option>
                <Option value="status">状态维度</Option>
              </Select>

              <Button type="primary" onClick={loadStatisticsData} loading={loading}>
                刷新数据
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={statistics.totalOrders}
              prefix={<ShoppingCartOutlined />}
              suffix="笔"
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: statistics.growthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {getGrowthIcon(statistics.growthRate)} {Math.abs(statistics.growthRate)}%
              </span>
              <span style={{ marginLeft: 8, color: '#999' }}>较上期</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总金额"
              value={statistics.totalAmount}
              prefix={<DollarCircleOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={Math.round((statistics.paidAmount / statistics.totalAmount) * 100)}
                size="small"
                status="active"
              />
              <span style={{ color: '#999', fontSize: '12px' }}>已收款比例</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均订单价值"
              value={statistics.averageOrderValue}
              prefix={<UserOutlined />}
              precision={2}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#1890ff' }}>
                已收款：{formatCurrency(statistics.paidAmount)}
              </span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="退款金额"
              value={statistics.refundAmount}
              prefix={<GiftOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#999' }}>
                退款率：{((statistics.refundAmount / statistics.totalAmount) * 100).toFixed(1)}%
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 趋势图 */}
        <Col span={16}>
          <Card title="订单金额趋势" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" name="订单金额" />
                <Line type="monotone" dataKey="paidAmount" stroke="#82ca9d" name="已收金额" />
                <Line type="monotone" dataKey="refundAmount" stroke="#ff7300" name="退款金额" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 饼图 */}
        <Col span={8}>
          <Card title="套餐分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => {
                    const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${name} ${percentage}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 柱状图 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="每日订单统计" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="orders" fill="#8884d8" name="订单数量" />
                <Bar dataKey="amount" fill="#82ca9d" name="订单金额" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 排行榜 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="套餐销售排行" loading={loading}>
            <Table
              columns={topItemColumns}
              dataSource={topItems}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="分类占比详情" loading={loading}>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {categoryData.map((item, index) => (
                <div key={index} style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: item.color,
                          borderRadius: '50%',
                          marginRight: 8,
                        }}
                      />
                      <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                    </div>
                    <Tag color={item.color}>{item.percentage}%</Tag>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Progress 
                      percent={item.percentage} 
                      strokeColor={item.color}
                      showInfo={false}
                    />
                  </div>
                  <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                    金额：{formatCurrency(item.value)} | 订单：{item.count}笔
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderAmountStatistics;
