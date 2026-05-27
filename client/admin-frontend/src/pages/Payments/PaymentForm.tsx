import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  message,
  Card,
  Descriptions,
  Space,
  Spin,
} from 'antd';
import { PaymentMethod } from '@/types/payment';
import { Order } from '@/types/order';
import { orderService } from '@/services/orders';
import { paymentService } from '@/services/payments';

const { Option } = Select;
const { TextArea } = Input;

interface PaymentFormProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 重置表单
  const resetForm = () => {
    form.resetFields();
    setSelectedOrder(null);
  };

  // 搜索订单
  const handleSearchOrder = async (orderNo: string) => {
    if (!orderNo.trim()) {
      setSelectedOrder(null);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await orderService.getOrderByOrderNo(orderNo);
      setSelectedOrder(response.data);
      
      // 自动填充支付金额
      const unpaidAmount = Number(response.data.totalAmount) - Number(response.data.paidAmount || 0);
      form.setFieldValue('amount', unpaidAmount);
    } catch (error) {
      message.error('订单不存在或查询失败');
      setSelectedOrder(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // 提交支付
  const handleSubmit = async () => {
    if (!selectedOrder) {
      message.error('请先搜索并选择订单');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const paymentData = {
        orderNo: selectedOrder.orderNo,
        amount: values.amount,
        paymentType: values.method,
        description: values.notes || `${selectedOrder.package?.name} - 支付`,
      };

      await paymentService.createPayment(paymentData);
      message.success('支付记录创建成功');
      onSuccess();
      resetForm();
    } catch (error) {
      message.error('创建支付记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 关闭弹窗
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const remainingAmount = selectedOrder 
    ? Number(selectedOrder.totalAmount) - Number(selectedOrder.paidAmount || 0)
    : 0;

  return (
    <Modal
      title="创建支付记录"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          method: PaymentMethod.CASH,
        }}
      >
        <Form.Item
          name="orderNo"
          label="订单号"
          rules={[{ required: true, message: '请输入订单号' }]}
        >
          <Input
            placeholder="请输入订单号进行搜索"
            onBlur={(e) => handleSearchOrder(e.target.value)}
            suffix={
              <div style={{ minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {searchLoading ? <Spin size="small" /> : null}
              </div>
            }
          />
        </Form.Item>

        {selectedOrder && (
          <Card title="订单信息" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="订单号">
                {selectedOrder.orderNo}
              </Descriptions.Item>
              <Descriptions.Item label="客户手机号">
                {selectedOrder.user?.phone}
              </Descriptions.Item>
              <Descriptions.Item label="套餐名称">
                {selectedOrder.package?.name}
              </Descriptions.Item>
              <Descriptions.Item label="订单总额">
                ¥{Number(selectedOrder.totalAmount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="已支付金额">
                ¥{Number(selectedOrder.paidAmount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="待支付金额">
                <span style={{ color: '#f50', fontWeight: 'bold' }}>
                  ¥{remainingAmount.toFixed(2)}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Form.Item
          name="method"
          label="支付方式"
          rules={[{ required: true, message: '请选择支付方式' }]}
        >
          <Select placeholder="请选择支付方式">
            <Option value={PaymentMethod.CASH}>现金支付</Option>
            <Option value={PaymentMethod.WECHAT}>微信支付</Option>
            <Option value={PaymentMethod.BANK_TRANSFER}>银行卡支付</Option>
            <Option value={PaymentMethod.ALIPAY}>支付宝</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="amount"
          label="支付金额"
          rules={[
            { required: true, message: '请输入支付金额' },
            {
              type: 'number',
              min: 0.01,
              max: remainingAmount || 999999,
              message: `支付金额应在 0.01 - ${remainingAmount.toFixed(2)} 之间`,
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            precision={2}
            max={remainingAmount}
            min={0.01}
            step={0.01}
            addonBefore="¥"
            placeholder="请输入支付金额"
          />
        </Form.Item>

        <Form.Item name="notes" label="备注说明">
          <TextArea
            rows={3}
            placeholder="请输入备注说明（可选）"
          />
        </Form.Item>
      </Form>

      {selectedOrder && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 4 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div><strong>温馨提示：</strong></div>
            <div>• 现金支付：创建后支付状态为"已支付"</div>
            <div>• 微信/支付宝：创建后需要客户完成支付流程</div>
            <div>• 银行卡支付：创建后需要手动确认到账</div>
          </Space>
        </div>
      )}
    </Modal>
  );
};

export default PaymentForm;
