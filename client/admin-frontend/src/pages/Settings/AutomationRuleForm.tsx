import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Switch, message, Space, Divider } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { automationRuleService } from '@/services/automationRules';

const triggerOptions = [
  { value: 'ORDER_COMPLETED', label: '订单完成' },
  { value: 'APPOINTMENT_CONFIRMED', label: '预约确认' },
  { value: 'STOCK_LOW', label: '库存偏低' },
];

const operatorOptions = [
  { value: '>', label: '大于' },
  { value: '>=', label: '大于等于' },
  { value: '<', label: '小于' },
  { value: '<=', label: '小于等于' },
  { value: '==', label: '等于' },
  { value: '!=', label: '不等于' },
  { value: 'contains', label: '包含' },
];

const actionTypeOptions = [
  { value: 'SEND_NOTIFICATION', label: '发送通知' },
  { value: 'UPDATE_ORDER_STATUS', label: '更新订单状态' },
  { value: 'CREATE_STOCK_ALERT', label: '创建库存预警' },
];

const AutomationRuleForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [_loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      automationRuleService.getById(Number(id)).then((res: any) => {
        const d = res?.data || res;
        form.setFieldsValue(d);
      }).finally(() => setLoading(false));
    }
  }, [id, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await automationRuleService.update(Number(id), values);
        message.success('更新成功');
      } else {
        await automationRuleService.create(values);
        message.success('创建成功');
      }
      navigate('/settings/automation-rules');
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title={isEdit ? '编辑自动化规则' : '新建自动化规则'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }} initialValues={{ enabled: true, sortOrder: 0 }}>
        <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
          <Input placeholder="例如：订单完成通知客户选片" />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="规则描述" />
        </Form.Item>

        <Form.Item name="trigger" label="触发事件" rules={[{ required: true, message: '请选择触发事件' }]}>
          <Select options={triggerOptions} placeholder="选择触发事件" />
        </Form.Item>

        <Form.Item label="条件（可选）">
          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...rest} name={[name, 'field']} rules={[{ required: true }]}>
                      <Input placeholder="字段名" style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'operator']} rules={[{ required: true }]}>
                      <Select options={operatorOptions} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'value']} rules={[{ required: true }]}>
                      <Input placeholder="值" style={{ width: 120 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加条件</Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Divider />
        <Form.Item label="动作" required>
          <Form.List name="actions" rules={[{ validator: async (_, names) => { if (!names?.length) throw new Error('至少添加一个动作'); } }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Form.Item {...rest} name={[name, 'type']} rules={[{ required: true, message: '请选择动作类型' }]}>
                        <Select options={actionTypeOptions} style={{ width: 150 }} placeholder="动作类型" />
                      </Form.Item>
                      <MinusCircleOutlined onClick={() => remove(name)} />
                    </Space>
                    <Form.Item {...rest} name={[name, 'params']} label="参数 (JSON)">
                      <Input.TextArea rows={3} placeholder='{"title":"xxx","content":"xxx"}' />
                    </Form.Item>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加动作</Button>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="sortOrder" label="排序">
          <Input type="number" style={{ width: 100 }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>{isEdit ? '更新' : '创建'}</Button>
            <Button onClick={() => navigate('/settings/automation-rules')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AutomationRuleForm;
