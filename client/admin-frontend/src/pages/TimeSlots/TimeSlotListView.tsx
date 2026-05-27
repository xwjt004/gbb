import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  message,
  Popconfirm,
  Tag,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  Tooltip,
  Modal,
  Drawer,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  CopyOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { TimeSlot, TimeSlotStatus, TimeSlotSearchParams } from '../../types/timeSlot';
import { timeSlotService } from '../../services/timeSlots';
import TimeSlotForm from './TimeSlotForm';
import CopyTimeSlotModal from './CopyTimeSlotModal';

const { Option } = Select;
const { Search } = Input;
const { RangePicker } = DatePicker;

interface TimeSlotListViewProps {
  onEdit?: (timeSlot: TimeSlot) => void;
  onCopy?: (timeSlot: TimeSlot) => void;
  showFormDrawer?: boolean;
  onCloseForm?: () => void;
  editingSlot?: TimeSlot | null;
  refreshTrigger?: number;
}

const TimeSlotListView: React.FC<TimeSlotListViewProps> = ({
  onEdit,
  onCopy,
  showFormDrawer = false,
  onCloseForm,
  editingSlot,
  refreshTrigger = 0,
}) => {
  const [data, setData] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<TimeSlotSearchParams>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyingSlot, setCopyingSlot] = useState<TimeSlot | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 加载数据
  const loadData = async (params?: any) => {
    setLoading(true);
    try {
      const requestParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...searchParams,
        ...params,
      };

      const response = await timeSlotService.getTimeSlots(requestParams);
      
      if (response.data) {
        setData(response.data.list || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          current: response.data.pagination?.current || 1,
          pageSize: response.data.pagination?.pageSize || 20,
        }));
      } else {
        message.error('加载时间槽数据失败');
      }
    } catch (error) {
      console.error('加载时间槽数据失败:', error);
      message.error('加载时间槽数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和刷新触发
  useEffect(() => {
    loadData();
  }, [pagination.current, pagination.pageSize, refreshTrigger]);

  // 搜索处理
  const handleSearch = (params: TimeSlotSearchParams) => {
    setSearchParams(params);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadData({ ...params, page: 1 });
  };

  // 刷新数据
  const refresh = () => {
    loadData();
  };

  // 删除时间槽
  const handleDelete = async (id: string) => {
    try {
      const response = await timeSlotService.deleteTimeSlot(id);
      if (response.data) {
        message.success('删除成功');
        refresh();
      } else {
        message.error('删除失败');
      }
    } catch (error: any) {
      console.error('删除时间槽失败:', error);
      
      // 处理具体的错误信息
      let errorMessage = '删除失败';
      if (error?.response?.data?.message) {
        const backendMessage = error.response.data.message;
        if (backendMessage.includes('Cannot delete time slot with existing orders')) {
          errorMessage = '无法删除有关联订单的时间槽，请先处理相关订单';
        } else if (backendMessage.includes('not found')) {
          errorMessage = '时间槽不存在';
        } else {
          errorMessage = `删除失败：${backendMessage}`;
        }
      }
      
      message.error(errorMessage);
    }
  };

  // 复制时间槽
  const handleCopy = (timeSlot: TimeSlot) => {
    setCopyingSlot(timeSlot);
    setShowCopyModal(true);
    if (onCopy) {
      onCopy(timeSlot);
    }
  };

  // 批量操作
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的时间槽');
      return;
    }
    
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个时间槽吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          let successCount = 0;
          let failedItems: string[] = [];
          
          for (const id of selectedRowKeys) {
            try {
              await timeSlotService.deleteTimeSlot(id);
              successCount++;
            } catch (error: any) {
              console.error(`删除时间槽 ${id} 失败:`, error);
              
              let errorReason = '未知错误';
              if (error?.response?.data?.message) {
                const backendMessage = error.response.data.message;
                if (backendMessage.includes('Cannot delete time slot with existing orders')) {
                  errorReason = '有关联订单';
                } else if (backendMessage.includes('not found')) {
                  errorReason = '时间槽不存在';
                } else {
                  errorReason = backendMessage;
                }
              }
              
              failedItems.push(`时间槽${id}(${errorReason})`);
            }
          }
          
          if (successCount > 0) {
            message.success(`成功删除 ${successCount} 个时间槽`);
          }
          
          if (failedItems.length > 0) {
            message.error(`以下 ${failedItems.length} 个时间槽删除失败：${failedItems.join('、')}`);
          }
          
          setSelectedRowKeys([]);
          refresh();
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败');
        }
      },
    });
  };

  // 状态标签渲染
  const renderStatusTag = (status: TimeSlotStatus) => {
    const statusConfig = {
      [TimeSlotStatus.AVAILABLE]: { color: 'green', text: '可用' },
      [TimeSlotStatus.BOOKED]: { color: 'blue', text: '已预订' },
      [TimeSlotStatus.UNAVAILABLE]: { color: 'red', text: '不可用' },
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列配置
  const columns: ColumnsType<TimeSlot> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: true,
    },
    {
      title: '时间段',
      key: 'timeRange',
      width: 150,
      render: (_, record) => {
        const formatTime = (timeStr: string) => {
          if (!timeStr) return '';
          
          console.log('格式化时间字符串:', timeStr);
          
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
          
          // 如果是简单的时间格式如 "09:00:00" 或 "09:00"
          if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            if (parts.length >= 2) {
              const hour = parts[0].padStart(2, '0');
              const minute = parts[1].padStart(2, '0');
              return `${hour}:${minute}`;
            }
          }
          
          // 如果以上都不匹配，返回原字符串
          return timeStr;
        };
        
        const startTime = formatTime(record.startTime);
        const endTime = formatTime(record.endTime);
        console.log('格式化后的时间:', { startTime, endTime, original: { start: record.startTime, end: record.endTime } });
        
        return (
          <span>{startTime} - {endTime}</span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderStatusTag,
      filters: [
        { text: '可用', value: TimeSlotStatus.AVAILABLE },
        { text: '已预订', value: TimeSlotStatus.BOOKED },
        { text: '不可用', value: TimeSlotStatus.UNAVAILABLE },
      ],
    },
    {
      title: '容量',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (capacity: number, record) => {
        const bookedCount = record.bookedCount || 0;
        const availableCount = record.availableCount || (capacity - bookedCount);
        return (
          <div>
            <div>{bookedCount} / {capacity}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              剩余: {availableCount}
            </div>
          </div>
        );
      },
    },
    {
      title: '价格倍数',
      dataIndex: 'priceMultiplier',
      key: 'priceMultiplier',
      width: 100,
      render: (priceMultiplier: number) => `${priceMultiplier || 1}倍`,
    },
    {
      title: '假日',
      dataIndex: 'isHoliday',
      key: 'isHoliday',
      width: 80,
      render: (isHoliday: boolean) => isHoliday ? '是' : '否',
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: { showTitle: false },
      render: (notes: string) => (
        <Tooltip placement="topLeft" title={notes}>
          {notes || '-'}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个时间槽吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys as string[]);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  // 筛选表单
  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            style={{ width: '100%' }}
            onChange={(dates) => {
              const params = { ...searchParams };
              if (dates) {
                params.startDate = dates[0]?.format('YYYY-MM-DD');
                params.endDate = dates[1]?.format('YYYY-MM-DD');
              } else {
                delete params.startDate;
                delete params.endDate;
              }
              handleSearch(params);
            }}
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => {
              handleSearch({ ...searchParams, status: value });
            }}
          >
            <Option value={TimeSlotStatus.AVAILABLE}>可用</Option>
            <Option value={TimeSlotStatus.BOOKED}>已预订</Option>
            <Option value={TimeSlotStatus.UNAVAILABLE}>不可用</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="假日筛选"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => {
              handleSearch({ ...searchParams, isHoliday: value });
            }}
          >
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="容量筛选"
            allowClear
            style={{ width: '100%' }}
            onChange={(value) => {
              handleSearch({ ...searchParams, hasCapacity: value });
            }}
          >
            <Option value={true}>有剩余容量</Option>
            <Option value={false}>容量已满</Option>
          </Select>
        </Col>
        <Col span={6}>
          <Search
            placeholder="搜索备注"
            allowClear
            onSearch={(value) => {
              handleSearch({ ...searchParams, notes: value || undefined });
            }}
          />
        </Col>
      </Row>
    </Card>
  );

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? '隐藏筛选' : '显示筛选'}
            </Button>
            <Button
              icon={<SyncOutlined />}
              onClick={refresh}
              loading={loading}
            >
              刷新
            </Button>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
        </div>

        {showFilters && renderFilters()}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          rowSelection={rowSelection}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }));
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 编辑表单抽屉 */}
      <Drawer
        title={editingSlot ? '编辑时间槽' : '新建时间槽'}
        width={600}
        open={showFormDrawer}
        onClose={onCloseForm}
        destroyOnHidden
      >
        {showFormDrawer && (
          <TimeSlotForm
            timeSlot={editingSlot || undefined}
            onSubmit={() => {
              onCloseForm?.();
              refresh();
            }}
            onCancel={() => onCloseForm?.()}
          />
        )}
      </Drawer>

      {/* 复制时间槽模态框 */}
      <CopyTimeSlotModal
        visible={showCopyModal}
        timeSlot={copyingSlot || undefined}
        onCancel={() => {
          setShowCopyModal(false);
          setCopyingSlot(null);
        }}
        onSuccess={() => {
          setShowCopyModal(false);
          setCopyingSlot(null);
          refresh();
        }}
      />
    </div>
  );
};

export default TimeSlotListView;
