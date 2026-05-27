import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Space, message, Divider, Typography } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { smartMarketingService } from '@/services/smartMarketing';

const { TextArea } = Input;
const { Text } = Typography;

const FIELD_OPTIONS = [
  { label: '订单数 (totalOrders)', value: 'totalOrders' },
  { label: '消费金额 (totalAmount)', value: 'totalAmount' },
  { label: '成长值 (growthPoints)', value: 'growthPoints' },
  { label: '会员等级 (memberLevel)', value: 'memberLevel' },
  { label: '流失状态 (churnStatus)', value: 'churnStatus' },
  { label: '性别 (gender)', value: 'gender' },
  { label: '距离上次下单天数 (daysSinceLastOrder)', value: 'daysSinceLastOrder' },
  { label: '生日月份 (birthdayMonth)', value: 'birthdayMonth' },
];

const OPERATOR_OPTIONS = [
  { label: '大于 (>)', value: '>' },
  { label: '大于等于 (>=)', value: '>=' },
  { label: '小于 (<)', value: '<' },
  { label: '小于等于 (<=)', value: '<=' },
  { label: '等于 (==)', value: '==' },
  { label: '不等于 (!=)', value: '!=' },
];

const PRESET_TEMPLATES = [
  { label: 'VIP客户', value: 'vip' },
  { label: '黄金客户', value: 'gold' },
  { label: '白银客户', value: 'silver' },
  { label: '新客户', value: 'new' },
  { label: '即将流失', value: 'churn' },
  { label: '本月生日', value: 'birthday' },
];

const TEMPLATE_RULES: Record<string, { name: string; description: string; rules: any[] }> = {
  vip: { name: 'VIP客户', description: '消费10次以上且总金额5000元以上', rules: [{ field: 'totalOrders', operator: '>=', value: 10 }, { field: 'totalAmount', operator: '>=', value: 5000 }] },
  gold: { name: '黄金客户', description: '消费5次以上且总金额2000元以上', rules: [{ field: 'totalOrders', operator: '>=', value: 5 }, { field: 'totalAmount', operator: '>=', value: 2000 }] },
  silver: { name: '白银客户', description: '消费2次以上且总金额500元以上', rules: [{ field: 'totalOrders', operator: '>=', value: 2 }, { field: 'totalAmount', operator: '>=', value: 500 }] },
  new: { name: '新客户', description: '未下过单的注册用户', rules: [{ field: 'totalOrders', operator: '==', value: 0 }] },
  churn: { name: '即将流失', description: '超过60天未下单的活跃用户', rules: [{ field: 'daysSinceLastOrder', operator: '>=', value: 60 }, { field: 'churnStatus', operator: '==', value: 'ACTIVE' }] },
  birthday: { name: '本月生日', description: '本月过生日的用户', rules: [{ field: 'birthdayMonth', operator: '==', value: new Date().getMonth() + 1 }] },
};

const SegmentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (id) {
      loadSegment();
    }
  }, [id]);

  const loadSegment = async () => {
    try {
      setLoading(true);
      const res = await smartMarketingService.getSegment(id!) as any;
      const data = res?.data || res;
      form.setFieldsValue(data);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (templateKey: string) => {
    const tpl = TEMPLATE_RULES[templateKey];
    if (!tpl) return;
    form.setFieldsValue({
      name: tpl.name,
      description: tpl.description,
      rules: tpl.rules,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (isEdit) {
        await smartMarketingService.updateSegment(id!, values);
        message.success('更新成功');
      } else {
        await smartMarketingService.createSegment(values);
        message.success('创建成功');
      }
      navigate('/marketing/segments');
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title={isEdit ? '编辑客户分群' : '新建客户分群'} loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ rules: [{ field: undefined, operator: '>=', value: '' }] }}
          style={{ maxWidth: 800 }}
        >
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入分群名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>

          <Divider>规则条件</Divider>

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ marginRight: 8 }}>快速填充：</Text>
            <Select
              style={{ width: 200 }}
              placeholder="选择预设模板"
              options={PRESET_TEMPLATES}
              onChange={applyTemplate}
              allowClear
            />
          </div>

          <Form.List name="rules">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'field']}
                      rules={[{ required: true, message: '选择字段' }]}
                    >
                      <Select style={{ width: 240 }} placeholder="选择字段" options={FIELD_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'operator']}
                      rules={[{ required: true, message: '选择运算符' }]}
                    >
                      <Select style={{ width: 130 }} placeholder="运算符" options={OPERATOR_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: '输入值' }]}
                    >
                      <Input style={{ width: 120 }} placeholder="值" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                    添加规则
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button onClick={() => navigate('/marketing/segments')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SegmentForm;
