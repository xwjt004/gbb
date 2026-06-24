import React, { useState } from 'react';
import { Card, Form, Input, Button, message, App } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changePassword } from '@/services/auth';

const ChangePassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { message: msg } = App.useApp();

  const handleSubmit = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      msg.error('两次输入的新密码不一致');
      return;
    }
    if (values.newPassword.length < 6) {
      msg.error('新密码长度不能少于6位');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(values.oldPassword, values.newPassword);
      if (res.success) {
        msg.success('密码修改成功');
        form.resetFields();
      } else {
        msg.error(res.message || '修改失败');
      }
    } catch (err: any) {
      msg.error(err.response?.data?.message || err.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto' }}>
      <Card title="修改密码">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="oldPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6位' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ChangePassword;
