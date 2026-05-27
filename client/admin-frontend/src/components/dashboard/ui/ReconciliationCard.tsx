import React from 'react';
import { Card, Alert, Form, Select, DatePicker, Button, Typography } from 'antd';
import { CheckCircleOutlined, SearchOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Title, Text } = Typography;

export const ReconciliationCard: React.FC = () => {
  return (
    <Card title="对账操作" extra={(
      <span>
        <Button type="primary" icon={<DownloadOutlined />}>导出对账单</Button>
        <Button icon={<FileExcelOutlined />} style={{ marginLeft: 8 }}>生成报告</Button>
      </span>
    )}>
      <Alert message="对账状态正常" description="所有支付记录已完成对账，未发现异常。" type="success" showIcon style={{ marginBottom: 16 }} />

      <Form layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item label="支付平台">
          <Select defaultValue="all" style={{ width: 120 }}>
            <Option value="all">全部</Option>
            <Option value="wechat">微信支付</Option>
            <Option value="alipay">支付宝</Option>
          </Select>
        </Form.Item>
        <Form.Item label="对账日期">
          <DatePicker />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<SearchOutlined />}>查询</Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', padding: '40px' }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
        <Title level={4} style={{ marginTop: 16 }}>对账完成</Title>
        <Text type="secondary">今日对账已完成，所有记录核对无误</Text>
      </div>
    </Card>
  );
};

export default ReconciliationCard;
