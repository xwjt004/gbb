import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Tabs,
  Descriptions,
  Timeline,
  Spin,
  Empty,
} from 'antd';
import {
  ExportOutlined,
  SyncOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UndoOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Payment, PaymentSearchParams, PaymentStatus, PaymentMethod } from '@/types/payment';
import { paymentService } from '@/services/payments';
import { orderService } from '@/services/orders';
import RefundModal from './RefundModal';
import PaymentDetail from './PaymentDetail';
import PaymentForm from './PaymentForm';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PaymentList: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<PaymentSearchParams>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [refundVisible, setRefundVisible] = useState(false);
  const [createPaymentVisible, setCreatePaymentVisible] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Payment | undefined>();
  // 判断是否为虚拟支付记录（无真实 Payment 表记录，仅由后端从 Order 合成）
  const isVirtualId = (id: string) => id.startsWith('UNPAID_') || id.startsWith('PENDING_');
  const [stats, setStats] = useState({
    totalPayments: 0,
    successPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    totalAmount: 0,
    todayAmount: 0,
    refundAmount: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [pagination.current, pagination.pageSize, searchParams]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await paymentService.getPayments({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParams,
      });
      setPayments(response.data.list);
      setPagination({
        ...pagination,
        total: response.data.pagination.total,
      });
    } catch (error) {
      message.error('加载支付列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await paymentService.getPaymentStats();
      setStats(response.data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 状态配置
  const statusConfig: Record<PaymentStatus, { color: string; text: string; icon: React.ReactNode }> = {
    [PaymentStatus.PENDING_PAYMENT]: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
    [PaymentStatus.PARTIAL_PAID]: { color: 'blue', text: '部分支付', icon: <SyncOutlined spin /> },
    [PaymentStatus.PENDING]: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
    [PaymentStatus.PROCESSING]: { color: 'blue', text: '处理中', icon: <SyncOutlined spin /> },
    [PaymentStatus.PAID]: { color: 'green', text: '支付成功', icon: <CheckCircleOutlined /> },
    [PaymentStatus.FAILED]: { color: 'red', text: '支付失败', icon: <CloseCircleOutlined /> },
    [PaymentStatus.CANCELLED]: { color: 'default', text: '已取消', icon: <CloseCircleOutlined /> },
    [PaymentStatus.REFUNDING]: { color: 'orange', text: '退款中', icon: <SyncOutlined spin /> },
    [PaymentStatus.REFUNDED]: { color: 'purple', text: '已退款', icon: <UndoOutlined /> },
  };

  const methodConfig: Record<string, { color: string; text: string }> = {
    [PaymentMethod.WECHAT]: { color: 'green', text: '微信支付' },
    [PaymentMethod.ALIPAY]: { color: 'blue', text: '支付宝' },
    [PaymentMethod.CASH]: { color: 'orange', text: '现金' },
    [PaymentMethod.BANK_TRANSFER]: { color: 'purple', text: '银行卡' },
  };

  // 表格列定义
  const columns: ColumnsType<Payment> = [
    {
      title: '支付信息',
      key: 'paymentInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {record.paymentNo}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {new Date(record.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      title: '关联订单',
      dataIndex: ['order', 'orderNo'],
      width: 150,
      render: (orderNo, record) => (
        <div>
          <div style={{ fontFamily: 'monospace' }}>{orderNo}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {record.user?.phone}
          </div>
        </div>
      ),
    },
    {
      title: '金额信息',
      key: 'amount',
      width: 150,
      render: (_, record) => {
        const isUnpaidOrder = isVirtualId(record.id);
        const totalAmount = Number(record.order?.totalAmount || 0);
        const orderPaidAmount = Number(record.order?.paidAmount || 0);
        const recordAmount = Number(record.amount || 0);
        const isRefund = recordAmount < 0;
        const unpaidAmount = Math.max(0, totalAmount - orderPaidAmount);

        return (
          <div>
            <div style={{ fontWeight: 'bold', color: isRefund ? '#ff4d4f' : '#f50' }}>
              {isRefund ? '已退: ' : isUnpaidOrder ? '定金: ' : '已付: '}
              ¥{Math.abs(recordAmount).toFixed(2)}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>
              总额: ¥{totalAmount.toFixed(2)}
            </div>
            {!isRefund && unpaidAmount > 0 && (
              <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                未收: ¥{unpaidAmount.toFixed(2)}
              </div>
            )}
            {!isRefund && unpaidAmount <= 0 && (
              <div style={{ color: '#52c41a', fontSize: '12px' }}>
                已付清
              </div>
            )}
            {Number(record.refundAmount || 0) > 0 && (
              <div style={{ color: '#999', fontSize: '12px' }}>
                已退款: ¥{Number(record.refundAmount || 0).toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '支付方式',
      dataIndex: 'method',
      width: 110,
      render: (method: PaymentMethod) => {
        if (!method) return <Tag color="default">未支付</Tag>;
        const config = methodConfig[method];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: '支付状态',
      dataIndex: 'status',
      width: 120,
      render: (status: PaymentStatus) => {
        const config = statusConfig[status];
        return (
          <Tag color={config?.color} icon={config?.icon}>
            {config?.text}
          </Tag>
        );
      },
    },
    {
      title: '第三方交易号',
      dataIndex: 'thirdPartyId',
      width: 150,
      render: (id) => id ? (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</span>
      ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const isUnpaidOrder = isVirtualId(record.id);
        
        return (
          <Space size="small">
            <Button
              type="link"
              onClick={() => handleViewDetail(record)}
            >
              详情
            </Button>
            
            {isUnpaidOrder ? (
              // 未支付订单的操作
              <Popconfirm
                title="确认收到现金支付？"
                description="这将为该订单创建现金支付记录"
                onConfirm={() => handleConfirmPayment(record.id)}
              >
                <Button type="link" style={{ color: '#52c41a' }}>
                  收款
                </Button>
              </Popconfirm>
            ) : (
              // 已有支付记录的操作
              <>
                {record.status === PaymentStatus.PENDING && (
                  <Popconfirm
                    title="确认支付成功？"
                    onConfirm={() => handleConfirmPayment(record.id)}
                  >
                    <Button type="link">
                      确认
                    </Button>
                  </Popconfirm>
                )}
                {record.status === PaymentStatus.PAID && (
                  <Button
                    type="link"
                    onClick={() => handleRefund(record)}
                  >
                    退款
                  </Button>
                )}
                <Button
                  type="link"
                  onClick={() => handleSyncStatus(record.id)}
                >
                  同步状态
                </Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // 搜索处理
  const handleSearch = (values: PaymentSearchParams) => {
    setSearchParams(values);
    setPagination({ ...pagination, current: 1 });
  };

  // 综合搜索处理
  const handleKeywordSearch = (keyword: string) => {
    if (!keyword) {
      setSearchParams({});
      setPagination({ ...pagination, current: 1 });
      return;
    }

    // 清除其他搜索条件，只保留关键词搜索
    const searchPattern: PaymentSearchParams = {};
    
    // 智能判断搜索类型并设置对应参数
    if (keyword.startsWith('PAY') || keyword.startsWith('pay')) {
      // 支付单号搜索
      searchPattern.paymentNo = keyword;
    } else if (/^1[3-9]\d{9}$/.test(keyword)) {
      // 手机号搜索
      searchPattern.phone = keyword;
    } else if (keyword.startsWith('ORD')) {
      // 订单号搜索（优先于第三方交易号，避免 ORD 开头订单号被误判）
      searchPattern.orderId = keyword;
    } else if (keyword.startsWith('wx') || keyword.startsWith('ali') || keyword.startsWith('4') || /^[a-zA-Z0-9_-]{10,}$/.test(keyword)) {
      // 第三方交易号搜索（微信、支付宝等）
      searchPattern.thirdPartyId = keyword;
    } else {
      // 订单号搜索（包含其他格式）
      searchPattern.orderId = keyword;
    }

    setSearchParams(searchPattern);
    setPagination({ ...pagination, current: 1 });
  };

  // 查看详情
  const [detailVisible, setDetailVisible] = useState(false);
  
  const handleViewDetail = (payment: Payment) => {
    // 对于未支付订单，不显示支付详情（因为还没有真正的支付记录）
    if (isVirtualId(payment.id)) {
      message.info('这是未支付订单，暂无支付记录详情');
      return;
    }
    
    setCurrentPayment(payment);
    setDetailVisible(true);
  };

  // 确认支付
  const handleConfirmPayment = async (id: string) => {
    try {
      // 检查是否是未支付的订单
      if (isVirtualId(id)) {
        const prefix = id.startsWith('UNPAID_') ? 'UNPAID_' : 'PENDING_';
        const orderNo = id.replace(prefix, '');
        // 找到对应的支付记录
        const payment = payments.find(p => p.id === id);
        
        if (!payment || !payment.order) {
          message.error('未找到对应的订单信息');
          return;
        }

        // ✅ 改用collectBalance API,确保状态立即同步
        await orderService.collectBalance({
          orderId: payment.order.id || orderNo,  // 使用订单ID
          amount: payment.amount,                 // 收取金额
          paymentType: 'CASH',                   // 现金支付
          notes: `${orderNo} - 现金支付确认`,
        });
        
        message.success('收款成功,订单状态已同步');
      } else {
        // 确认已存在的支付记录,使用新的confirmPayment API
        await paymentService.confirmPayment(id);
        message.success('支付确认成功,订单状态已同步');
      }
      
      fetchPayments();
      fetchStats();
    } catch (error: any) {
      console.error('确认支付失败:', error);
      message.error(error.response?.data?.message || '支付确认失败');
    }
  };

  // 退款处理
  const handleRefund = (payment: Payment) => {
    setCurrentPayment(payment);
    setRefundVisible(true);
  };

  // 同步状态
  const handleSyncStatus = async (id: string) => {
    try {
      // 检查是否是未支付的订单
      if (isVirtualId(id)) {
        message.info('未支付订单无需同步状态，请先确认支付');
        return;
      }
      
      await paymentService.syncPaymentStatus(id);
      message.success('状态同步成功');
      fetchPayments();
    } catch (error) {
      message.error('状态同步失败');
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const exported = await paymentService.exportPayments(searchParams);
      if (exported) {
        message.success('导出成功');
      } else {
        message.warning('没有数据可导出');
      }
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 行展开渲染
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [expandedRowData, setExpandedRowData] = useState<{ [key: string]: any }>({});
  const [expandedRowLoading, setExpandedRowLoading] = useState<{ [key: string]: boolean }>({});

  // 加载展开行数据
  const loadExpandedRowData = async (record: Payment) => {
    const paymentId = record.id;
    
    // 如果是虚拟未支付订单,只展示订单信息
    if (isVirtualId(paymentId)) {
      setExpandedRowData({
        ...expandedRowData,
        [paymentId]: {
          payment: record,
          order: record.order,
          paymentHistory: [],
          isUnpaid: true,
        },
      });
      return;
    }

    // 如果已加载过,不重复加载
    if (expandedRowData[paymentId]) {
      return;
    }

    try {
      setExpandedRowLoading({ ...expandedRowLoading, [paymentId]: true });
      
      // 并行加载支付历史
      const orderId = record.orderId || record.order?.id;
      let paymentHistory: any[] = [];
      
      if (orderId) {
        try {
          paymentHistory = await paymentService.getPaymentHistory(orderId);
        } catch (error) {
          console.error('加载支付历史失败:', error);
        }
      }

      setExpandedRowData({
        ...expandedRowData,
        [paymentId]: {
          payment: record,
          order: record.order,
          paymentHistory,
          isUnpaid: false,
        },
      });
    } catch (error) {
      console.error('加载展开行数据失败:', error);
      message.error('加载详细信息失败');
    } finally {
      setExpandedRowLoading({ ...expandedRowLoading, [paymentId]: false });
    }
  };

  // 行展开时触发
  const handleExpand = (expanded: boolean, record: Payment) => {
    if (expanded) {
      setExpandedRowKeys([...expandedRowKeys, record.id]);
      loadExpandedRowData(record);
    } else {
      setExpandedRowKeys(expandedRowKeys.filter(key => key !== record.id));
    }
  };

  // 渲染展开行内容
  const renderExpandedRow = (record: Payment) => {
    const paymentId = record.id;
    const data = expandedRowData[paymentId];
    const isLoading = expandedRowLoading[paymentId];

    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="加载中...">
            <div style={{ minHeight: '50px' }} />
          </Spin>
        </div>
      );
    }

    if (!data) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Empty description="暂无数据" />
        </div>
      );
    }

    const { payment, order, paymentHistory, isUnpaid } = data;

    return (
      <div style={{ padding: '0 24px 16px' }}>
        <Tabs
          defaultActiveKey="payment"
          items={[
            {
              key: 'payment',
              label: (
                <span>
                  <InfoCircleOutlined /> 支付详情
                </span>
              ),
              children: (
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="支付单号">{payment.paymentNo || '-'}</Descriptions.Item>
                  <Descriptions.Item label="订单号">{payment.orderNo || payment.order?.orderNo || '-'}</Descriptions.Item>
                  <Descriptions.Item label="支付金额">
                    <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '14px' }}>
                      ¥{Number(payment.amount || 0).toFixed(2)}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="支付方式">
                    {payment.method ? (
                      <Tag color={methodConfig[payment.method as PaymentMethod]?.color}>
                        {methodConfig[payment.method as PaymentMethod]?.text}
                      </Tag>
                    ) : (
                      <Tag color="default">未支付</Tag>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="支付状态">
                    <Tag color={statusConfig[payment.status as PaymentStatus]?.color} icon={statusConfig[payment.status as PaymentStatus]?.icon}>
                      {statusConfig[payment.status as PaymentStatus]?.text}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="第三方交易号">
                    {payment.thirdPartyId ? (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{payment.thirdPartyId}</span>
                    ) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="退款金额">
                    {Number(payment.refundAmount || 0) > 0 ? (
                      <span style={{ color: '#ff4d4f' }}>¥{Number(payment.refundAmount || 0).toFixed(2)}</span>
                    ) : '¥0.00'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {payment.createdAt ? new Date(payment.createdAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="支付时间" span={2}>
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                  {payment.description && (
                    <Descriptions.Item label="支付描述" span={2}>
                      {payment.description}
                    </Descriptions.Item>
                  )}
                  {isUnpaid && (
                    <Descriptions.Item label="提示" span={2}>
                      <Tag color="orange">这是未支付订单,暂无实际支付记录</Tag>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ),
            },
            {
              key: 'order',
              label: (
                <span>
                  <ShoppingOutlined /> 订单简要
                </span>
              ),
              children: order ? (
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="订单号">{order.orderNo || '-'}</Descriptions.Item>
                  <Descriptions.Item label="客户姓名">{order.customerName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{order.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="订单状态">
                    <Tag color={order.status === 'COMPLETED' ? 'green' : order.status === 'CANCELLED' ? 'red' : 'blue'}>
                      {order.status || '-'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="套餐名称" span={2}>
                    {order.packageName || order.package?.name || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="订单总额">
                    <span style={{ fontWeight: 'bold' }}>¥{Number(order.totalAmount || 0).toFixed(2)}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="已付金额">
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>¥{Number(order.paidAmount || 0).toFixed(2)}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="未付金额">
                    {Number(order.totalAmount || 0) - Number(order.paidAmount || 0) > 0 ? (
                      <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                        ¥{(Number(order.totalAmount || 0) - Number(order.paidAmount || 0)).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#52c41a' }}>已付清</span>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="已退款金额">
                    {Number(order.refundAmount || 0) > 0 ? (
                      <span style={{ color: '#999' }}>¥{Number(order.refundAmount || 0).toFixed(2)}</span>
                    ) : '¥0.00'}
                  </Descriptions.Item>
                  {order.appointmentDate && (
                    <Descriptions.Item label="预约拍摄时间" span={2}>
                      {new Date(order.appointmentDate).toLocaleString('zh-CN')}
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="创建时间" span={2}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Empty description="订单信息不可用" />
              ),
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> 历史支付 ({paymentHistory?.length || 0})
                </span>
              ),
              children: paymentHistory && paymentHistory.length > 0 ? (
                <Timeline
                  mode="left"
                  items={paymentHistory.map((p: any) => ({
                    color: p.status === PaymentStatus.PAID ? 'green' : 
                           p.status === 'FAILED' ? 'red' : 
                           p.status === PaymentStatus.CANCELLED ? 'gray' : 'blue',
                    label: p.createdAt ? new Date(p.createdAt).toLocaleString('zh-CN') : '-',
                    children: (
                      <div key={p.id}>
                        <div style={{ marginBottom: '8px' }}>
                          <Tag color={statusConfig[p.status as PaymentStatus]?.color}>
                            {statusConfig[p.status as PaymentStatus]?.text}
                          </Tag>
                          {p.method ? (
                            <Tag color={methodConfig[p.method as PaymentMethod]?.color}>
                              {methodConfig[p.method as PaymentMethod]?.text}
                            </Tag>
                          ) : (
                            <Tag color="default">未支付</Tag>
                          )}
                          {p.id === payment.id && (
                            <Tag color="purple">当前记录</Tag>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <div>支付单号: {p.paymentNo || '-'}</div>
                          <div>
                            支付金额: <span style={{ color: '#1890ff', fontWeight: 'bold' }}>¥{Number(p.amount || 0).toFixed(2)}</span>
                          </div>
                          {Number(p.refundAmount || 0) > 0 && (
                            <div>
                              退款金额: <span style={{ color: '#ff4d4f' }}>¥{Number(p.refundAmount || 0).toFixed(2)}</span>
                            </div>
                          )}
                          {p.thirdPartyId && (
                            <div>交易号: {p.thirdPartyId}</div>
                          )}
                          {p.description && (
                            <div>描述: {p.description}</div>
                          )}
                        </div>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description={isUnpaid ? '未支付订单暂无支付历史' : '暂无支付历史记录'} />
              ),
            },
          ]}
        />
      </div>
    );
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="总支付笔数"
              value={stats.totalPayments}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="成功支付"
              value={stats.successPayments}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="待支付"
              value={stats.pendingPayments || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="交易总额"
              value={stats.totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="今日收入"
              value={stats.todayAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="成功率"
              value={(stats.totalPayments > 0 ? (stats.successPayments / stats.totalPayments * 100) : 0).toFixed(1)}
              suffix="%"
              valueStyle={{ 
                color: stats.totalPayments > 0 && (stats.successPayments / stats.totalPayments) > 0.8 ? '#52c41a' : '#faad14'
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 搜索表单 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Search
              placeholder="搜索支付单号/订单号/手机号/第三方交易号"
              onSearch={handleKeywordSearch}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="支付状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleSearch({ status: value })}
            >
              {Object.entries(statusConfig)
                .filter(([key]) => key !== PaymentStatus.PENDING)
                .map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.text}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="支付方式"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => handleSearch({ method: value })}
            >
              {Object.entries(methodConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.text}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              style={{ width: '100%' }}
              onChange={(dates) => {
                handleSearch({
                  startDate: dates?.[0]?.toISOString(),
                  endDate: dates?.[1]?.toISOString(),
                });
              }}
            />
          </Col>
        </Row>

        {/* 金额范围筛选 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Space.Compact style={{ width: '100%' }}>
              <InputNumber
                placeholder="最小金额"
                min={0}
                precision={2}
                style={{ width: '50%' }}
                onChange={(value) => handleSearch({ minAmount: value as number })}
              />
              <InputNumber
                placeholder="最大金额"
                min={0}
                precision={2}
                style={{ width: '50%' }}
                onChange={(value) => handleSearch({ maxAmount: value as number })}
              />
            </Space.Compact>
          </Col>
          <Col span={4}>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                setSearchParams({});
                setPagination({ ...pagination, current: 1 });
              }}
            >
              重置筛选
            </Button>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Row style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => setCreatePaymentVisible(true)}
            >
              创建支付
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              导出数据
            </Button>
            <Button
              onClick={() => window.open('/reconciliation', '_blank')}
            >
              对账管理
            </Button>
          </Space>
        </Row>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <Row style={{ marginBottom: 16 }}>
            <Space>
              <span style={{ color: '#666' }}>已选 {selectedRowKeys.length} 项</span>
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
              <Button icon={<ExportOutlined />} onClick={handleExport}>批量导出</Button>
              <Popconfirm
                title={`确定要同步 ${selectedRowKeys.length} 条支付记录的状态？`}
                onConfirm={async () => {
                  try {
                    for (const id of selectedRowKeys) {
                      if (!isVirtualId(String(id))) {
                        await paymentService.syncPaymentStatus(String(id));
                      }
                    }
                    message.success('批量同步完成');
                    setSelectedRowKeys([]);
                    fetchPayments();
                  } catch { message.error('同步失败'); }
                }}
              >
                <Button icon={<SyncOutlined />}>批量同步</Button>
              </Popconfirm>
            </Space>
          </Row>
        )}

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={payments}
          loading={loading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          expandable={{
            expandedRowRender: renderExpandedRow,
            expandedRowKeys: expandedRowKeys,
            onExpand: handleExpand,
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="text"
                size="small"
                icon={expanded ? <CloseCircleOutlined /> : <InfoCircleOutlined />}
                onClick={(e) => onExpand(record, e)}
                style={{ color: expanded ? '#1890ff' : '#999' }}
              />
            ),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 支付详情弹窗 */}
      <PaymentDetail
        visible={detailVisible}
        payment={currentPayment}
        onClose={() => {
          setDetailVisible(false);
          setCurrentPayment(undefined);
        }}
      />

      {/* 创建支付弹窗 */}
      <PaymentForm
        visible={createPaymentVisible}
        onCancel={() => setCreatePaymentVisible(false)}
        onSuccess={() => {
          setCreatePaymentVisible(false);
          fetchPayments();
          fetchStats();
        }}
      />

      {/* 退款弹窗 */}
      <RefundModal
        visible={refundVisible}
        payment={currentPayment}
        onCancel={() => {
          setRefundVisible(false);
          setCurrentPayment(undefined);
        }}
        onSuccess={() => {
          setRefundVisible(false);
          setCurrentPayment(undefined);
          fetchPayments();
        }}
      />
    </div>
  );
};

export default PaymentList;
