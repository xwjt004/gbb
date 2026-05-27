import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  message,
  Select,
  Descriptions,
  Row,
  Col,
  DatePicker,
  Statistic,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { refundService, RefundRequest } from '@/services/refundService';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const RefundApproval: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 审批/拒绝弹窗
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [currentRefund, setCurrentRefund] = useState<RefundRequest | null>(null);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [approvalForm] = Form.useForm();
  const [approvalLoading, setApprovalLoading] = useState(false);

  // 退款执行弹窗
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [processForm] = Form.useForm();
  const [processLoading, setProcessLoading] = useState(false);

  // 搜索表单
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});

  useEffect(() => {
    fetchRefunds();
  }, [currentPage, pageSize, searchParams]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const result = await refundService.getRefundRequests({
        page: currentPage,
        limit: pageSize,
        ...searchParams,
      });
      setRefunds(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('获取退款列表失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '获取退款列表失败';
      message.error(errorMsg);
      setRefunds([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 搜索
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    const params: any = {};

    if (values.orderNo) params.orderNo = values.orderNo;
    if (values.refundNo) params.refundNo = values.refundNo;
    if (values.status) params.status = values.status;
    if (values.refundType) params.refundType = values.refundType;
    if (values.dateRange && values.dateRange.length === 2) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD');
      params.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    setSearchParams(params);
    setCurrentPage(1);
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 显示审批弹窗
  const showApprovalModal = (refund: RefundRequest, type: 'approve' | 'reject') => {
    setCurrentRefund(refund);
    setApprovalType(type);
    setApprovalModalVisible(true);
    approvalForm.resetFields();
  };

  // 审批/拒绝提交
  const handleApprovalSubmit = async () => {
    if (!currentRefund) return;

    try {
      setApprovalLoading(true);
      const values = await approvalForm.validateFields();
      
      if (approvalType === 'approve') {
        await refundService.approveRefundRequest(currentRefund.id, {
          notes: values.notes,
        });
        message.success('审批通过');
      } else {
        await refundService.rejectRefundRequest(currentRefund.id, {
          rejectReason: values.reason,
        });
        message.success('已拒绝退款申请');
      }

      setApprovalModalVisible(false);
      fetchRefunds();
    } catch (error: any) {
      console.error('操作失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '操作失败，请重试';
      message.error(errorMsg);
    } finally {
      setApprovalLoading(false);
    }
  };

  // 显示退款执行弹窗
  const showProcessModal = (refund: RefundRequest) => {
    setCurrentRefund(refund);
    setProcessModalVisible(true);
    processForm.setFieldsValue({
      refundMethod: refund.refundMethod,
    });
  };

  // 执行退款
  const handleProcessRefund = async () => {
    if (!currentRefund) return;

    try {
      setProcessLoading(true);
      const values = await processForm.validateFields();
      
      await refundService.processRefundRequest(currentRefund.id, {
        transactionId: values.transactionId || undefined,
        notes: values.notes,
      });

      message.success('退款执行成功');
      setProcessModalVisible(false);
      fetchRefunds();
    } catch (error: any) {
      console.error('退款执行失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '退款执行失败，请重试';
      message.error(errorMsg);
    } finally {
      setProcessLoading(false);
    }
  };

  // 取消退款申请
  const handleCancelRefund = (refund: RefundRequest) => {
    confirm({
      title: '确认取消退款申请？',
      icon: <ExclamationCircleOutlined />,
      content: `退款编号：${refund.refundNo}`,
      onOk: async () => {
        try {
          await refundService.cancelRefundRequest(refund.id);
          message.success('已取消退款申请');
          fetchRefunds();
        } catch (error) {
          console.error('取消失败:', error);
          message.error('取消失败，请重试');
        }
      },
    });
  };

  const columns = [
    {
      title: '退款编号',
      dataIndex: 'refundNo',
      key: 'refundNo',
      width: 150,
    },
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
    },
    {
      title: '退款类型',
      dataIndex: 'refundType',
      key: 'refundType',
      width: 100,
      render: (type: string) => refundService.getTypeText(type as any),
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 120,
  render: (amount: number|string) => `¥${Number(amount).toFixed(2)}`,
    },
    {
      title: '退款方式',
      dataIndex: 'refundMethod',
      key: 'refundMethod',
      width: 120,
      render: (method: string) => refundService.getMethodText(method as any),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={refundService.getStatusColor(status as any)}>
          {refundService.getStatusText(status as any)}
        </Tag>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: RefundRequest) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => showApprovalModal(record, 'approve')}
              >
                审批通过
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => showApprovalModal(record, 'reject')}
              >
                拒绝
              </Button>
            </>
          )}
          {record.status === 'APPROVED' && (
            <Button
              type="primary"
              size="small"
              onClick={() => showProcessModal(record)}
            >
              执行退款
            </Button>
          )}
          {(record.status === 'PENDING' || record.status === 'APPROVED') && (
            <Button
              size="small"
              onClick={() => handleCancelRefund(record)}
            >
              取消
            </Button>
          )}
          <Button
            size="small"
            onClick={() => {
              Modal.info({
                title: '退款详情',
                width: 800,
                content: (
                  <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
                    <Descriptions.Item label="退款编号" span={2}>{record.refundNo}</Descriptions.Item>
                    <Descriptions.Item label="订单编号" span={2}>{record.orderNo}</Descriptions.Item>
                    <Descriptions.Item label="退款类型">{refundService.getTypeText(record.refundType as any)}</Descriptions.Item>
                    <Descriptions.Item label="退款金额">¥{Number(record.refundAmount).toFixed(2)}</Descriptions.Item>
                    <Descriptions.Item label="退款方式">{refundService.getMethodText(record.refundMethod as any)}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={refundService.getStatusColor(record.status as any)}>
                        {refundService.getStatusText(record.status as any)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="退款原因" span={2}>{record.refundReason}</Descriptions.Item>
                    {record.notes && (
                      <Descriptions.Item label="申请备注" span={2}>{record.notes}</Descriptions.Item>
                    )}
                    {record.rejectReason && (
                      <Descriptions.Item label="拒绝原因" span={2}>{record.rejectReason}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="申请时间">{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="更新时间">{new Date(record.updatedAt).toLocaleString()}</Descriptions.Item>
                    {record.approvedAt && (
                      <Descriptions.Item label="审批时间" span={2}>{new Date(record.approvedAt).toLocaleString()}</Descriptions.Item>
                    )}
                    {record.refundedAt && (
                      <Descriptions.Item label="退款时间" span={2}>{new Date(record.refundedAt).toLocaleString()}</Descriptions.Item>
                    )}
                  </Descriptions>
                ),
              });
            }}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="退款审批" style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="orderNo" style={{ width: '100%' }}>
                <Input placeholder="订单编号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="refundNo" style={{ width: '100%' }}>
                <Input placeholder="退款编号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" style={{ width: '100%' }}>
                <Select placeholder="退款状态" allowClear>
                  <Select.Option value="PENDING">待审批</Select.Option>
                  <Select.Option value="APPROVED">已审批</Select.Option>
                  <Select.Option value="REJECTED">已拒绝</Select.Option>
                  <Select.Option value="PROCESSING">处理中</Select.Option>
                  <Select.Option value="COMPLETED">已完成</Select.Option>
                  <Select.Option value="FAILED">失败</Select.Option>
                  <Select.Option value="CANCELLED">已取消</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="refundType" style={{ width: '100%' }}>
                <Select placeholder="退款类型" allowClear>
                  <Select.Option value="FULL">全额退款</Select.Option>
                  <Select.Option value="PARTIAL">部分退款</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dateRange" style={{ width: '100%' }}>
                <RangePicker placeholder={['开始日期', '结束日期']} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Tag color="warning">待审批: {refunds.filter(r => r.status === 'PENDING').length}</Tag>
            <Tag color="processing">已审批: {refunds.filter(r => r.status === 'APPROVED').length}</Tag>
            <Tag color="success">已完成: {refunds.filter(r => r.status === 'COMPLETED').length}</Tag>
          </div>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchRefunds}
            loading={loading}
          >
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={refunds}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* 审批/拒绝弹窗 */}
      <Modal
        title={approvalType === 'approve' ? '审批退款申请' : '拒绝退款申请'}
        open={approvalModalVisible}
        onOk={handleApprovalSubmit}
        onCancel={() => {
          if (!approvalLoading) {
            setApprovalModalVisible(false);
          }
        }}
        confirmLoading={approvalLoading}
        width={700}
        maskClosable={!approvalLoading}
      >
        {currentRefund && (
          <>
            {/* 金额统计卡片 */}
            <Card 
              size="small" 
              style={{ 
                marginBottom: 16, 
                backgroundColor: '#f6f8fa',
                border: '1px solid #e1e4e8' 
              }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="订单总额"
                    value={currentRefund.order?.totalAmount || 0}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="已付金额"
                    value={currentRefund.order?.paidAmount || 0}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '18px', color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="已退金额"
                    value={currentRefund.order?.refundAmount || 0}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: '18px', color: '#ff4d4f' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="剩余可退"
                    value={
                      Math.max(
                        0,
                        (currentRefund.order?.paidAmount || 0) - 
                        (currentRefund.order?.refundAmount || 0)
                      )
                    }
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ 
                      fontSize: '18px', 
                      color: '#faad14',
                      fontWeight: 'bold' 
                    }}
                  />
                </Col>
              </Row>
            </Card>

            {/* 退款金额合法性检查 */}
            {(() => {
              const paidAmount = currentRefund.order?.paidAmount || 0;
              const refundedAmount = currentRefund.order?.refundAmount || 0;
              const remainingRefundable = Math.max(0, paidAmount - refundedAmount);
              const requestAmount = Number(currentRefund.refundAmount);

              if (requestAmount > remainingRefundable) {
                return (
                  <Alert
                    message="退款金额超出可退金额"
                    description={`申请退款 ¥${requestAmount.toFixed(2)} 超过剩余可退金额 ¥${remainingRefundable.toFixed(2)}`}
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 16 }}
                  />
                );
              } else if (requestAmount === remainingRefundable && remainingRefundable > 0) {
                return (
                  <Alert
                    message="全额退款"
                    description={`将退还全部剩余金额 ¥${remainingRefundable.toFixed(2)}`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              } else if (requestAmount < remainingRefundable && requestAmount > 0) {
                return (
                  <Alert
                    message="部分退款"
                    description={`退款后剩余 ¥${(remainingRefundable - requestAmount).toFixed(2)} 可继续退款`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                );
              }
              return null;
            })()}

            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="退款编号" span={2}>{currentRefund.refundNo}</Descriptions.Item>
              <Descriptions.Item label="订单编号" span={2}>{currentRefund.orderNo}</Descriptions.Item>
              <Descriptions.Item label="申请退款金额" span={2}>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold', 
                  color: '#ff4d4f' 
                }}>
                  ¥{Number(currentRefund.refundAmount).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="退款原因" span={2}>{currentRefund.refundReason}</Descriptions.Item>
            </Descriptions>

            <Form form={approvalForm} layout="vertical">
              {approvalType === 'reject' && (
                <Form.Item
                  name="reason"
                  label="拒绝原因"
                  rules={[
                    { required: true, message: '请输入拒绝原因' },
                    { min: 5, message: '拒绝原因至少5个字符' },
                    { max: 500, message: '拒绝原因最多500个字符' },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入拒绝原因（5-500字符）"
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
              )}
              <Form.Item name="notes" label="备注">
                <TextArea
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* 执行退款弹窗 */}
      <Modal
        title="执行退款"
        open={processModalVisible}
        onOk={handleProcessRefund}
        onCancel={() => {
          if (!processLoading) {
            setProcessModalVisible(false);
          }
        }}
        confirmLoading={processLoading}
        width={600}
        maskClosable={!processLoading}
      >
        {currentRefund && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="退款编号" span={2}>{currentRefund.refundNo}</Descriptions.Item>
              <Descriptions.Item label="订单编号" span={2}>{currentRefund.orderNo}</Descriptions.Item>
              <Descriptions.Item label="退款金额">¥{Number(currentRefund.refundAmount).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="退款方式">{refundService.getMethodText(currentRefund.refundMethod as any)}</Descriptions.Item>
            </Descriptions>

            <Form form={processForm} layout="vertical">
              <Form.Item
                name="refundMethod"
                label="退款方式"
                rules={[{ required: true, message: '请选择退款方式' }]}
              >
                <Select>
                  <Select.Option value="ORIGINAL">原路退回</Select.Option>
                  <Select.Option value="CASH">现金退款</Select.Option>
                  <Select.Option value="BANK_TRANSFER">银行转账</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="transactionId"
                label="交易流水号"
                rules={[
                  { required: true, message: '请输入交易流水号' },
                ]}
              >
                <Input placeholder="请输入退款交易流水号" />
              </Form.Item>
              <Form.Item name="notes" label="备注">
                <TextArea
                  rows={3}
                  placeholder="请输入备注信息（可选）"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RefundApproval;
