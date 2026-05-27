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
  Modal,
  message,
  Alert,
} from 'antd';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Bar,
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
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface RefundStatistics {
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  avgRefundAmount: number;
  partialRefunds: number;
  fullRefunds: number;
  pendingRefunds: number;
  growthRate: number;
}

interface RefundTrendData {
  date: string;
  refundCount: number;
  refundAmount: number;
  refundRate: number;
}

interface RefundReasonData {
  reason: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}

interface RefundRecord {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  refundAmount: number;
  originalAmount: number;
  refundType: 'partial' | 'full';
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  refundDate: string;
  processingTime: number; // 处理时长(小时)
  platform: string;
}

const RefundStatistics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [analysisType, setAnalysisType] = useState<'trend' | 'reason' | 'status'>('trend');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  
  const [statistics, setStatistics] = useState<RefundStatistics>({
    totalRefunds: 0,
    totalRefundAmount: 0,
    refundRate: 0,
    avgRefundAmount: 0,
    partialRefunds: 0,
    fullRefunds: 0,
    pendingRefunds: 0,
    growthRate: 0,
  });
  
  const [trendData, setTrendData] = useState<RefundTrendData[]>([]);
  const [reasonData, setReasonData] = useState<RefundReasonData[]>([]);
  const [refundRecords, setRefundRecords] = useState<RefundRecord[]>([]);

  useEffect(() => {
    loadRefundStatistics();
  }, [timeRange, dateRange, analysisType]);

  const loadRefundStatistics = async () => {
    setLoading(true);
    try {
      // 尝试从后端加载退款统计
      try {
        const res = await fetch('/api/v1/refunds/statistics');
        if (res.ok) {
          const json = await res.json();
          setStatistics(json.statistics || {
            totalRefunds: 0,
            totalRefundAmount: 0,
            refundRate: 0,
            avgRefundAmount: 0,
            partialRefunds: 0,
            fullRefunds: 0,
            pendingRefunds: 0,
            growthRate: 0,
          });
          setTrendData(json.trend || []);
          setReasonData(json.reasons || []);
          setRefundRecords(json.records || []);
        } else {
          setStatistics(prev => prev);
          setTrendData([]);
          setReasonData([]);
          setRefundRecords([]);
        }
      } catch (err) {
        console.error('请求退款统计失败', err);
        setTrendData([]);
        setReasonData([]);
        setRefundRecords([]);
      }
    } catch (error) {
      message.error('加载退款统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      rejected: 'red',
    };
    return colorMap[status] || 'default';
  };

  const getStatusText = (status: string) => {
    const textMap: { [key: string]: string } = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      rejected: '已拒绝',
    };
    return textMap[status] || status;
  };

  const getRefundTypeText = (type: string) => {
    return type === 'partial' ? '部分退款' : '全额退款';
  };

  const refundColumns: ColumnsType<RefundRecord> = [
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
      title: '退款类型',
      dataIndex: 'refundType',
      key: 'refundType',
      width: 100,
      render: (type) => (
        <Tag color={type === 'partial' ? 'orange' : 'red'}>
          {getRefundTypeText(type)}
        </Tag>
      ),
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 120,
      render: (amount, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{formatCurrency(amount)}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            / {formatCurrency(record.originalAmount)}
          </div>
        </div>
      ),
      sorter: (a, b) => a.refundAmount - b.refundAmount,
    },
    {
      title: '退款原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '处理时长',
      dataIndex: 'processingTime',
      key: 'processingTime',
      width: 100,
      render: (time) => `${time}小时`,
      sorter: (a, b) => a.processingTime - b.processingTime,
    },
    {
      title: '支付平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
    },
    {
      title: '退款日期',
      dataIndex: 'refundDate',
      key: 'refundDate',
      width: 120,
      sorter: (a, b) => a.refundDate.localeCompare(b.refundDate),
    },
  ];

  const handleReasonClick = (reason: string) => {
    setSelectedReason(reason);
    setDetailModalVisible(true);
  };

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

              <span>分析维度：</span>
              <Select
                value={analysisType}
                onChange={setAnalysisType}
                style={{ width: 120 }}
              >
                <Option value="trend">趋势分析</Option>
                <Option value="reason">原因分析</Option>
                <Option value="status">状态分析</Option>
              </Select>

              <Button type="primary" onClick={loadRefundStatistics} loading={loading}>
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
              title="退款订单数"
              value={statistics.totalRefunds}
              prefix={<ExclamationCircleOutlined />}
              suffix="笔"
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: statistics.growthRate >= 0 ? '#ff4d4f' : '#52c41a' }}>
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
              title="退款总金额"
              value={statistics.totalRefundAmount}
              prefix={<CloseCircleOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#999' }}>
                平均：{formatCurrency(statistics.avgRefundAmount)}
              </span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="退款率"
              value={statistics.refundRate}
              precision={1}
              suffix="%"
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: statistics.refundRate > 10 ? '#ff4d4f' : '#faad14' }}
            />
            <div style={{ marginTop: 8 }}>
              <Progress
                percent={statistics.refundRate}
                strokeColor={statistics.refundRate > 10 ? '#ff4d4f' : '#faad14'}
                showInfo={false}
                size="small"
              />
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理退款"
              value={statistics.pendingRefunds}
              prefix={<CheckCircleOutlined />}
              suffix="笔"
              valueStyle={{ color: statistics.pendingRefunds > 5 ? '#ff4d4f' : '#1890ff' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#999' }}>
                部分：{statistics.partialRefunds} | 全额：{statistics.fullRefunds}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 预警提示 */}
      {statistics.refundRate > 15 && (
        <Alert
          message="退款率异常预警"
          description={`当前退款率为 ${statistics.refundRate}%，超过正常水平(10%)，建议关注服务质量和客户满意度。`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 图表区域 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 趋势图 */}
        <Col span={16}>
          <Card title="退款趋势分析" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <RechartsTooltip 
                  formatter={(value, name) => {
                    if (name === 'refundAmount') return [formatCurrency(Number(value)), '退款金额'];
                    if (name === 'refundRate') return [`${value}%`, '退款率'];
                    return [value, '退款数量'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="refundCount" fill="#ff7300" name="退款数量" />
                <Line yAxisId="right" type="monotone" dataKey="refundRate" stroke="#ff4d4f" name="退款率" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 原因分布饼图 */}
        <Col span={8}>
          <Card title="退款原因分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reasonData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ reason, percentage }: any) => `${reason} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reasonData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleReasonClick(entry.reason)}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, _name, props: any) => [
                    `${value}笔 (${formatCurrency(props.payload.amount)})`,
                    '退款数量'
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 详细原因统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="退款原因详情" loading={loading}>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {reasonData.map((item, index) => (
                <div 
                  key={index} 
                  style={{ 
                    marginBottom: 16, 
                    padding: 12, 
                    background: '#fafafa', 
                    borderRadius: 4,
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                  onClick={() => handleReasonClick(item.reason)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                  }}
                >
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
                      <span style={{ fontWeight: 'bold' }}>{item.reason}</span>
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
                    数量：{item.count}笔 | 金额：{formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="退款记录" loading={loading}>
            <Table
              columns={refundColumns}
              dataSource={refundRecords}
              rowKey="id"
              pagination={{ pageSize: 5, showSizeChanger: false }}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 详情弹窗 */}
      <Modal
        title={`退款原因详情 - ${selectedReason}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          columns={refundColumns}
          dataSource={refundRecords.filter(record => record.reason === selectedReason)}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default RefundStatistics;
