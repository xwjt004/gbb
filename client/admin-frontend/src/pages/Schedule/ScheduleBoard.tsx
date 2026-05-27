import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Select, DatePicker, Spin, message, Badge, Radio, Checkbox,
} from 'antd';
import {
  LeftOutlined, RightOutlined, ReloadOutlined, UserOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { scheduleService } from '@/services/scheduleService';

const checkinStatusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待签到', color: 'blue' },
  CHECKED_IN: { label: '已签到', color: 'green' },
  NO_SHOW: { label: '缺席', color: 'red' },
};

const ScheduleBoard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [photographerFilter, setPhotographerFilter] = useState<number | undefined>();
  const [photographers, setPhotographers] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  const fetchPhotographers = async () => {
    try {
      const res = await scheduleService.getPhotographers() as any;
      const d = res?.data || res;
      setPhotographers(Array.isArray(d) ? d : []);
    } catch {
      message.error('获取摄影师列表失败');
    }
  };

  const fetchSchedule = async (date: string) => {
    setLoading(true);
    try {
      let d: any[];
      if (viewMode === 'week') {
        const start = dayjs(date).startOf('week').format('YYYY-MM-DD');
        const end = dayjs(date).endOf('week').format('YYYY-MM-DD');
        const res = await scheduleService.getScheduleBoardRange({ startDate: start, endDate: end, photographerId: photographerFilter }) as any;
        d = res?.data || res;
      } else {
        const res = await scheduleService.getScheduleBoard({ date, photographerId: photographerFilter }) as any;
        d = res?.data || res;
      }
      setScheduleData(Array.isArray(d) ? d : []);
    } catch {
      message.error('获取日程数据失败');
      setScheduleData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPhotographers(); }, []);

  useEffect(() => {
    fetchSchedule(currentDate.format('YYYY-MM-DD'));
  }, [currentDate, photographerFilter, viewMode]);

  const changeDate = (offset: number) => {
    setCurrentDate(prev => viewMode === 'week' ? prev.add(offset, 'week') : prev.add(offset, 'day'));
  };

  const handleAssignPhotographer = async (orderId: string, photographerId: number) => {
    try {
      await scheduleService.assignPhotographer(orderId, photographerId);
      message.success('分配成功');
      fetchSchedule(currentDate.format('YYYY-MM-DD'));
    } catch {
      message.error('分配失败');
    }
  };

  const toggleBatchMode = () => {
    setBatchMode(v => !v);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(orderId);
  };

  const handleDragOver = (e: React.DragEvent, slotId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(slotId);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSlotId: number) => {
    e.preventDefault();
    setDraggingId(null);
    setDropTargetId(null);
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;
    try {
      await scheduleService.rescheduleOrder(orderId, targetSlotId);
      message.success('预约时间已调整');
      fetchSchedule(currentDate.format('YYYY-MM-DD'));
    } catch {
      message.error('调整失败，请检查时间段容量');
    }
  };

  const handleBatchAssign = async (photographerId: number) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await scheduleService.batchAssignPhotographer(ids, photographerId);
      message.success(`已为 ${ids.length} 个订单分配摄影师`);
      setSelectedIds(new Set());
      setBatchMode(false);
      fetchSchedule(currentDate.format('YYYY-MM-DD'));
    } catch {
      message.error('批量分配失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <CalendarOutlined />
            拍摄日程看板
          </Space>
        }
        extra={
          <Space>
            <Button type={batchMode ? 'primary' : 'default'} onClick={toggleBatchMode}>
              {batchMode ? '退出批量' : '批量操作'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchSchedule(currentDate.format('YYYY-MM-DD'))}>刷新</Button>
          </Space>
        }
      >
        {/* Toolbar */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <Radio.Button value="day">日视图</Radio.Button>
                <Radio.Button value="week">周视图</Radio.Button>
              </Radio.Group>
              <Button icon={<LeftOutlined />} onClick={() => changeDate(-1)} />
              <DatePicker value={currentDate} onChange={d => d && setCurrentDate(d)} allowClear={false} />
              <Button icon={<RightOutlined />} onClick={() => changeDate(1)} />
              <Button onClick={() => setCurrentDate(dayjs())}>今天</Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <UserOutlined />
              <Select
                placeholder="全部摄影师"
                allowClear
                style={{ width: 160 }}
                value={photographerFilter}
                onChange={setPhotographerFilter}
                options={photographers.map((p: any) => ({ label: p.nickname || `摄影师#${p.id}`, value: p.id }))}
              />
            </Space>
          </Col>
        </Row>

        {batchMode && selectedIds.size > 0 && (
          <Row justify="space-between" align="middle" style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 6 }}>
            <Col>
              <span style={{ fontWeight: 'bold' }}>已选 {selectedIds.size} 单</span>
            </Col>
            <Col>
              <Space>
                <Select
                  placeholder="选择摄影师"
                  style={{ width: 160 }}
                  onChange={(val) => val && handleBatchAssign(val)}
                  options={photographers.map((p: any) => ({ label: p.nickname || `ID:${p.id}`, value: p.id }))}
                />
                <Button onClick={() => setSelectedIds(new Set())}>取消选择</Button>
              </Space>
            </Col>
          </Row>
        )}

        <Spin spinning={loading}>
          {viewMode === 'week' ? (
            <Row gutter={[8, 8]}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = currentDate.startOf('week').add(i, 'day');
                const dateKey = d.format('YYYY-MM-DD');
                const dayOrders = scheduleData.flatMap((g: any) =>
                  g.orders?.filter((o: any) => {
                    const od = o.appointmentDate ? dayjs(o.appointmentDate).format('YYYY-MM-DD') : '';
                    return od === dateKey;
                  }) || []
                );
                return (
                  <Col span={24 / 7} key={dateKey}>
                    <Card
                      size="small"
                      title={<div style={{ fontSize: 12, textAlign: 'center' }}>{d.format('dd DD')}</div>}
                      style={{ minHeight: 200, background: d.isSame(dayjs(), 'day') ? '#e6f7ff' : undefined }}
                    >
                      {dayOrders.length === 0 ? (
                        <div style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>无预约</div>
                      ) : (
                        dayOrders.map((order: any) => (
                          <div key={order.id} style={{ fontSize: 11, marginBottom: 4, padding: 2, borderLeft: '3px solid #1890ff', paddingLeft: 4 }}>
                            <div>{order.wxUser?.nickname || order.customerName || '未知'}</div>
                            <Tag color={checkinStatusMap[order.checkinStatus]?.color} style={{ fontSize: 10 }}>
                              {checkinStatusMap[order.checkinStatus]?.label}
                            </Tag>
                          </div>
                        ))
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <div>
              {scheduleData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>当日暂无预约</div>
              ) : (
                scheduleData.map((group: any) => {
                  const ts = group.timeSlot;
                  const fmtTime = (v: any) => typeof v === 'string' ? v.slice(11, 16) : v?.toISOString?.()?.slice(11, 16) || '--';
                  const timeLabel = ts
                    ? `${fmtTime(ts.startTime)} - ${fmtTime(ts.endTime)}`
                    : '未分配时间';

                  return (
                    <Card
                      key={ts?.id || Math.random()}
                      size="small"
                      title={
                        <Space>
                          <Badge status="processing" />
                          <span style={{ fontSize: 16, fontWeight: 'bold' }}>{timeLabel}</span>
                          <Tag>{group.orders.length} 单</Tag>
                        </Space>
                      }
                      style={{
                        marginBottom: 8,
                        border: dropTargetId === ts?.id ? '2px dashed #1890ff' : undefined,
                        background: dropTargetId === ts?.id ? '#e6f7ff' : undefined,
                      }}
                      onDragOver={(e) => ts?.id && handleDragOver(e, ts.id)}
                      onDrop={(e) => ts?.id && handleDrop(e, ts.id)}
                      onDragLeave={handleDragLeave}
                    >
                      <Row gutter={[12, 12]}>
                        {group.orders.map((order: any) => (
                          <Col xs={24} sm={12} md={8} lg={6} key={order.id}>
                            <Card
                              size="small"
                              draggable
                              onDragStart={(e) => handleDragStart(e, order.id)}
                              style={{
                                opacity: draggingId === order.id ? 0.4 : 1,
                                cursor: 'grab',
                                borderLeft: `4px solid ${
                                  order.checkinStatus === 'CHECKED_IN' ? '#52c41a'
                                    : order.checkinStatus === 'NO_SHOW' ? '#ff4d4f'
                                      : '#1890ff'
                                }`,
                              }}
                            >
                              {batchMode && (
                                <div style={{ marginBottom: 4 }}>
                                  <Checkbox checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} />
                                </div>
                              )}
                              <div style={{ fontWeight: 'bold' }}>{order.wxUser?.nickname || order.customerName || '未知用户'}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{order.wxUser?.phone || ''}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{order.package?.name || ''}</div>
                              <Space style={{ marginTop: 8 }}>
                                <Tag color={checkinStatusMap[order.checkinStatus]?.color}>
                                  {checkinStatusMap[order.checkinStatus]?.label}
                                </Tag>
                                <Select
                                  size="small"
                                  placeholder="摄影师"
                                  style={{ width: 110 }}
                                  allowClear
                                  value={order.photographerId}
                                  onChange={(val) => val && handleAssignPhotographer(order.id, val)}
                                  options={photographers.map((p: any) => ({
                                    label: p.nickname || `ID:${p.id}`,
                                    value: p.id,
                                  }))}
                                />
                              </Space>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default ScheduleBoard;
