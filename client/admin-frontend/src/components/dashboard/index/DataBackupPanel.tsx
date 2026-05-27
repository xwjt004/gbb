import React from 'react';
import { Card, Space, Button, Row, Col, Alert, Divider, Badge, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

const DataBackupPanel: React.FC = () => {
  return (
    <Card title={<span><DownloadOutlined /> 数据备份与导出</span>} extra={<Badge status="processing" text="自动备份已启用" />}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert message="系统数据备份" description="上次备份时间: 今天 03:00，下次自动备份: 明天 03:00" type="success" showIcon style={{ marginBottom: 16 }} />

        <Row gutter={[8, 8]}>
          <Col span={12}><Button type="primary" block icon={<DownloadOutlined />} onClick={() => { message.loading('正在导出订单数据...', 2); setTimeout(() => message.success('订单数据导出成功'), 2000); }}>导出订单</Button></Col>
          <Col span={12}><Button block icon={<DownloadOutlined />} onClick={() => { message.loading('正在导出用户数据...', 2); setTimeout(() => message.success('用户数据导出成功'), 2000); }}>导出用户</Button></Col>
          <Col span={12}><Button block icon={<DownloadOutlined />} onClick={() => { message.loading('正在导出财务数据...', 2); setTimeout(() => message.success('财务数据导出成功'), 2000); }}>导出财务</Button></Col>
          <Col span={12}><Button block icon={<DownloadOutlined />} onClick={() => { message.loading('正在生成完整备份...', 3); setTimeout(() => message.success('完整备份生成成功'), 3000); }}>完整备份</Button></Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div>
          <Text strong>备份设置</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>自动备份</span><Badge status="processing" /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>备份频率</span><Text type="secondary">每日</Text></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>保留天数</span><Text type="secondary">30天</Text></div>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => message.info('打开备份设置')}>修改设置</Button>
            </Space>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default DataBackupPanel;
