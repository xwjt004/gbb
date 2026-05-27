import React from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface KpiCardData {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface KpiCardsProps {
  data: KpiCardData[];
}

const KpiCards: React.FC<KpiCardsProps> = ({ data }) => {
  return (
    <Row gutter={[16, 16]}>
      {data.map((item, index) => (
        <Col xs={24} sm={12} lg={6} key={index}>
          <Card
            hoverable={!!item.onClick}
            onClick={item.onClick}
            style={{ cursor: item.onClick ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Statistic
                title={item.title}
                value={item.value}
                precision={item.title.includes('率') ? 1 : 0}
                suffix={item.suffix}
                prefix={item.prefix}
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
              <div style={{ fontSize: 24, color: '#bfbfbf' }}>{item.icon}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              {item.change >= 0 ? (
                <Text type="success" style={{ fontSize: 13 }}>
                  <ArrowUpOutlined /> {item.change}% {item.changeLabel}
                </Text>
              ) : (
                <Text type="danger" style={{ fontSize: 13 }}>
                  <ArrowDownOutlined /> {Math.abs(item.change)}% {item.changeLabel}
                </Text>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export type { KpiCardData };
export default KpiCards;
