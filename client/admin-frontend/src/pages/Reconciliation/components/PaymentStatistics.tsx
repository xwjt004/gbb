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
  Alert,
  Tabs,
} from 'antd';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarCircleOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface PaymentStatistics {
  totalRevenue: number;          // 总收入
  receivedAmount: number;        // 实收金额
  depositAmount: number;         // 预收金额(定金)
  balanceAmount: number;         // 尾款金额
  pendingAmount: number;         // 待收金额
  collectionRate: number;        // 收款率
  avgCollectionTime: number;     // 平均收款时间(天)
  growthRate: number;            // 增长率
}

interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

interface CollectionTrendData {
  date: string;
  deposit: number;       // 定金
  balance: number;       // 尾款
  total: number;         // 总收款
  collectionRate: number; // 当日收款率
}

interface CollectionRecord {
  id: string;
  orderNo: string;
  customerName: string;
  packageName: string;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: 'PENDING' | 'PARTIAL_PAID' | 'PAID';
  lastPaymentDate: string;
  daysOverdue: number;    // 逾期天数
  platform: string;
}

const PaymentStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'method' | 'overdue'>('overview');
  
  const [statistics, setStatistics] = useState<PaymentStatistics>({
    totalRevenue: 0,
    receivedAmount: 0,
    depositAmount: 0,
    balanceAmount: 0,
    pendingAmount: 0,
    collectionRate: 0,
    avgCollectionTime: 0,
    growthRate: 0,
  });
  
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [trendData, setTrendData] = useState<CollectionTrendData[]>([]);
  const [collectionRecords, setCollectionRecords] = useState<CollectionRecord[]>([]);

  useEffect(() => {
    loadPaymentStatistics();
  }, [timeRange, dateRange]);

  const loadPaymentStatistics = async () => {
    setLoading(true);
    try {
      // 请求后端收款统计接口
      try {
        const res = await fetch('/api/v1/payments/statistics');
        if (res.ok) {
          const json = await res.json();
          setStatistics(json.statistics || {
            totalRevenue: 0,
            receivedAmount: 0,
            depositAmount: 0,
            balanceAmount: 0,
            pendingAmount: 0,
            collectionRate: 0,
            avgCollectionTime: 0,
            growthRate: 0,
          });
          setPaymentMethodData(json.methods || []);
          setTrendData(json.trend || []);
          setCollectionRecords(json.records || []);
        } else {
          setPaymentMethodData([]);
          setTrendData([]);
          setCollectionRecords([]);
        }
      } catch (err) {
        console.error('请求收款统计失败', err);
        setPaymentMethodData([]);
        setTrendData([]);
        setCollectionRecords([]);
      }
    } catch (error) {
      message.error('加载收款统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const getPaymentStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      PENDING: 'red',
      PARTIAL_PAID: 'orange',
      PAID: 'green',
    };
    return colorMap[status] || 'default';
  };

  const getPaymentStatusText = (status: string) => {
    const textMap: { [key: string]: string } = {
      PENDING: '待支付',
      PARTIAL_PAID: '部分支付',
      PAID: '已支付',
    };
    return textMap[status] || status;
  };

  const collectionColumns: ColumnsType<CollectionRecord> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
    },
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 100,
    },
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      key: 'packageName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount) => formatCurrency(amount),
      sorter: (a, b) => a.totalAmount - b.totalAmount,
    },
    {
      title: '已收/待收',
      key: 'payment',
      width: 150,
      render: (_, record) => (
        <div>
          <div style={{ color: '#52c41a', fontWeight: 'bold' }}>
            已收：{formatCurrency(record.paidAmount)}
          </div>
          <div style={{ color: record.pendingAmount > 0 ? '#ff4d4f' : '#999', fontSize: '12px' }}>
            待收：{formatCurrency(record.pendingAmount)}
          </div>
        </div>
      ),
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status) => (
        <Tag color={getPaymentStatusColor(status)}>
          {getPaymentStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '逾期情况',
      dataIndex: 'daysOverdue',
      key: 'daysOverdue',
      width: 100,
      render: (days) => {
        if (days === 0) return <Tag color="green">正常</Tag>;
        if (days <= 3) return <Tag color="orange">{days}天</Tag>;
        return <Tag color="red">{days}天</Tag>;
      },
      sorter: (a, b) => a.daysOverdue - b.daysOverdue,
    },
    {
      title: '最后支付',
      dataIndex: 'lastPaymentDate',
      key: 'lastPaymentDate',
      width: 120,
    },
    {
      title: '支付平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
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

              <Button type="primary" onClick={loadPaymentStatistics} loading={loading}>
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
              title="总收入"
              value={statistics.totalRevenue}
              prefix={<DollarCircleOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: statistics.growthRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
                {statistics.growthRate >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(statistics.growthRate)}%
              </span>
              <span style={{ marginLeft: 8, color: '#999' }}>较上期</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="实收金额"
              value={statistics.receivedAmount}
              prefix={<WalletOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={Math.round((statistics.receivedAmount / statistics.totalRevenue) * 100)}
                strokeColor="#52c41a"
                showInfo={false}
                size="small"
              />
              <span style={{ color: '#999', fontSize: '12px' }}>收款进度</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="收款率"
              value={statistics.collectionRate}
              precision={1}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: statistics.collectionRate >= 90 ? '#52c41a' : '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#999' }}>
                平均收款时间：{statistics.avgCollectionTime}天
              </span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待收金额"
              value={statistics.pendingAmount}
              prefix={<ClockCircleOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#999' }}>
                定金：{formatCurrency(statistics.depositAmount)} | 
                尾款：{formatCurrency(statistics.balanceAmount)}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 收款率预警 */}
      {statistics.collectionRate < 85 && (
        <Alert
          message="收款率预警"
          description={`当前收款率为 ${statistics.collectionRate}%，低于正常水平(90%)，建议加强催收工作。`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 选项卡内容 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={(key) => setActiveTab(key as 'overview' | 'trend' | 'method' | 'overdue')}
          items={[
            {
              key: 'overview',
              label: '收款概览',
              children: (
                <Row gutter={16}>
                  {/* 支付方式分布 */}
                  <Col span={8}>
                    <Card title="支付方式分布" loading={loading} size="small">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ method, percentage }: any) => `${method} ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                          >
                            {paymentMethodData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>

                  {/* 支付方式详情 */}
                  <Col span={16}>
                    <Card title="支付方式详情" loading={loading} size="small">
                      <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                        {paymentMethodData.map((item, index) => (
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
                                <span style={{ fontWeight: 'bold' }}>{item.method}</span>
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
                              金额：{formatCurrency(item.amount)} | 笔数：{item.count}笔
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: 'trend',
              label: '收款趋势',
              children: (
                <Card loading={loading}>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'collectionRate') return [`${value}%`, '收款率'];
                          return [formatCurrency(Number(value)), name === 'deposit' ? '定金' : name === 'balance' ? '尾款' : '总收款'];
                        }}
                      />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="deposit" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="定金" />
                      <Area yAxisId="left" type="monotone" dataKey="balance" stackId="1" stroke="#8884d8" fill="#8884d8" name="尾款" />
                      <Line yAxisId="right" type="monotone" dataKey="collectionRate" stroke="#ff7300" name="收款率" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              ),
            },
            {
              key: 'overdue',
              label: '逾期管理',
              children: (
                <Card title="逾期收款管理" loading={loading}>
                  <Table
                    columns={collectionColumns}
                    dataSource={collectionRecords.filter(record => record.daysOverdue > 0)}
                    rowKey="id"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    size="small"
                    scroll={{ x: 1000 }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default PaymentStatistics;
