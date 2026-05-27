import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Descriptions, Tag, Spin, Space, Divider } from 'antd';
import {
  InfoCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  SettingOutlined, ShopOutlined, PrinterOutlined, BgColorsOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { simple } from '@/services/api';

const SystemSettings: React.FC = () => {
  const [version, setVersion] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      simple.get<any>('/version'),
      simple.get<any>('/health'),
    ]).then(([v, h]) => {
      setVersion(v);
      setHealth(h);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const quickLinks = [
    { key: '/settings/shop-info', icon: <ShopOutlined />, title: '店铺信息', desc: '管理店铺基本信息、联系方式、社交媒体账号' },
    { key: '/settings/print-settings', icon: <PrinterOutlined />, title: '打印设置', desc: '配置打印格式、显示内容、票据模板' },
    { key: '/system/theme', icon: <BgColorsOutlined />, title: '主题设置', desc: '自定义系统主题色、侧边栏样式' },
    { key: '/system/backup', icon: <ClockCircleOutlined />, title: '数据备份', desc: '数据库备份与恢复管理' },
  ];

  return (
    <div>
      {/* 系统信息 */}
      <Card title={<><InfoCircleOutlined /> 系统信息</>} style={{ marginBottom: 24 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="系统版本" value={version?.version || '-'} prefix={<InfoCircleOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="运行环境" value={health?.environment || '-'} prefix={<CheckCircleOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="运行时间" value={health?.uptime || '-'} prefix={<ClockCircleOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic title="服务状态" value="正常" prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Col>
        </Row>
        <Divider />
        <Descriptions column={2} size="small">
          <Descriptions.Item label="系统名称">{version?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="构建时间">{version?.buildTime ? dayjs(version.buildTime).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
          <Descriptions.Item label="服务状态">
            <Tag color="green">{health?.status === 'ok' ? '运行正常' : '异常'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="监听时间">{health?.timestamp ? dayjs(health.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
          <Descriptions.Item label="数据库">
            <Tag color="green">{health?.services?.database || 'connected'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Redis">
            <Tag color="green">{health?.services?.redis || 'connected'}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 快捷设置入口 */}
      <Card title={<><SettingOutlined /> 快捷设置</>}>
        <Row gutter={[16, 16]}>
          {quickLinks.map(item => (
            <Col span={6} key={item.key}>
              <Card
                hoverable
                size="small"
                onClick={() => navigate(item.key)}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    {item.icon}
                    <strong>{item.title}</strong>
                    <RightOutlined style={{ marginLeft: 'auto', color: '#ccc' }} />
                  </Space>
                  <div style={{ color: '#999', fontSize: 12 }}>{item.desc}</div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default SystemSettings;
