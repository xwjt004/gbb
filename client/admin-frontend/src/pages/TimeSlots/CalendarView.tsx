import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Card, Modal, Button, Space, Tag, Alert } from 'antd';
import { CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { TimeSlot, TimeSlotStatus } from '@/types/timeSlot';
import { timeSlotService } from '@/services/timeSlots';

interface CalendarData {
  [key: string]: TimeSlot[];
}

interface CalendarViewProps {
  onSlotSelect?: (slot: TimeSlot) => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
}

const CalendarView: React.FC<CalendarViewProps> = ({ refreshTrigger, onRefresh }) => {
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // 加载日历数据
  const loadCalendarData = async (date: Dayjs) => {
    setLoading(true);
    try {
      const year = date.year();
      const month = date.month() + 1;
      console.log(`加载日历数据: ${year}年${month}月`);
      
      const data = await timeSlotService.getCalendarData({ year, month });
      console.log('日历数据加载成功:', data.data);
      
      setCalendarData(data.data || {});
      
      // 通知父组件刷新统计数据
      onRefresh?.();
    } catch (error) {
      console.error('加载日历数据失败:', error);
      // 数据加载失败时显示空数据而不是模拟数据
      setCalendarData({});
    } finally {
      setLoading(false);
    }
  };



  // 日期单元格渲染
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const slots = calendarData[dateStr] || [];
    
    if (slots.length === 0) return null;

    // 计算总的可用容量和状态统计
    const totalAvailable = slots.reduce((sum, slot) => {
      return sum + (slot.availableCount || 0);
    }, 0);

    const statusCounts = slots.reduce((acc, slot) => {
      const status = slot.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 获取可用时间段信息
    const availableTimeSlots = slots.filter(slot => 
      slot.status === TimeSlotStatus.AVAILABLE && (slot.availableCount || 0) > 0
    );

    // 安全的时间格式化函数
    const formatTimeForCalendar = (timeStr: string) => {
      if (!timeStr) return '未设置';
      
      // 如果是完整的ISO日期时间字符串
      if (timeStr.includes('T')) {
        try {
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            // 获取 UTC 时间并转换为北京时间（UTC+8）
            const utcHours = date.getUTCHours();
            const utcMinutes = date.getUTCMinutes();
            
            // 加 8 小时转换为北京时间
            let bjHours = utcHours + 8;
            let bjMinutes = utcMinutes;
            
            // 处理跨天情况
            if (bjHours >= 24) {
              bjHours -= 24;
            }
            
            const hours = bjHours.toString().padStart(2, '0');
            const minutes = bjMinutes.toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        } catch (error) {
          console.error('解析ISO时间字符串失败:', error);
        }
      }
      
      // 简单截取前5位字符来显示 HH:mm 格式
      if (timeStr.length >= 5 && timeStr.includes(':')) {
        return timeStr.slice(0, 5);
      }
      return timeStr;
    };

    return (
      <div style={{ margin: 0, padding: 2, fontSize: '10px', lineHeight: '1.2' }}>
        {/* 可用时间段显示 */}
        {availableTimeSlots.length > 0 && (
          <div style={{ marginBottom: 2 }}>
            <div style={{ color: '#1890ff', fontWeight: 'bold', marginBottom: 1 }}>
              ⏰ 可约时间 {availableTimeSlots.length} 个，
            </div>
            <div style={{ color: '#666', fontSize: '15px', lineHeight: '1.1' }}>
              {availableTimeSlots.map(slot => 
                `${formatTimeForCalendar(slot.startTime)}-${formatTimeForCalendar(slot.endTime)}`
              ).join('；')}
            </div>
          </div>
        )}
        
        {/* 其他统计信息 */}
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {totalAvailable > 0 && (
            <li>
              <Badge status="success" text={`可订 ${totalAvailable}个`} />
            </li>
          )}
          {statusCounts[TimeSlotStatus.BOOKED] && (
            <li>
              <Badge status="error" text={`已满 ${statusCounts[TimeSlotStatus.BOOKED]}个`} />
            </li>
          )}
        </ul>
      </div>
    );
  };

  // 日期选择处理
  const handleDateSelect = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const slots = calendarData[dateStr] || [];
    setSelectedDate(value);
    setSelectedSlots(slots);
    setShowSlotModal(true);
    setConflictLoading(true);
    timeSlotService.getConflictAnalysis(dateStr).then((res: any) => {
      const d = res?.data || res;
      setConflictData(d?.conflicts ? d : null);
    }).catch(() => setConflictData(null)).finally(() => setConflictLoading(false));
  };

  // 面板切换处理
  const handlePanelChange = (value: Dayjs) => {
    console.log('面板切换到:', value.format('YYYY-MM'));
    setSelectedDate(value);
    loadCalendarData(value);
  };

  // 手动刷新当前月份数据
  const handleRefresh = () => {
    console.log('手动刷新日历数据');
    loadCalendarData(selectedDate);
  };

  // 获取状态颜色
  const getStatusColor = (status: TimeSlotStatus) => {
    switch (status) {
      case TimeSlotStatus.AVAILABLE:
        return 'green';
      case TimeSlotStatus.BOOKED:
        return 'red';
      case TimeSlotStatus.UNAVAILABLE:
        return 'orange';
      default:
        return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: TimeSlotStatus) => {
    switch (status) {
      case TimeSlotStatus.AVAILABLE:
        return '可用';
      case TimeSlotStatus.BOOKED:
        return '已满';
      case TimeSlotStatus.UNAVAILABLE:
        return '不可用';
      default:
        return '未知';
    }
  };

  // 初始化加载数据
  useEffect(() => {
    loadCalendarData(selectedDate);
  }, []);

  // 当refreshTrigger变化时重新加载数据
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('收到刷新触发器，重新加载日历数据:', refreshTrigger);
      loadCalendarData(selectedDate);
    }
  }, [refreshTrigger, selectedDate]);

  return (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          时间槽日历视图
        </Space>
      }
      loading={loading}
      extra={
        <Space>
          <div style={{ color: '#666', fontSize: '14px' }}>
            点击日期查看详细时间槽信息
          </div>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            title="刷新日历数据"
          >
            刷新
          </Button>
        </Space>
      }
    >
      <Calendar
        cellRender={(current, info) => {
          if (info.type === 'date') {
            return dateCellRender(current);
          }
          return null;
        }}
        onSelect={handleDateSelect}
        onPanelChange={handlePanelChange}
      />

      {/* 日期时间槽详情弹窗 - 只显示，不提供创建功能 */}
      <Modal
        title={`${selectedDate.format('YYYY年MM月DD日')} 时间槽详情`}
        open={showSlotModal}
        onCancel={() => setShowSlotModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowSlotModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }} />
            <div>当日暂无时间槽</div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>
              可在列表视图或通过顶部按钮创建时间槽
            </div>
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 容量预警 */}
            {conflictLoading && <div style={{ color: '#999' }}>加载容量预警...</div>}
            {conflictData?.conflicts?.length > 0 && (
              <div>
                {conflictData.conflicts.map((c: any, idx: number) => (
                  <Alert
                    key={idx}
                    type={c.severity === 'ERROR' ? 'error' : c.severity === 'WARNING' ? 'warning' : 'info'}
                    message={`${c.startTime}-${c.endTime}: ${c.message}`}
                    style={{ marginBottom: 4, fontSize: 12 }}
                    showIcon
                    closable
                  />
                ))}
              </div>
            )}
            {/* 预约订单情况概览 */}
            <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
              <div>
                {(() => {
                  const dateDisplay = selectedDate.format('M月DD日');
                  const totalSlots = selectedSlots.length;
                  const totalAvailable = selectedSlots.reduce((sum, slot) => {
                    return sum + (slot.availableCount || 0);
                  }, 0);
                  
                  // 获取可用时间段信息
                  const availableTimeSlots = selectedSlots.filter(slot => 
                    slot.status === TimeSlotStatus.AVAILABLE && (slot.availableCount || 0) > 0
                  );
                  
                  // 获取售空时间段信息
                  const fullyBookedTimeSlots = selectedSlots.filter(slot => 
                    slot.status === TimeSlotStatus.BOOKED || (slot.availableCount || 0) === 0
                  );
                  
                  // 安全的时间格式化函数
                  const formatTimeForDisplay = (timeStr: string) => {
                    if (!timeStr) return '未设置';
                    
                    // 如果是完整的ISO日期时间字符串
                    if (timeStr.includes('T')) {
                      try {
                        const date = new Date(timeStr);
                        if (!isNaN(date.getTime())) {
                          // 获取 UTC 时间并转换为北京时间（UTC+8）
                          const utcHours = date.getUTCHours();
                          const utcMinutes = date.getUTCMinutes();
                          
                          // 加 8 小时转换为北京时间
                          let bjHours = utcHours + 8;
                          let bjMinutes = utcMinutes;
                          
                          // 处理跨天情况
                          if (bjHours >= 24) {
                            bjHours -= 24;
                          }
                          
                          const hours = bjHours.toString().padStart(2, '0');
                          const minutes = bjMinutes.toString().padStart(2, '0');
                          return `${hours}:${minutes}`;
                        }
                      } catch (error) {
                        console.error('解析ISO时间字符串失败:', error);
                      }
                    }
                    
                    // 简单截取前5位字符来显示 HH:mm 格式
                    if (timeStr.length >= 5 && timeStr.includes(':')) {
                      return timeStr.slice(0, 5);
                    }
                    return timeStr;
                  };
                  
                  return (
                    <div>
                      <div style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                        📅 {dateDisplay}的预约时间与订单情况概览
                      </div>
                      
                      {availableTimeSlots.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ marginBottom: '4px' }}>
                            ⏰ 可用时间段 <strong style={{ color: '#1890ff' }}>{availableTimeSlots.length}</strong> 个，
                          </div>
                          <div style={{ marginLeft: '16px', color: '#666', fontSize: '13px', marginBottom: '4px' }}>
                            {availableTimeSlots.map(slot => 
                              `${formatTimeForDisplay(slot.startTime)}-${formatTimeForDisplay(slot.endTime)}余${slot.availableCount || 0}单`
                            ).join('；')}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginBottom: '8px' }}>
                        🟢 可用订单 <strong style={{ color: '#52c41a' }}>{totalAvailable}</strong> 个；
                      </div>
                      
                      {fullyBookedTimeSlots.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          🔴 售空{fullyBookedTimeSlots.map(slot => 
                            `${formatTimeForDisplay(slot.startTime)}-${formatTimeForDisplay(slot.endTime)}`
                          ).join('；')}预约订单 
                        </div>
                      )}
                      
                      <div>
                        📊 共<strong>{totalSlots}</strong>个预约时间段；
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
            
            {selectedSlots.map((slot) => {
              // 安全的时间格式化函数
              const formatTime = (timeStr: string) => {
                if (!timeStr) return '未设置';
                
                // 如果是完整的ISO日期时间字符串
                if (timeStr.includes('T')) {
                  try {
                    const date = new Date(timeStr);
                    if (!isNaN(date.getTime())) {
                      // 获取 UTC 时间并转换为北京时间（UTC+8）
                      const utcHours = date.getUTCHours();
                      const utcMinutes = date.getUTCMinutes();
                      
                      // 加 8 小时转换为北京时间
                      let bjHours = utcHours + 8;
                      let bjMinutes = utcMinutes;
                      
                      // 处理跨天情况
                      if (bjHours >= 24) {
                        bjHours -= 24;
                      }
                      
                      const hours = bjHours.toString().padStart(2, '0');
                      const minutes = bjMinutes.toString().padStart(2, '0');
                      return `${hours}:${minutes}`;
                    }
                  } catch (error) {
                    console.error('解析ISO时间字符串失败:', error);
                  }
                }
                
                // 简单截取前5位字符来显示 HH:mm 格式
                if (timeStr.length >= 5 && timeStr.includes(':')) {
                  return timeStr.slice(0, 5);
                }
                return timeStr;
              };
              
              return (
                <Card
                  key={slot.id}
                  size="small"
                  title={
                    <Space>
                      <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                      <Tag color={getStatusColor(slot.status)}>
                        {getStatusText(slot.status)}
                      </Tag>
                      {slot.isHoliday && <Tag color="orange">节假日</Tag>}
                    </Space>
                  }
                >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <span style={{ marginRight: 16 }}>
                      总容量: <strong>{slot.capacity}</strong>
                    </span>
                    <span style={{ marginRight: 16 }}>
                      已预订: <strong style={{ color: '#fa8c16' }}>{slot.bookedCount}</strong>
                    </span>
                    <span>
                      可用: <strong style={{ color: '#52c41a' }}>{slot.availableCount}</strong>
                    </span>
                  </div>
                  {slot.priceMultiplier !== 1 && (
                    <div>
                      价格倍数: <Tag color="blue">{slot.priceMultiplier}x</Tag>
                    </div>
                  )}
                  {slot.notes && (
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      备注: {slot.notes}
                    </div>
                  )}
                </Space>
              </Card>
            );
            })}
          </Space>
        )}
      </Modal>
    </Card>
  );
};

export default CalendarView;
