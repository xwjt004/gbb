import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Spin } from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { timeSlotService } from '@/services/timeSlots';
import UtilizationChart from './UtilizationChart';

const { RangePicker } = DatePicker;

interface TimeSlotStatistics {
  totalSlots: number;          // 从明天到未来已设定的时间槽总数
  availableSlots: number;       // 可用时间槽 = 总时间槽 - 已预定时间槽
  bookedSlots: number;          // 已预定时间槽(未来客户订单消耗的时间槽)
  expiredBookedSlots: number;   // 过期已预定：从历史到今天（包括今天）曾被客户预定过的时间槽
  totalCapacity: number;        // 总容量
  totalBooked: number;          // 已预订人数
  utilizationRate: number;      // 容量利用率
  averageBookingRate: number;   // 时间槽预订率
}

interface StatisticsOverviewProps {
  onDateRangeChange?: (startDate?: string, endDate?: string) => void;
}

export interface StatisticsOverviewRef {
  refresh: () => void;
}

const StatisticsOverview = forwardRef<StatisticsOverviewRef, StatisticsOverviewProps>(({ onDateRangeChange }, ref) => {
  const [statistics, setStatistics] = useState<TimeSlotStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const loadStatistics = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      console.log('加载统计数据，日期范围:', { startDate, endDate });
      const data = await timeSlotService.getStatistics(startDate, endDate);
      console.log('获取到的统计数据:', data);
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      // 如果API调用失败，设置为null以显示错误状态
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates: any) => {
    const dayjsDates = dates as [dayjs.Dayjs, dayjs.Dayjs] | null;
    setDateRange(dayjsDates);
    const startDate = dayjsDates?.[0]?.format('YYYY-MM-DD');
    const endDate = dayjsDates?.[1]?.format('YYYY-MM-DD');
    loadStatistics(startDate, endDate);
    onDateRangeChange?.(startDate, endDate);
  };

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: () => {
      const currentDateRange = dateRange;
      if (currentDateRange && currentDateRange.length === 2) {
        loadStatistics(currentDateRange[0].format('YYYY-MM-DD'), currentDateRange[1].format('YYYY-MM-DD'));
      } else {
        // 如果没有日期范围，加载所有未来时间槽
        loadStatistics(undefined, undefined);
      }
    }
  }));

  useEffect(() => {
    // 默认加载所有未来时间槽的统计数据（不限制日期范围）
    // 这样可以统计到所有已设定的未来时间槽
    loadStatistics(undefined, undefined);
  }, []);

  if (loading && !statistics) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!loading && !statistics) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>暂无统计数据</p>
          <button onClick={() => loadStatistics()}>重新加载</button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          时间槽统计概览
        </Space>
      }
      extra={
        <RangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder={['开始日期', '结束日期']}
          allowClear
        />
      }
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {/* 时间槽统计 */}
          <Col span={24}>
            <Card size="small" title="时间槽统计" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#f6ffed' }}>
                    <Statistic
                      title="总时间槽"
                      value={statistics?.totalSlots || 0}
                      prefix={<CalendarOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      从明天到未来
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#e6f7ff' }}>
                    <Statistic
                      title="可用时间槽"
                      value={statistics?.availableSlots || 0}
                      prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      未被预订的槽位
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#fff7e6' }}>
                    <Statistic
                      title="已预订时间槽"
                      value={statistics?.bookedSlots || 0}
                      prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
                      valueStyle={{ color: '#fa8c16' }}
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      客户已预订
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#fff2f0' }}>
                    <Statistic
                      title="过期已预定"
                      value={statistics?.expiredBookedSlots || 0}
                      prefix={<StopOutlined style={{ color: '#ff4d4f' }} />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      历史至今天
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 容量统计 */}
          <Col span={24}>
            <Card size="small" title="容量统计">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#f6ffed' }}>
                    <Statistic
                      title="总容量"
                      value={statistics?.totalCapacity || 0}
                      prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
                      valueStyle={{ color: '#52c41a' }}
                      suffix="位"
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      可接待总人数
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#e6f7ff' }}>
                    <Statistic
                      title="剩余容量"
                      value={(statistics?.totalCapacity || 0) - (statistics?.totalBooked || 0)}
                      prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                      valueStyle={{ color: '#1890ff' }}
                      suffix="位"
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      还可接待人数
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#fff7e6' }}>
                    <Statistic
                      title="已预订人数"
                      value={statistics?.totalBooked || 0}
                      prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
                      valueStyle={{ color: '#fa8c16' }}
                      suffix="位"
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      客户已占用
                    </div>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" variant="borderless" style={{ backgroundColor: '#f0f5ff' }}>
                    <Statistic
                      title="容量利用率"
                      value={statistics?.utilizationRate || 0}
                      precision={2}
                      suffix="%"
                      prefix={<TeamOutlined style={{ color: '#597ef7' }} />}
                      valueStyle={{ color: '#597ef7' }}
                    />
                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                      已预订 / 总容量
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* 利用率图表 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <UtilizationChart
              data={{
                total: statistics?.totalSlots || 0,
                available: statistics?.availableSlots || 0,
                booked: statistics?.bookedSlots || 0,
                expiredBooked: statistics?.expiredBookedSlots || 0,
                utilizationRate: statistics?.utilizationRate || 0,
              }}
            />
          </Col>
        </Row>
      </Spin>
    </Card>
  );
});

StatisticsOverview.displayName = 'StatisticsOverview';

export default StatisticsOverview;
