import React from 'react';
import { Card, Space, Typography, Button, DatePicker } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
const { Text } = Typography;
const { RangePicker } = DatePicker;
import ReactECharts from 'echarts-for-react';

interface ChartPanelProps {
  loading: boolean;
  orderTrends: any[];
  option: any;
  dateRange?: [Dayjs, Dayjs];
  setDateRange?: (dates: [Dayjs, Dayjs] | null) => void;
  refreshing?: boolean;
  handleRefresh?: () => void;
}

const ChartPanel: React.FC<ChartPanelProps> = ({ 
  loading, 
  orderTrends, 
  option,
  dateRange,
  setDateRange,
  refreshing,
  handleRefresh,
}) => {
  return (
    <>
      <Card 
        title="订单趋势" 
        loading={loading} 
        extra={
          <Space>
            {dateRange && setDateRange && (
              <RangePicker
                size="small"
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                format="YYYY-MM-DD"
                style={{ width: 240 }}
                placeholder={['开始日期', '结束日期']}
              />
            )}
            {handleRefresh && (
              <Button 
                type="text" 
                size="small" 
                icon={<SyncOutlined spin={refreshing} />}
                onClick={handleRefresh}
              >
                刷新
              </Button>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              更新: {new Date().toLocaleString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </Space>
        }
      >
        {loading ? (
          <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中...</div>
        ) : orderTrends && orderTrends.length > 0 ? (
          <ReactECharts option={option} style={{ height: 350, width: '100%' }} />
        ) : (
          <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>暂无数据</div>
        )}
      </Card>
    </>
  );
};

export default ChartPanel;
