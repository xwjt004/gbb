import React, { useState } from 'react';
import { Card, Form, Input, Button, App, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '@/services/auth';

const { Text } = Typography;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { message: msg } = App.useApp();

  const handleSubmit = async (values: { newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      msg.error('两次输入的密码不一致');
      return;
    }
    if (!token) {
      msg.error('重置链接无效');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, values.newPassword);
      if (res.success) {
        setDone(true);
      } else {
        msg.error(res.message || '重置失败');
      }
    } catch (err: any) {
      msg.error(err.response?.data?.message || err.message || '重置失败');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text style={{ fontSize: 18 }}>密码重置成功</Text>
            <div style={{ marginTop: 24 }}>
              <Link to="/login">去登录</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text type="danger">重置链接无效，请重新发送重置邮件。</Text>
            <div style={{ marginTop: 24 }}>
              <Link to="/forgot-password">重新发送</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }}>
      <Card title="设置新密码">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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
              确认重置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;
