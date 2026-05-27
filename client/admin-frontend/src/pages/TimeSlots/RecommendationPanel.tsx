import React, { useEffect, useState } from 'react';
import { Card, List, Progress, Tag, Button, Space, DatePicker, message, Spin } from 'antd';
import { BulbOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { timeSlotService } from '@/services/timeSlots';

const { RangePicker } = DatePicker;

const RecommendationPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().add(1, 'day'),
    dayjs().add(14, 'day'),
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await timeSlotService.getRecommendations({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        limit: 10,
      }) as any;
      const d = res?.data || res;
      setList(Array.isArray(d) ? d : []);
    } catch {
      message.error('获取推荐数据失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#52c41a';
    if (score >= 40) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <Card
      title={
        <Space>
          <BulbOutlined />
          智能推荐时间段
        </Space>
      }
      extra={
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
          />
          <Button type="primary" onClick={fetchData} loading={loading}>刷新推荐</Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>暂无推荐时间段</div>
        ) : (
          <List
            dataSource={list}
            renderItem={(item: any, index: number) => (
              <List.Item
                extra={
                  <Tag color={getScoreColor(item.recommendationScore)} style={{ fontSize: 14, padding: '2px 12px' }}>
                    推荐度 {item.recommendationScore}%
                  </Tag>
                }
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span style={{ fontWeight: 'bold' }}>#{index + 1}</span>
                      <span>{item.date}</span>
                      <Tag color="blue">{item.startTime}-{item.endTime}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 8 }}>{item.reason}</div>
                      <Space size="large">
                        <span>余量: <strong>{item.remainingCapacity}</strong> 单</span>
                        <span>历史利用率: <strong>{item.historicalUtilizationRate}%</strong></span>
                      </Space>
                      <Progress
                        percent={item.recommendationScore}
                        strokeColor={getScoreColor(item.recommendationScore)}
                        size="small"
                        style={{ marginTop: 4, maxWidth: 300 }}
                        format={() => ''}
                      />
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Card>
  );
};

export default RecommendationPanel;
