import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Table,
  Button,
  Space,
  Alert,
  Divider,
  Radio,
  Tag,
  message,
  Steps,
} from 'antd';
import dayjs from 'dayjs';
import {
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

interface RefundCorrectionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

type IssueType = 'duplicate' | 'overpayment' | 'system_error';
type SeverityType = 'high' | 'medium' | 'low';

interface SuspiciousPayment {
  id: string;
  orderId: string;
  amount: number;
  paymentTime: string;
  platform: string;
  transactionId: string;
  issue: IssueType;
  severity: SeverityType;
}

const RefundCorrectionModal: React.FC<RefundCorrectionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [correctionType, setCorrectionType] = useState<'auto' | 'manual'>('auto');
  const [suspiciousPayments, setSuspiciousPayments] = useState<SuspiciousPayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
  // 检测可疑支付记录（请求后端，失败时为空）
  detectSuspiciousPayments();
    }
  }, [visible]);

  const detectSuspiciousPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/statistics-analysis/payments/suspicious?type=all');
      if (res.ok) {
        const json = await res.json();
        setSuspiciousPayments(Array.isArray(json.data) ? json.data : json || []);
      } else {
        setSuspiciousPayments([]);
      }
    } catch (error) {
      message.error('检测可疑支付记录失败');
    } finally {
      setLoading(false);
    }
  };

  const issueTypeMap = {
    duplicate: { text: '重复支付', color: 'red', icon: <ExclamationCircleOutlined /> },
    overpayment: { text: '超额支付', color: 'orange', icon: <ExclamationCircleOutlined /> },
    system_error: { text: '系统错误', color: 'purple', icon: <CloseCircleOutlined /> },
  };

  const severityMap = {
    high: { text: '高风险', color: 'red' },
    medium: { text: '中风险', color: 'orange' },
    low: { text: '低风险', color: 'blue' },
  };

  const suspiciousPaymentColumns: ColumnsType<SuspiciousPayment> = [
    {
      title: '订单号',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 150,
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '支付时间',
      dataIndex: 'paymentTime',
      key: 'paymentTime',
      width: 150,
      render: (time) => new Date(time).toLocaleString(),
    },
    {
      title: '支付平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
    },
    {
      title: '问题类型',
      dataIndex: 'issue',
      key: 'issue',
      width: 120,
      render: (issue: IssueType) => {
        const config = issueTypeMap[issue];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '风险等级',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: SeverityType) => {
        const config = severityMap[severity];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '交易号',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 150,
      ellipsis: true,
    },
  ];

  const handleNext = () => {
    if (currentStep === 0 && correctionType === 'auto' && selectedPayments.length === 0) {
      message.warning('请选择需要处理的支付记录');
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const correctionData = {
        type: correctionType,
        selectedPayments,
        ...values,
      };
      onSubmit(correctionData);
      message.success('冲账退款申请已提交');
      handleCancel();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCurrentStep(0);
    setCorrectionType('auto');
    setSelectedPayments([]);
    setSuspiciousPayments([]);
    onCancel();
  };

  const stepContents = [
    // Step 1: 选择冲账类型
    <div key="step1">
      <Alert
        message="冲账退款类型选择"
        description="请选择自动检测异常支付记录进行批量处理，或手动输入需要冲账的支付信息"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Radio.Group
        value={correctionType}
        onChange={(e) => setCorrectionType(e.target.value)}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio value="auto">
            <div>
              <strong>自动检测处理</strong>
              <div style={{ color: '#666', fontSize: '12px' }}>
                系统自动检测重复支付、超额支付等异常情况
              </div>
            </div>
          </Radio>
          <Radio value="manual">
            <div>
              <strong>手动冲账处理</strong>
              <div style={{ color: '#666', fontSize: '12px' }}>
                手动输入需要冲账的支付信息和退款详情
              </div>
            </div>
          </Radio>
        </Space>
      </Radio.Group>

      {correctionType === 'auto' && (
        <div style={{ marginTop: 24 }}>
          <Divider>检测到的异常支付记录</Divider>
          <Table
            columns={suspiciousPaymentColumns}
            dataSource={suspiciousPayments}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 800 }}
            rowSelection={{
              selectedRowKeys: selectedPayments,
              onChange: (selectedRowKeys: React.Key[]) => {
                setSelectedPayments(selectedRowKeys as string[]);
              },
              getCheckboxProps: (record) => ({
                name: record.id,
              }),
            }}
            pagination={false}
          />
          {suspiciousPayments.length === 0 && !loading && (
            <Alert
              message="未检测到异常支付记录"
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )}
    </div>,

    // Step 2: 填写冲账详情
    <div key="step2">
      <Alert
        message="填写冲账退款详情"
        description="请仔细填写冲账原因和退款信息，确保数据准确无误"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical">
        {correctionType === 'manual' && (
          <>
            <Form.Item
              name="orderId"
              label="订单号"
              rules={[{ required: true, message: '请输入订单号' }]}
            >
              <Input placeholder="请输入需要冲账的订单号" />
            </Form.Item>

            <Form.Item
              name="paymentId"
              label="支付记录ID"
              rules={[{ required: true, message: '请输入支付记录ID' }]}
            >
              <Input placeholder="请输入支付记录ID" />
            </Form.Item>

            <Form.Item
              name="originalAmount"
              label="原始支付金额"
              rules={[{ required: true, message: '请输入原始支付金额' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                placeholder="请输入原始支付金额"
                addonAfter="元"
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="refundAmount"
          label="退款金额"
          rules={[{ required: true, message: '请输入退款金额' }]}
        >
          <InputNumber
            min={0}
            precision={2}
            style={{ width: '100%' }}
            placeholder="请输入退款金额"
            addonAfter="元"
          />
        </Form.Item>

        <Form.Item
          name="correctionReason"
          label="冲账原因"
          rules={[{ required: true, message: '请选择冲账原因' }]}
        >
          <Select placeholder="请选择冲账原因">
            <Option value="duplicate_payment">重复支付</Option>
            <Option value="overpayment">超额支付</Option>
            <Option value="system_error">系统错误</Option>
            <Option value="customer_complaint">客户投诉</Option>
            <Option value="service_cancellation">服务取消</Option>
            <Option value="other">其他原因</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="refundMethod"
          label="退款方式"
          rules={[{ required: true, message: '请选择退款方式' }]}
        >
          <Select placeholder="请选择退款方式">
            <Option value="original_method">原路退回</Option>
            <Option value="cash">现金退款</Option>
            <Option value="bank_transfer">银行转账</Option>
            <Option value="voucher">代金券</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="expectedDate"
          label="预期退款日期"
          rules={[{ required: true, message: '请选择预期退款日期' }]}
          initialValue={dayjs().add(1, 'day')}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            disabledDate={(current) => current && current < dayjs().endOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="notes"
          label="备注说明"
          rules={[{ required: true, message: '请输入详细的备注说明' }]}
        >
          <TextArea
            rows={4}
            placeholder="请详细说明冲账原因和处理方案..."
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="处理优先级"
          rules={[{ required: true, message: '请选择处理优先级' }]}
        >
          <Radio.Group>
            <Radio value="high">高优先级（当日处理）</Radio>
            <Radio value="medium">中优先级（3个工作日）</Radio>
            <Radio value="low">低优先级（7个工作日）</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </div>,

    // Step 3: 确认提交
    <div key="step3">
      <Alert
        message="确认冲账退款信息"
        description="请仔细核对以下信息，确认无误后提交申请"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
        <h4>冲账退款摘要</h4>
        <p><strong>处理类型：</strong>{correctionType === 'auto' ? '自动检测处理' : '手动冲账处理'}</p>
        {correctionType === 'auto' ? (
          <p><strong>选中记录：</strong>{selectedPayments.length} 条异常支付记录</p>
        ) : (
          <p><strong>订单号：</strong>{form.getFieldValue('orderId') || '未填写'}</p>
        )}
        <p><strong>退款金额：</strong>¥{form.getFieldValue('refundAmount') || 0}</p>
        <p><strong>冲账原因：</strong>{form.getFieldValue('correctionReason') || '未选择'}</p>
        <p><strong>退款方式：</strong>{form.getFieldValue('refundMethod') || '未选择'}</p>
        <p><strong>处理优先级：</strong>{form.getFieldValue('priority') || '未选择'}</p>
      </div>
    </div>,
  ];

  return (
    <Modal
      title="冲账退款处理"
      open={visible}
      onCancel={handleCancel}
      width={900}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            {currentStep < stepContents.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep === stepContents.length - 1 && (
              <Button type="primary" onClick={handleSubmit}>
                提交申请
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="选择类型" description="冲账类型选择" />
        <Step title="填写详情" description="冲账退款信息" />
        <Step title="确认提交" description="核对并提交" />
      </Steps>

      {stepContents[currentStep]}
    </Modal>
  );
};

export default RefundCorrectionModal;
