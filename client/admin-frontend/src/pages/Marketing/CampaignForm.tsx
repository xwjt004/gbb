import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Space, message, DatePicker } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { smartMarketingService } from '@/services/smartMarketing';

const { TextArea } = Input;
const { Option } = Select;

const CampaignForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const isEdit = !!id;

  useEffect(() => {
    loadSegments();
    loadCoupons();
    if (id) loadCampaign();
  }, [id]);

  const loadSegments = async () => {
    try {
      const res = await smartMarketingService.getSegments({ pageSize: 100 }) as any;
      const d = res?.data || res;
      setSegments(d?.items || []);
    } catch {
      setSegments([]);
    }
  };

  const loadCoupons = async () => {
    try {
      // 使用已有的 couponService
      const { couponService } = await import('@/services/coupons');
      const res = await couponService.getCoupons({ pageSize: 100 }) as any;
      const d = res?.data || res;
      setCoupons(d?.list || []);
    } catch {
      setCoupons([]);
    }
  };

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const res = await smartMarketingService.getCampaign(id!) as any;
      const data = res?.data || res;
      form.setFieldsValue({
        ...data,
        scheduledAt: data.scheduledAt ? undefined : undefined,
      });
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        scheduledAt: values.scheduledAt?.toISOString(),
      };
      if (isEdit) {
        await smartMarketingService.updateCampaign(id!, payload);
        message.success('更新成功');
      } else {
        await smartMarketingService.createCampaign(payload);
        message.success('创建成功');
      }
      navigate('/marketing/campaigns');
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title={isEdit ? '编辑营销活动' : '新建营销活动'} loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 700 }}
        >
          <Form.Item name="name" label="活动名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入活动名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="campaignType"
            label="活动类型"
            rules={[{ required: true, message: '请选择活动类型' }]}
          >
            <Select placeholder="选择活动类型">
              <Option value="COUPON_PUSH">优惠券推送</Option>
              <Option value="NOTIFICATION_PUSH">通知推送</Option>
            </Select>
          </Form.Item>
          <Form.Item name="segmentId" label="目标分群">
            <Select placeholder="选择目标分群" allowClear>
              {segments.map((s: any) => (
                <Option key={s.id} value={s.id}>
                  {s.name} ({s.memberCount}人)
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 优惠券推送专用字段 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.campaignType !== cur.campaignType}>
            {({ getFieldValue }) =>
              getFieldValue('campaignType') === 'COUPON_PUSH' && (
                <Form.Item name="couponId" label="优惠券" rules={[{ required: true, message: '请选择优惠券' }]}>
                  <Select placeholder="选择要推送的优惠券" allowClear>
                    {coupons
                      .filter((c: any) => c.status === 'ACTIVE' || c.status === 'ACTIVE')
                      .map((c: any) => (
                        <Option key={c.id} value={c.id}>
                          {c.couponName}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>

          {/* 通知推送专用字段 */}
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.campaignType !== cur.campaignType}>
            {({ getFieldValue }) =>
              getFieldValue('campaignType') === 'NOTIFICATION_PUSH' && (
                <>
                  <Form.Item name="title" label="通知标题" rules={[{ required: true, message: '请输入通知标题' }]}>
                    <Input placeholder="请输入通知标题" />
                  </Form.Item>
                  <Form.Item name="content" label="通知内容" rules={[{ required: true, message: '请输入通知内容' }]}>
                    <TextArea rows={4} placeholder="请输入通知内容" />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>

          <Form.Item name="scheduledAt" label="定时发送">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => navigate('/marketing/campaigns')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CampaignForm;
