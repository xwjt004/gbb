import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tabs,
  Tag,
  Alert,
  Space,
  Button,
  Modal,
  Descriptions,
  Statistic,
  Row,
  Col,
  message,
  Select,
  Input,
} from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { paymentService } from '@/services/payments';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface SuspiciousPayment {
  id: string;
  paymentId: string;
  orderNo: string;
  customer: {
    name: string;
    phone: string;
  };
  amount: number;
  type: 'duplicate' | 'overpayment' | 'system_error';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  detectedAt: string;
  metadata?: any;
}

interface SuspiciousStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  duplicate: number;
  overpayment: number;
  systemError: number;
}

const SuspiciousPayments: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [payments, setPayments] = useState<SuspiciousPayment[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [stats, setStats] = useState<SuspiciousStats>({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    duplicate: 0,
    overpayment: 0,
    systemError: 0,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<SuspiciousPayment | null>(null);
  const [resolveVisible, setResolveVisible] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  // 加载可疑支付数据
  const fetchSuspiciousPayments = async (
    type: string = 'all',
    severity: string = 'all',
    page: number = 1,
    pageSize: number = 20
  ) => {
    setLoading(true);
    try {
      const response = await paymentService.getSuspiciousPayments({
        type: type as any,
        severity: severity as any,
        page,
        limit: pageSize,
      });
      
      const data = response.data?.list || [];
      const paginationData = response.data?.pagination || {};
      
      setPayments(data);
      setPagination({
        current: paginationData.page || page,
        pageSize: paginationData.limit || pageSize,
        total: paginationData.total || 0,
      });
      
      // 计算统计数据（仅基于当前页）
      const newStats: SuspiciousStats = {
        total: paginationData.total || 0,
        high: data.filter((p: SuspiciousPayment) => p.severity === 'high').length,
        medium: data.filter((p: SuspiciousPayment) => p.severity === 'medium').length,
        low: data.filter((p: SuspiciousPayment) => p.severity === 'low').length,
        duplicate: data.filter((p: SuspiciousPayment) => p.type === 'duplicate').length,
        overpayment: data.filter((p: SuspiciousPayment) => p.type === 'overpayment').length,
        systemError: data.filter((p: SuspiciousPayment) => p.type === 'system_error').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('获取可疑支付数据失败:', error);
      message.error('获取可疑支付数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuspiciousPayments(activeTab, severityFilter, pagination.current, pagination.pageSize);
  }, [activeTab, severityFilter]);

  // 标记已处理
  const handleResolve = async () => {
    if (!selectedPayment) return;
    
    try {
      await paymentService.resolveSuspiciousPayment(selectedPayment.paymentId, resolveNotes);
      message.success('已标记为已处理');
      setResolveVisible(false);
      setResolveNotes('');
      fetchSuspiciousPayments(activeTab, severityFilter, pagination.current, pagination.pageSize);
    } catch (error) {
      console.error('标记失败:', error);
      message.error('标记失败，请重试');
    }
  };

  // 严重程度配置
  const severityConfig = {
    high: {
      color: 'red',
      icon: <WarningOutlined />,
      text: '高风险',
    },
    medium: {
      color: 'orange',
      icon: <ExclamationCircleOutlined />,
      text: '中风险',
    },
    low: {
      color: 'blue',
      icon: <InfoCircleOutlined />,
      text: '低风险',
    },
  };

  // 类型配置
  const typeConfig = {
    duplicate: {
      color: 'red',
      text: '重复支付',
    },
    overpayment: {
      color: 'orange',
      text: '超额支付',
    },
    system_error: {
      color: 'purple',
      text: '系统错误',
    },
  };

  // 表格列定义
  const columns: ColumnsType<SuspiciousPayment> = [
    {
      title: '支付单号',
      dataIndex: 'paymentId',
      key: 'paymentId',
      width: 180,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>,
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.customer.name}</div>
          <div style={{ color: '#999', fontSize: '12px' }}>{record.customer.phone}</div>
        </div>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => <span style={{ fontWeight: 'bold' }}>¥{amount.toFixed(2)}</span>,
    },
    {
      title: '检测类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: keyof typeof typeConfig) => (
        <Tag color={typeConfig[type].color}>{typeConfig[type].text}</Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity: keyof typeof severityConfig) => {
        const config = severityConfig[severity];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '检测原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '检测时间',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedPayment(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setSelectedPayment(record);
              setResolveVisible(true);
            }}
          >
            标记已处理
          </Button>
        </Space>
      ),
    },
  ];

  // 标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPagination({ ...pagination, current: 1 }); // 重置页码
  };

  // 分页变化
  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    fetchSuspiciousPayments(
      activeTab,
      severityFilter,
      newPagination.current,
      newPagination.pageSize
    );
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Alert
          message="可疑支付检测"
          description="系统自动检测潜在的异常支付行为，包括重复支付、超额支付和系统错误等情况"
          type="warning"
          showIcon
          icon={<WarningOutlined />}
        />
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="检测总数"
              value={stats.total}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="高风险"
              value={stats.high}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="中风险"
              value={stats.medium}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低风险"
              value={stats.low}
              prefix={<InfoCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchSuspiciousPayments(activeTab, severityFilter, pagination.current, pagination.pageSize)}
          >
            刷新
          </Button>
          <span>严重级别:</span>
          <Select
            style={{ width: 120 }}
            value={severityFilter}
            onChange={(value) => {
              setSeverityFilter(value);
              setPagination({ ...pagination, current: 1 }); // 重置页码
            }}
            options={[
              { label: '全部', value: 'all' },
              { label: '高风险', value: 'high' },
              { label: '中风险', value: 'medium' },
              { label: '低风险', value: 'low' },
            ]}
          />
        </Space>

        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          items={[
            {
              key: 'all',
              label: `全部 (${stats.total})`,
            },
            {
              key: 'duplicate',
              label: (
                <span>
                  <Tag color="red">重复支付 ({stats.duplicate})</Tag>
                </span>
              ),
            },
            {
              key: 'overpayment',
              label: (
                <span>
                  <Tag color="orange">超额支付 ({stats.overpayment})</Tag>
                </span>
              ),
            },
            {
              key: 'system_error',
              label: (
                <span>
                  <Tag color="purple">系统错误 ({stats.systemError})</Tag>
                </span>
              ),
            },
          ]}
        />

        <Table
          columns={columns}
          dataSource={payments}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              handleTableChange({ current: page, pageSize, total: pagination.total });
            },
          }}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="可疑支付详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedPayment && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="支付单号" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{selectedPayment.paymentId}</span>
              </Descriptions.Item>
              <Descriptions.Item label="订单号" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{selectedPayment.orderNo}</span>
              </Descriptions.Item>
              <Descriptions.Item label="客户姓名">
                {selectedPayment.customer.name}
              </Descriptions.Item>
              <Descriptions.Item label="客户电话">
                {selectedPayment.customer.phone}
              </Descriptions.Item>
              <Descriptions.Item label="支付金额">
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                  ¥{selectedPayment.amount.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="检测类型">
                <Tag color={typeConfig[selectedPayment.type].color}>
                  {typeConfig[selectedPayment.type].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag 
                  color={severityConfig[selectedPayment.severity].color}
                  icon={severityConfig[selectedPayment.severity].icon}
                >
                  {severityConfig[selectedPayment.severity].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="检测时间">
                {dayjs(selectedPayment.detectedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="检测原因" span={2}>
                <Alert message={selectedPayment.reason} type="warning" showIcon />
              </Descriptions.Item>
            </Descriptions>

            {selectedPayment.metadata && (
              <div style={{ marginTop: 16 }}>
                <h4>附加信息</h4>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 4,
                  overflow: 'auto',
                  maxHeight: 300,
                }}>
                  {JSON.stringify(selectedPayment.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 标记已处理模态框 */}
      <Modal
        title="标记为已处理"
        open={resolveVisible}
        onOk={handleResolve}
        onCancel={() => {
          setResolveVisible(false);
          setResolveNotes('');
        }}
        okText="确认"
        cancelText="取消"
      >
        <Alert
          message="提示"
          description="标记后该记录将不再显示在可疑支付列表中"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div>
          <div style={{ marginBottom: 8 }}>处理备注（选填）：</div>
          <TextArea
            rows={4}
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder="请输入处理备注，例如：已核实为正常支付、已联系客户确认等"
          />
        </div>
      </Modal>
    </div>
  );
};

export default SuspiciousPayments;
