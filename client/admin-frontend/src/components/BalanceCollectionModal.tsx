import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Button,
  Card,
  Descriptions,
  Divider,
  message,
  Alert,
} from 'antd';
import { MoneyCollectOutlined } from '@ant-design/icons';
import { orderService } from '@/services/orders';

interface BalanceCollectionModalProps {
  visible: boolean;
  orderId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface BalanceInfo {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overpaidAmount: number;  // 🔥 新增：多收款金额
  isFreeOrder: boolean;     // 🔥 新增：是否为免费订单
  isFullyPaid: boolean;
  isOverpaid: boolean;      // 🔥 新增：是否多收款
  paymentStatus: string;
  payments: Array<{
    id: string;
    amount: number;
    paymentType: string;
    status: string;
    createdAt: string;
  }>;
}

const BalanceCollectionModal: React.FC<BalanceCollectionModalProps> = ({
  visible,
  orderId,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (visible && orderId) {
      fetchBalanceInfo();
    }
  }, [visible, orderId]);

  // 单独的 effect 来重置表单
  useEffect(() => {
    if (visible && balanceInfo) {
      form.setFieldsValue({
        amount: balanceInfo.remainingAmount,
        paymentType: 'CASH',
      });
    }
  }, [visible, balanceInfo, form]);

  const fetchBalanceInfo = async () => {
    if (!orderId) return;

    try {
      setBalanceLoading(true);
      const response = await orderService.getOrderBalance(orderId);
      setBalanceInfo(response.data.data || response.data);
    } catch (error) {
      console.error('获取余额信息失败:', error);
      message.error('获取余额信息失败');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!orderId || !balanceInfo) return;

    if (values.amount > balanceInfo.remainingAmount) {
      message.error(`收取金额不能超过剩余金额 ¥${balanceInfo.remainingAmount}`);
      return;
    }

    try {
      setLoading(true);
      await orderService.collectBalance({
        orderId,
        amount: values.amount,
        paymentType: values.paymentType,
        notes: values.notes,
      });

      message.success('尾款收取成功');
      onSuccess();
      onCancel();
    } catch (error: any) {
      console.error('收取尾款失败:', error);
      message.error(error.response?.data?.message || '收取尾款失败');
    } finally {
      setLoading(false);
    }
  };

  const paymentTypeOptions = [
    { label: '现金', value: 'CASH' },
    { label: '微信支付', value: 'WECHAT' },
    { label: '支付宝', value: 'ALIPAY' },
    { label: '银行转账', value: 'BANK_TRANSFER' },
  ];

  const getPaymentStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      UNPAID: 'red',
      PARTIAL: 'orange',
      PAID: 'green',
      REFUNDED: 'purple',
      FREE: '#1890ff',        // 🔥 免费订单 - 蓝色
      OVERPAID: '#ff4d4f',    // 🔥 多收款 - 红色
    };
    return colorMap[status] || 'default';
  };

  const getPaymentStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      UNPAID: '未支付',
      PARTIAL: '部分支付',
      PAID: '已支付',
      REFUNDED: '已退款',
      FREE: '免费赠送',      // 🔥 免费订单
      OVERPAID: '多收款',    // 🔥 多收款异常
    };
    return textMap[status] || status;
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MoneyCollectOutlined />
          收取尾款
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      {balanceLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          正在加载余额信息...
        </div>
      ) : balanceInfo ? (
        <>
          <Card title="余额信息" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="订单总额">
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  ¥{balanceInfo.totalAmount}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="已付金额">
                <span style={{ color: '#52c41a' }}>
                  ¥{balanceInfo.paidAmount}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="剩余金额">
                <span 
                  style={{ 
                    color: balanceInfo.remainingAmount > 0 ? '#fa8c16' : '#52c41a',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                  ¥{balanceInfo.remainingAmount}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                <span style={{ color: getPaymentStatusColor(balanceInfo.paymentStatus) }}>
                  {getPaymentStatusText(balanceInfo.paymentStatus)}
                </span>
              </Descriptions.Item>
            </Descriptions>

            {/* 🔥 免费订单提示 */}
            {balanceInfo.isFreeOrder && balanceInfo.paidAmount === 0 && (
              <Alert
                message="免费订单"
                description="该订单为免费订单（订单总额为0），无需收款。"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {/* 🔥 多收款警告 */}
            {balanceInfo.isOverpaid && (
              <Alert
                message="多收款提醒"
                description={
                  <div>
                    <p>该订单已多收款 <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>¥{balanceInfo.overpaidAmount.toFixed(2)}</span></p>
                    <p>订单总额: ¥{balanceInfo.totalAmount.toFixed(2)}</p>
                    <p>实际已付: ¥{balanceInfo.paidAmount.toFixed(2)}</p>
                    <p>建议：请先处理多收款项（退款或调整订单金额），再进行新的收款操作。</p>
                  </div>
                }
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {/* 🔥 全额支付提示 */}
            {balanceInfo.isFullyPaid && !balanceInfo.isOverpaid && !balanceInfo.isFreeOrder && (
              <Alert
                message="该订单已全额支付，无需收取尾款"
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>

          <Divider />
          
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={
              balanceInfo.isFreeOrder ||      // 🔥 禁止免费订单收款
              balanceInfo.isOverpaid ||       // 🔥 禁止多收款订单继续收款
              balanceInfo.isFullyPaid || 
              balanceInfo.remainingAmount <= 0
            }
          >
            <Form.Item
              label="收取金额"
              name="amount"
              rules={[
                { required: true, message: '请输入收取金额' },
                { 
                  type: 'number', 
                  min: 0.01, 
                  max: balanceInfo.remainingAmount,
                  message: `金额必须在 ¥0.01 - ¥${balanceInfo.remainingAmount} 之间` 
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入收取金额"
                min={0.01}
                max={balanceInfo.remainingAmount}
                step={0.01}
                precision={2}
                addonBefore="¥"
              />
            </Form.Item>

            <Form.Item
              label="支付方式"
              name="paymentType"
              rules={[{ required: true, message: '请选择支付方式' }]}
            >
              <Select
                placeholder="请选择支付方式"
                options={paymentTypeOptions}
              />
            </Form.Item>

            <Form.Item
              label="备注"
              name="notes"
            >
              <Input.TextArea
                placeholder="请输入备注（可选）"
                rows={3}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={onCancel}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<MoneyCollectOutlined />}
                  disabled={balanceInfo.isFullyPaid || balanceInfo.remainingAmount <= 0}
                >
                  确认收取
                </Button>
              </div>
            </Form.Item>
          </Form>
        </>
      ) : null}
    </Modal>
  );
};

export default BalanceCollectionModal;
