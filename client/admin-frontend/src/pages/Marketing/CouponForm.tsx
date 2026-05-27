import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Select, DatePicker, Button, message, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { couponService } from '@/services/coupons';

const { RangePicker } = DatePicker;

const couponTypeOptions = [
  { label: '注册赠送', value: 'REGISTER' },
  { label: '促销活动', value: 'PROMOTION' },
  { label: '返利', value: 'REBATE' },
  { label: '生日福利', value: 'BIRTHDAY' },
];

const discountTypeOptions = [
  { label: '百分比折扣', value: 'PERCENT' },
  { label: '固定金额', value: 'FIXED' },
];

const CouponForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      couponService.getCouponById(id!).then((res: any) => {
        const d = res?.data?.data || res?.data;
        if (d) {
          form.setFieldsValue({
            ...d,
            dateRange: [dayjs(d.startTime), dayjs(d.endTime)],
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const [startTime, endTime] = values.dateRange;
    const payload = {
      ...values,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      dateRange: undefined,
    };

    try {
      if (isEdit) {
        await couponService.updateCoupon(id!, payload);
        message.success('更新成功');
      } else {
        await couponService.createCoupon(payload);
        message.success('创建成功');
      }
      navigate('/marketing/coupons');
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <Card title={isEdit ? '编辑优惠券' : '新建优惠券'} extra={<Button onClick={() => navigate('/marketing/coupons')}>返回</Button>}>
      <Form form={form} layout="vertical" style={{ maxWidth: 600 }} onFinish={handleSubmit}>
        <Form.Item name="couponCode" label="优惠券编码" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="couponName" label="优惠券名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="couponType" label="类型" rules={[{ required: true }]}>
          <Select options={couponTypeOptions} />
        </Form.Item>
        <Form.Item name="discountType" label="折扣类型" rules={[{ required: true }]}>
          <Select options={discountTypeOptions} />
        </Form.Item>
        <Form.Item name="discountValue" label="折扣值" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="minAmount" label="最低消费金额">
          <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="maxDiscount" label="最大折扣金额">
          <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="totalCount" label="总数量" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="perUserLimit" label="每人限领" initialValue={1}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="dateRange" label="有效期" rules={[{ required: true }]}>
          <RangePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? '更新' : '创建'}</Button>
            <Button onClick={() => navigate('/marketing/coupons')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CouponForm;
