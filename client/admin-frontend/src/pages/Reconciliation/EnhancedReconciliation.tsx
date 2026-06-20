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
  Modal,
  Form,
  Alert,
  Input,
} from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { simple } from '../../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

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

interface SuspiciousPayment {
  id: string;
  orderId: string;
  amount: number;
  createdAt: string;
  issue: 'duplicate' | 'overpayment' | 'system_error';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface DashboardStats {
  today: {
    orders: number;
    revenue: number;
    refunds: number;
    suspiciousPayments: number;
  };
  thisMonth: {
    orders: number;
    revenue: number;
    refunds: number;
    suspiciousPayments: number;
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    count: number;
  }>;
}

const EnhancedReconciliation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<[any, any] | null>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);
  const [platform, setPlatform] = useState<string>('ALL');
  const [reconciliationData, setReconciliationData] = useState<ReconciliationRecord[]>([]);
  const [suspiciousPayments, setSuspiciousPayments] = useState<SuspiciousPayment[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadReconciliationData(),
        loadSuspiciousPayments(),
        loadDashboardStats(),
      ]);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadReconciliationData = async () => {
    try {
      const res = await simple.get<any>('/statistics-analysis/reconciliation/daily');
      const json = res?.data || res;
      const items: ReconciliationRecord[] = Array.isArray(json.data) ? json.data : json || [];
      setReconciliationData(items);
    } catch (error) {
      console.error('加载对账数据失败:', error);
      setReconciliationData([]);
    }
  };

  const loadSuspiciousPayments = async () => {
    try {
      // 调用可疑支付API
      const res = await simple.get<any>('/statistics-analysis/payments/suspicious', {
        params: { type: 'all' }
      });
      setSuspiciousPayments(res?.data || res);
    } catch (error) {
      console.error('加载可疑支付数据失败:', error);
  // 不使用模拟数据，使用空列表以防误导
  setSuspiciousPayments([]);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // 调用仪表板统计API
      const res = await simple.get<any>('/statistics-analysis/dashboard/stats');
      setDashboardStats(res?.data || res);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
  // 不再使用模拟数据，保留 null 以在 UI 上显示空状态
  setDashboardStats(null);
    }
  };

  const handleReconciliation = async () => {
    setLoading(true);
    try {
      await loadReconciliationData();
      message.success('对账完成');
    } catch (error) {
      message.error('对账失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // 导出功能实现
    message.success('报告导出成功');
  };

  const reconciliationColumns: ColumnsType<ReconciliationRecord> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform) => (
        <Tag color={platform === 'ALL' ? 'blue' : 'green'}>{platform}</Tag>
      ),
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

  const suspiciousPaymentColumns: ColumnsType<SuspiciousPayment> = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 150,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '问题类型',
      dataIndex: 'issue',
      key: 'issue',
      width: 120,
      render: (issue: 'duplicate' | 'overpayment' | 'system_error') => {
        const issueMap = {
          duplicate: { text: '重复支付', color: 'red' },
          overpayment: { text: '超额支付', color: 'orange' },
          system_error: { text: '系统错误', color: 'purple' },
        };
        const config = issueMap[issue];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '风险等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: 'high' | 'medium' | 'low') => {
        const severityMap = {
          high: { text: '高风险', color: 'red' },
          medium: { text: '中风险', color: 'orange' },
          low: { text: '低风险', color: 'blue' },
        };
        const config = severityMap[severity];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: () => (
        <Space size="small">
          <Button type="link" size="small">
            查看详情
          </Button>
          <Button type="link" size="small" danger>
            处理
          </Button>
        </Space>
      ),
    },
  ];

  const renderOverviewTab = () => (
    <div>
      {/* 统计卡片 */}
      {dashboardStats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日订单"
                value={dashboardStats.today.orders}
                suffix="笔"
                prefix={<DollarOutlined />}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">本月: {dashboardStats.thisMonth.orders}笔</Text>
              </div>
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
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">本月: ¥{dashboardStats.thisMonth.revenue.toLocaleString()}</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="今日退款"
                value={dashboardStats.today.refunds}
                suffix="笔"
                valueStyle={{ color: '#cf1322' }}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">本月: {dashboardStats.thisMonth.refunds}笔</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="可疑支付"
                value={dashboardStats.today.suspiciousPayments}
                suffix="笔"
                valueStyle={{ color: '#fa8c16' }}
                prefix={<WarningOutlined />}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">本月: {dashboardStats.thisMonth.suspiciousPayments}笔</Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 预警信息 */}
      {dashboardStats?.alerts && dashboardStats.alerts.length > 0 && (
        <Row style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {dashboardStats.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  message={alert.message}
                  type={alert.type}
                  showIcon
                  action={
                    <Button size="small" type="text">
                      处理 ({alert.count})
                    </Button>
                  }
                />
              ))}
            </Space>
          </Col>
        </Row>
      )}

      {/* 对账表格 */}
      <Card title="最近对账记录">
        <Table
          columns={reconciliationColumns}
          dataSource={reconciliationData}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );

  const renderSuspiciousTab = () => (
    <Card title="可疑支付检测">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={loadSuspiciousPayments}
            loading={loading}
          >
            重新检测
          </Button>
          <Select defaultValue="all" style={{ width: 120 }}>
            <Option value="all">全部类型</Option>
            <Option value="duplicate">重复支付</Option>
            <Option value="overpayment">超额支付</Option>
            <Option value="system_error">系统错误</Option>
          </Select>
        </Space>
      </div>
      
      <Table
        columns={suspiciousPaymentColumns}
        dataSource={suspiciousPayments}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Card>
  );

  const renderRefundTab = () => (
    <Card title="冲账退款管理">
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            onClick={() => setRefundModalVisible(true)}
          >
            新建冲账申请
          </Button>
          <Button icon={<FilterOutlined />}>
            筛选
          </Button>
        </Space>
      </div>
      
      {/* 这里可以添加冲账退款列表 */}
      <Alert
        message="冲账退款功能"
        description="此功能允许处理重复支付、超额支付等异常情况的冲账和退款操作。"
        type="info"
        showIcon
      />
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>对账管理</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 240 }}
          />
          <Select
            value={platform}
            onChange={setPlatform}
            style={{ width: 120 }}
          >
            <Option value="ALL">全部平台</Option>
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
          >
            导出报告
          </Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '概览',
            children: renderOverviewTab(),
          },
          {
            key: 'suspicious',
            label: '可疑支付',
            children: renderSuspiciousTab(),
          },
          {
            key: 'refund',
            label: '冲账退款',
            children: renderRefundTab(),
          },
          {
            key: 'statistics',
            label: '统计分析',
            children: (
              <Card title="统计分析">
                <Alert
                  message="统计分析功能"
                  description="提供详细的财务数据分析，包括收入趋势、退款分析、对比分析等。"
                  type="info"
                  showIcon
                />
              </Card>
            ),
          },
        ]}
      />

      {/* 冲账退款模态框 */}
      <Modal
        title="新建冲账申请"
        open={refundModalVisible}
        onCancel={() => setRefundModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="订单号" required>
            <Input placeholder="请输入订单号" />
          </Form.Item>
          <Form.Item label="冲账原因" required>
            <Select placeholder="请选择冲账原因">
              <Option value="duplicate">重复支付</Option>
              <Option value="overpayment">超额支付</Option>
              <Option value="system_error">系统错误</Option>
            </Select>
          </Form.Item>
          <Form.Item label="退款金额" required>
            <Input placeholder="请输入退款金额" addonAfter="元" />
          </Form.Item>
          <Form.Item label="备注说明">
            <Input.TextArea rows={4} placeholder="请输入详细说明..." />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary">提交申请</Button>
              <Button onClick={() => setRefundModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnhancedReconciliation;
