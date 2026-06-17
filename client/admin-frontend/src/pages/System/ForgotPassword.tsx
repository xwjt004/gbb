import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, App } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/services/auth';

const { Text } = Typography;

const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { message: msg } = App.useApp();

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      const res = await forgotPassword(values.email);
      if (res.success) {
        setSent(true);
      } else {
        msg.error(res.message || '发送失败');
      }
    } catch (err: any) {
      msg.error(err.response?.data?.message || err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ maxWidth: 420, margin: '80px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Text style={{ fontSize: 18 }}>邮件已发送</Text>
            <div style={{ marginTop: 16, color: '#666' }}>
              如果该邮箱已注册，您将收到密码重置邮件，请按邮件指引操作。
            </div>
            <div style={{ marginTop: 24 }}>
              <Link to="/login">返回登录</Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto' }}>
      <Card title="忘记密码">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="email"
            label="管理员邮箱"
            rules={[
              { required: true, message: '请输入您的邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入您的管理员邮箱" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              发送重置邮件
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">返回登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
