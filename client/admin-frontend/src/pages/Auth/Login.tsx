import React from 'react';
import { Form, Input, Button, Checkbox, App } from 'antd';
import { UserOutlined, LockOutlined, CameraOutlined } from '@ant-design/icons';
import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { login } from '@/store/authSlice';
import './Login.css';

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (values: { username: string; password: string; remember: boolean }) => {
    try {
      await dispatch(login({
        username: values.username,
        password: values.password,
      })).unwrap();

      message.success('登录成功');
    } catch (error) {
      message.error('登录失败，请检查用户名和密码');
    }
  };

  return (
    <div className="login-container">
      <div className="login-center-glow" />
      <div className="login-dot-pattern" />
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <CameraOutlined />
          </div>
          <h1>GBB 管理后台</h1>
          <p>乖宝宝儿童影楼管理系统</p>
        </div>

        <Form
          form={form}
          name="login"
          className="login-form"
          onFinish={handleSubmit}
          autoComplete="off"
          initialValues={{ remember: true }}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              className="login-input"
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              className="login-input"
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住我</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              className="login-btn"
              type="primary"
              htmlType="submit"
              loading={isLoading}
            >
              登录
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 4 }}>
            <a href="/admin/forgot-password" style={{ fontSize: 13, color: '#999' }}>忘记密码？</a>
          </div>
        </Form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} 乖宝宝儿童影楼
        </div>
        <div style={{ textAlign: 'center', padding: '4px 0 16px', fontSize: 12, color: '#999' }}>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" style={{ color: '#999', textDecoration: 'none' }}>
            辽ICP备2026010503号-1
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
