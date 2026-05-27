import React, { useState } from 'react';
import { Card, List, Badge, Avatar, Space, Button, Divider, message, Typography, Tag, Empty } from 'antd';
import { 
  EyeOutlined, 
  ExclamationCircleOutlined, 
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  BellOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface TodoItemProps {
  title: string;
  count: number;
  type: string;
  description?: string;
  urgency?: 'low' | 'medium' | 'high' | 'normal';
  action?: string;
  icon?: React.ReactNode;
}

const TodoPanel: React.FC<{ todoItems: TodoItemProps[] }> = ({ todoItems }) => {
  const navigate = useNavigate();
  const [filterUrgency, setFilterUrgency] = useState<string>('all');

  // 获取紧急事项数量
  const urgentCount = todoItems.filter((item) => item.urgency === 'high' && item.count > 0).length;

  // 根据筛选条件过滤
  const filteredItems = filterUrgency === 'all' 
    ? todoItems 
    : todoItems.filter(item => item.urgency === filterUrgency);

  // 获取图标
  const getIcon = (item: TodoItemProps) => {
    if (item.icon) return item.icon;
    
    switch (item.urgency) {
      case 'high':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'medium':
        return <WarningOutlined style={{ color: '#fa8c16' }} />;
      case 'low':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 获取标题颜色
  const getAvatarColor = (item: TodoItemProps) => {
    if (item.count === 0) return '#d9d9d9';
    
    switch (item.urgency) {
      case 'high':
        return '#ff4d4f';
      case 'medium':
        return '#fa8c16';
      case 'low':
        return '#1890ff';
      default:
        return '#52c41a';
    }
  };

  // 处理点击事件
  const handleAction = (item: TodoItemProps) => {
    switch (item.title) {
      case '待确认订单':
        navigate('/orders?status=pending');
        break;
      case '待处理投诉':
        message.info('投诉管理功能开发中');
        break;
      case '今日新用户':
        navigate('/users?filter=today');
        break;
      case '库存不足套餐':
        message.info('库存管理功能开发中');
        break;
      case '系统维护提醒':
        navigate('/system/maintenance');
        break;
      case '数据备份':
        navigate('/system/backup');
        break;
      default:
        message.info(`处理 ${item.title}`);
    }
  };

  const handleFilterChange = () => {
    const filters = ['all', 'high', 'medium', 'normal'];
    const currentIndex = filters.indexOf(filterUrgency);
    const nextIndex = (currentIndex + 1) % filters.length;
    setFilterUrgency(filters[nextIndex]);
    
    const filterNames: Record<string, string> = {
      all: '全部',
      high: '紧急',
      medium: '中等',
      normal: '普通',
    };
    message.success(`筛选: ${filterNames[filters[nextIndex]]}`);
  };

  return (
    <Card 
      title={(
        <Space>
          <BellOutlined />
          <span>待处理事项</span>
          {urgentCount > 0 && (
            <Badge 
              count={urgentCount} 
              style={{ backgroundColor: '#ff4d4f' }}
            />
          )}
        </Space>
      )} 
      extra={(
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<FilterOutlined />}
            onClick={handleFilterChange}
          >
            筛选
          </Button>
        </Space>
      )}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <List
        itemLayout="horizontal"
        dataSource={filteredItems}
        locale={{
          emptyText: (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无待处理事项"
            />
          )
        }}
        renderItem={(item) => (
          <List.Item 
            style={{ 
              padding: '12px 0',
              opacity: item.count === 0 ? 0.5 : 1,
            }}
            actions={[
              item.count > 0 && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => handleAction(item)}
                >
                  {item.action || '立即处理'}
                </Button>
              ),
              item.urgency === 'high' && item.count > 0 && (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  紧急
                </Tag>
              )
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={
                <Badge count={item.count} overflowCount={99} showZero={false}>
                  <Avatar 
                    style={{ 
                      backgroundColor: getAvatarColor(item),
                    }} 
                    icon={getIcon(item)} 
                  />
                </Badge>
              }
              title={(
                <Space size={4}>
                  <Text 
                    strong={item.count > 0}
                    style={{ 
                      fontSize: 14,
                      color: item.count === 0 ? '#666' : '#e8e8f0',
                    }}
                  >
                    {item.title}
                  </Text>
                </Space>
              )}
              description={(
                <div style={{ marginTop: 4 }}>
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: 12,
                      display: 'block',
                    }}
                  >
                    {item.description}
                  </Text>
                  {item.count > 0 && (
                    <Text 
                      strong 
                      style={{ 
                        color: getAvatarColor(item),
                        fontSize: 12,
                        marginTop: 4,
                        display: 'block',
                      }}
                    >
                      {item.count} 项
                    </Text>
                  )}
                </div>
              )}
            />
          </List.Item>
        )}
      />

      <Divider style={{ margin: '12px 0' }} />
      
      <Space 
        wrap 
        style={{ 
          width: '100%', 
          justifyContent: 'center',
        }}
        size="small"
      >
        <Button 
          type="primary" 
          size="small" 
          icon={<PlusOutlined />}
          onClick={() => message.info('新建任务功能开发中')}
        >
          新建任务
        </Button>
        <Button 
          size="small" 
          icon={<EyeOutlined />}
          onClick={() => navigate('/tasks')}
        >
          查看全部
        </Button>
        <Button 
          size="small" 
          icon={<BellOutlined />}
          onClick={() => message.info('设置提醒功能开发中')}
        >
          设置
        </Button>
      </Space>
    </Card>
  );
};

export default TodoPanel;
