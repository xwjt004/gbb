import React, { useState } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Descriptions,
  Card,
} from 'antd';
import { Payment, RefundRequest } from '@/types/payment';
import { paymentService } from '@/services/payments';

const { TextArea } = Input;

interface RefundModalProps {
  visible: boolean;
  payment?: Payment;
  onCancel: () => void;
  onSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  visible,
  payment,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!payment) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      const refundRequest: RefundRequest = {
        paymentId: payment.id,
        amount: values.amount,
        reason: values.reason,
        notes: values.notes,
      };

      await paymentService.processRefund(refundRequest);
      message.success('退款申请提交成功');
      onSuccess();
    } catch (error) {
      message.error('退款申请失败');
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  const maxRefundAmount = payment.amount - payment.refundAmount;

  return (
    <Modal
      title="申请退款"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
    destroyOnHidden
    >
      <Card title="支付信息" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label="支付单号">
            {payment.paymentNo}
          </Descriptions.Item>
          <Descriptions.Item label="支付金额">
            ¥{Number(payment.amount || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="已退款金额">
            ¥{Number(payment.refundAmount || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="可退款金额">
            ¥{Number(maxRefundAmount || 0).toFixed(2)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          amount: maxRefundAmount,
        }}
      >
        <Form.Item
          name="amount"
          label="退款金额"
          rules={[
            { required: true, message: '请输入退款金额' },
            {
              type: 'number',
              min: 0.01,
              max: Number(maxRefundAmount || 0),
              message: `退款金额应在 0.01 - ${Number(maxRefundAmount || 0).toFixed(2)} 之间`,
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            precision={2}
            max={maxRefundAmount}
            min={0.01}
            step={0.01}
            addonBefore="¥"
          />
        </Form.Item>

        <Form.Item
          name="reason"
          label="退款原因"
          rules={[{ required: true, message: '请输入退款原因' }]}
        >
          <Input placeholder="请输入退款原因" />
        </Form.Item>

        <Form.Item name="notes" label="备注说明">
          <TextArea
            rows={3}
            placeholder="请输入备注说明"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RefundModal;
