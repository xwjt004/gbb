import React from 'react';
import { Space, Select, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

const HeaderActions: React.FC<any> = ({ timeRange, setTimeRange, refreshing, handleRefresh }) => {
  return (
    <Space>
      <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
        <Option value="1d">今日</Option>
        <Option value="7d">近7天</Option>
        <Option value="30d">近30天</Option>
        <Option value="90d">近90天</Option>
      </Select>
      <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>刷新</Button>
    </Space>
  );
};

export default HeaderActions;
