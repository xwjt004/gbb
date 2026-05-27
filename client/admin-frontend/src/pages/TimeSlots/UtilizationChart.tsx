import React from 'react';
import { Card, Row, Col, Progress, Statistic } from 'antd';
import { 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons';

interface UtilizationChartProps {
  data: {
    total: number;
    available: number;
    booked: number;
    expiredBooked: number;  // 改名为 expiredBooked
    utilizationRate: number;
  };
}

const UtilizationChart: React.FC<UtilizationChartProps> = ({ data }) => {
  const { total, available, booked, expiredBooked, utilizationRate } = data;
  
  return (
    <Card title="时间槽利用率" size="small">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Progress
            type="circle"
            percent={utilizationRate}
            format={(percent) => `${percent}%`}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            size={120}
          />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <strong>利用率</strong>
          </div>
        </Col>
        <Col span={12}>
          <Row gutter={[8, 8]}>
            <Col span={24}>
              <Statistic
                title="总时间槽"
                value={total}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={24}>
              <Statistic
                title="可用"
                value={available}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ fontSize: '14px', color: '#52c41a' }}
              />
            </Col>
            <Col span={24}>
              <Statistic
                title="已预订"
                value={booked}
                prefix={<ExclamationCircleOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ fontSize: '14px', color: '#1890ff' }}
              />
            </Col>
            <Col span={24}>
              <Statistic
                title="过期已预定"
                value={expiredBooked}
                prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ fontSize: '14px', color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

export default UtilizationChart;
