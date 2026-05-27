import React, { useState, useRef } from 'react';
import { Card, Tabs, Space, Button, Drawer } from 'antd';
import {
  CalendarOutlined,
  TableOutlined,
  FundOutlined,
  BulbOutlined,
  PlusOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import CalendarView from './CalendarView';
import TimeSlotListView from './TimeSlotListView';
import StatisticsOverview from './StatisticsOverview';
import RecommendationPanel from './RecommendationPanel';
import TimeSlotForm from './TimeSlotForm';
import BatchCreateModal from './BatchCreateModal';
import type { TimeSlot } from '../../types/timeSlot';

interface TimeSlotsPageProps {}

const TimeSlotsPage: React.FC<TimeSlotsPageProps> = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
  const [batchCreateDrawerVisible, setBatchCreateDrawerVisible] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 添加对统计组件的引用
  const statisticsRef = useRef<{ refresh: () => void }>(null);

  const handleCreateTimeSlot = () => {
    setEditingTimeSlot(null);
    setCreateDrawerVisible(true);
  };

  const handleBatchCreate = () => {
    setBatchCreateDrawerVisible(true);
  };

  const handleTimeSlotCreated = () => {
    setCreateDrawerVisible(false);
    setBatchCreateDrawerVisible(false);
    // 刷新统计数据和列表数据
    statisticsRef.current?.refresh();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormSubmit = () => {
    handleTimeSlotCreated();
  };

  const handleFormCancel = () => {
    setCreateDrawerVisible(false);
  };

  const extraActions = (
    <Space>
      <Button 
        type="primary" 
        icon={<PlusOutlined />}
        onClick={handleCreateTimeSlot}
      >
        新建时间槽
      </Button>
      <Button 
        icon={<AppstoreAddOutlined />}
        onClick={handleBatchCreate}
      >
        批量创建
      </Button>
    </Space>
  );

  const tabItems = [
    {
      key: 'statistics',
      label: (
        <span>
          <FundOutlined />
          统计概览
        </span>
      ),
      children: <StatisticsOverview ref={statisticsRef} />,
    },
    {
      key: 'calendar',
      label: (
        <span>
          <CalendarOutlined />
          日历视图
        </span>
      ),
      children: <CalendarView 
        refreshTrigger={refreshTrigger} 
        onRefresh={() => statisticsRef.current?.refresh()}
      />,
    },
    {
      key: 'list',
      label: (
        <span>
          <TableOutlined />
          列表视图
        </span>
      ),
      children: <TimeSlotListView
        showFormDrawer={createDrawerVisible}
        onCloseForm={() => setCreateDrawerVisible(false)}
        editingSlot={editingTimeSlot}
        refreshTrigger={refreshTrigger}
        onEdit={(timeSlot) => {
          console.log('index.tsx onEdit 被调用，timeSlot:', timeSlot);
          setEditingTimeSlot(timeSlot);
          setCreateDrawerVisible(true);
          console.log('设置 editingTimeSlot 和 createDrawerVisible 完成');
        }}
      />,
    },
    {
      key: 'recommendations',
      label: (
        <span>
          <BulbOutlined />
          智能推荐
        </span>
      ),
      children: <RecommendationPanel />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="时间槽管理"
        extra={extraActions}
        style={{ minHeight: 'calc(100vh - 100px)' }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          items={tabItems}
        />
      </Card>

      {/* 创建/编辑时间槽抽屉 */}
      <Drawer
        title={editingTimeSlot ? "编辑时间槽" : "新建时间槽"}
        width={600}
        open={createDrawerVisible}
        onClose={() => setCreateDrawerVisible(false)}
        destroyOnHidden
      >
        <TimeSlotForm
          timeSlot={editingTimeSlot || undefined}
          onCancel={handleFormCancel}
          onSubmit={handleFormSubmit}
        />
      </Drawer>

      {/* 批量创建时间槽模态框 */}
      <BatchCreateModal
        visible={batchCreateDrawerVisible}
        onCancel={() => setBatchCreateDrawerVisible(false)}
        onSubmit={handleTimeSlotCreated}
      />
    </div>
  );
};

export default TimeSlotsPage;
