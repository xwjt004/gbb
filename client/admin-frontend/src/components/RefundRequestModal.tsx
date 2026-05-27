import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Radio,
  message,
  Space,
  Alert,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  refundService,
  RefundType,
  RefundMethod,
  CreateRefundRequestDto,
} from '@/services/refundService';

interface RefundRequestModalProps {
  visible: boolean;
  orderNo: string;
  paidAmount: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  visible,
  orderNo,
  paidAmount,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [refundType, setRefundType] = useState<RefundType>(RefundType.FULL);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      setRefundType(RefundType.FULL);
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 前置检查：是否已有未处理退款申请，减少后端409频率
      const hasUnresolved = await refundService.hasUnresolvedRefund(orderNo);
      if (hasUnresolved) {
        message.warning('该订单已有未处理的退款申请，请等待处理完成');
        setLoading(false);
        return;
      }

      const refundData: CreateRefundRequestDto = {
        orderNo,
        refundType: values.refundType,
        refundAmount:
          values.refundType === RefundType.FULL
            ? paidAmount
            : values.refundAmount,
        refundReason: values.refundReason,
        refundMethod: values.refundMethod,
        notes: values.notes,
        applicantType: 'ADMIN',
      };

      const result = await refundService.createRefundRequest(refundData);
      console.log('退款申请创建成功:', result);
      
      message.success('退款申请提交成功');
      form.resetFields();
      setLoading(false);
      
      // 调用成功回调
      onSuccess();
    } catch (error: any) {
      console.error('退款申请失败:', error);
      // 409 冲突友好提示
      if (error?.response?.status === 409) {
        message.error(error?.response?.data?.message || '该订单已有待处理的退款申请，无法重复提交');
      } else if (error?.response?.status === 400) {
        message.error(error?.response?.data?.message || '请求参数错误，请检查填写内容');
      } else if (error?.response?.status === 404) {
        message.error('订单不存在或已删除');
      } else {
        message.error(error.message || '退款申请失败');
      }
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) {
      return;
    }
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>申请退款</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="提交申请"
      cancelText="取消"
      maskClosable={false}
    >
      <Alert
        message="退款说明"
        description={`订单号：${orderNo}，已支付金额：¥${paidAmount.toFixed(2)}`}
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          refundType: RefundType.FULL,
          refundMethod: RefundMethod.ORIGINAL,
        }}
      >
        <Form.Item
          label="退款类型"
          name="refundType"
          rules={[{ required: true, message: '请选择退款类型' }]}
        >
          <Radio.Group onChange={(e) => setRefundType(e.target.value)}>
            <Radio value={RefundType.FULL}>
              全额退款 (¥{paidAmount.toFixed(2)})
            </Radio>
            <Radio value={RefundType.PARTIAL}>部分退款</Radio>
          </Radio.Group>
        </Form.Item>

        {refundType === RefundType.PARTIAL && (
          <Form.Item
            label="退款金额"
            name="refundAmount"
            rules={[
              { required: true, message: '请输入退款金额' },
              {
                type: 'number',
                min: 0.01,
                message: '退款金额必须大于0',
              },
              {
                validator: (_, value) => {
                  if (value > paidAmount) {
                    return Promise.reject(
                      new Error(`退款金额不能超过已支付金额 ¥${paidAmount.toFixed(2)}`)
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="¥"
              precision={2}
              placeholder="请输入退款金额"
              max={paidAmount}
            />
          </Form.Item>
        )}

        <Form.Item
          label="退款原因"
          name="refundReason"
          rules={[
            { required: true, message: '请填写退款原因' },
            { min: 5, message: '退款原因至少5个字符' },
          ]}
        >
          <Input.TextArea
            rows={4}
            placeholder="请详细说明退款原因（至少5个字符）"
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="退款方式"
          name="refundMethod"
          rules={[{ required: true, message: '请选择退款方式' }]}
        >
          <Select placeholder="请选择退款方式">
            <Select.Option value={RefundMethod.ORIGINAL}>
              原路退回（推荐）
            </Select.Option>
            <Select.Option value={RefundMethod.CASH}>现金退款</Select.Option>
            <Select.Option value={RefundMethod.BANK}>银行转账</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={3} placeholder="其他说明（可选）" maxLength={200} />
        </Form.Item>
      </Form>

      <Alert
        message="温馨提示"
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>退款申请提交后需要管理员审批</li>
            <li>审批通过后才能执行退款操作</li>
            <li>原路退回方式会退款到原支付账户</li>
            <li>退款完成后订单状态会相应更新</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default RefundRequestModal;
