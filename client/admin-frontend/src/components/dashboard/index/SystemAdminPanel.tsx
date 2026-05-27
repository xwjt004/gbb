import React from 'react';
import { Card, Row, Col, Button, Typography, message } from 'antd';
import { UserOutlined, SettingOutlined, BellOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SystemAdminPanel: React.FC<any> = () => {
  return (
    <Card title={<span><SettingOutlined /> 系统设置</span>} extra={<Button type="link" size="small">编辑</Button>}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>用户管理</div>
              <Text type="secondary" style={{ fontSize: 12 }}>用户权限、角色配置</Text>
              <div style={{ marginTop: 8 }}><Button type="primary" size="small" block onClick={() => message.info('跳转到用户管理')}>管理</Button></div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <SettingOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>系统配置</div>
              <Text type="secondary" style={{ fontSize: 12 }}>基础设置、参数配置</Text>
              <div style={{ marginTop: 8 }}><Button type="primary" size="small" block onClick={() => message.info('打开系统配置')}>配置</Button></div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <BellOutlined style={{ fontSize: 24, color: '#fa8c16', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>通知设置</div>
              <Text type="secondary" style={{ fontSize: 12 }}>消息推送、邮件通知</Text>
              <div style={{ marginTop: 8 }}><Button type="primary" size="small" block onClick={() => message.info('配置通知')}>设置</Button></div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" hoverable>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 24, color: '#722ed1', marginBottom: 8 }} />
              <div style={{ fontWeight: 'bold' }}>安全中心</div>
              <Text type="secondary" style={{ fontSize: 12 }}>登录安全、访问控制</Text>
              <div style={{ marginTop: 8 }}><Button type="primary" size="small" block onClick={() => message.info('安全设置')}>查看</Button></div>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default SystemAdminPanel;
