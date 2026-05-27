import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Dropdown,
  Modal,
  message,
  DatePicker,
  Select,
  Switch,
  Tooltip,
  Progress,
  Input,
  Row,
  Col,
  Drawer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ExportOutlined,
  SyncOutlined,
  FilterOutlined,
  CalendarOutlined,
  CopyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { TimeSlot, TimeSlotSearchParams, TimeSlotStatus } from '@/types/timeSlot';
import { timeSlotService } from '@/services/timeSlots';
import TimeSlotForm from './TimeSlotForm';
import StatisticsOverview from './StatisticsOverview';
import CalendarView from './CalendarView';
import CopyTimeSlotModal from './CopyTimeSlotModal';
import BatchCreateModal from './BatchCreateModal';
import { useExport } from '@/hooks/useExport';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

type ViewMode = 'list' | 'calendar' | 'statistics';

const TimeSlotList: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [copyingSlot, setCopyingSlot] = useState<TimeSlot | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useState<TimeSlotSearchParams>({});
  const [showFilters, setShowFilters] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchAction, setBatchAction] = useState<'status' | 'delete' | ''>('');

  const [data, setData] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
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
      
      setData(response.data.list);
      setPagination({
        ...pagination,
        total: response.data.pagination.total,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const refresh = () => {
    loadData();
  };

  // 处理表格变化
  const handleTableChange = (pag: any) => {
    setPagination({
      ...pagination,
      current: pag.current || 1,
      pageSize: pag.pageSize || 20,
    });
    loadData({ page: pag.current, pageSize: pag.pageSize });
  };

  const { exportData, loading: exporting } = useExport();

  // 表格列定义
  const columns: ColumnsType<TimeSlot> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: true,
      render: (date: string) => dayjs(date).format('MM-DD'),
    },
    {
      title: '时间段',
      key: 'timeRange',
      width: 140,
      render: (_, record) => {
        // 从ISO时间字符串中提取时间部分
        const formatTime = (timeStr: string) => {
          if (!timeStr) return '';
          
          // 如果是完整的ISO日期时间字符串
          if (timeStr.includes('T')) {
            try {
              const date = new Date(timeStr);
              if (!isNaN(date.getTime())) {
                // 使用 UTC 时间来避免时区转换问题
                const hours = date.getUTCHours().toString().padStart(2, '0');
                const minutes = date.getUTCMinutes().toString().padStart(2, '0');
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
        
        const startTime = formatTime(record.startTime);
        const endTime = formatTime(record.endTime);
        return (
          <span>
            {startTime} - {endTime}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: [
        { text: '可用', value: TimeSlotStatus.AVAILABLE },
        { text: '已预订', value: TimeSlotStatus.BOOKED },
        { text: '不可用', value: TimeSlotStatus.UNAVAILABLE },
      ],
      render: (status: TimeSlotStatus) => {
        const statusConfig = {
          [TimeSlotStatus.AVAILABLE]: { color: 'green', text: '可用' },
          [TimeSlotStatus.BOOKED]: { color: 'blue', text: '已预订' },
          [TimeSlotStatus.UNAVAILABLE]: { color: 'red', text: '不可用' },
        };
        const config = statusConfig[status] || { color: 'default', text: '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '容量使用',
      key: 'capacity',
      width: 120,
      render: (_, record) => {
        const percentage = record.capacity > 0 ? (record.bookedCount / record.capacity) * 100 : 0;
        return (
          <div>
            <Progress
              percent={percentage}
              size="small"
              format={() => `${record.bookedCount}/${record.capacity}`}
              strokeColor={percentage >= 100 ? '#ff4d4f' : percentage >= 80 ? '#faad14' : '#52c41a'}
            />
          </div>
        );
      },
    },
    {
      title: '价格倍数',
      dataIndex: 'priceMultiplier',
      key: 'priceMultiplier',
      width: 100,
      render: (multiplier: number) => (
        <Tag color={multiplier > 1 ? 'orange' : 'default'}>
          {multiplier}x
        </Tag>
      ),
    },
    {
      title: '节假日',
      dataIndex: 'isHoliday',
      key: 'isHoliday',
      width: 80,
      render: (isHoliday: boolean) => (
        <Tag color={isHoliday ? 'orange' : 'default'}>
          {isHoliday ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'copy',
                  icon: <CopyOutlined />,
                  label: '复制时间槽',
                  onClick: () => handleCopy(record),
                },
                {
                  key: 'delete',
                  icon: <DeleteOutlined />,
                  label: '删除',
                  danger: true,
                  onClick: () => handleDelete(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // 处理搜索
  const handleSearch = (params: TimeSlotSearchParams) => {
    setSearchParams(params);
    loadData(params);
  };

  // 处理新建
  const handleCreate = () => {
    setEditingSlot(null);
    setShowForm(true);
  };

  // 处理编辑
  const handleEdit = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setShowForm(true);
  };

  // 处理删除
  const handleDelete = (slot: TimeSlot) => {
    // 格式化时间显示
    const formatTime = (timeStr: string) => {
      if (!timeStr) return '';
      
      // 如果是完整的ISO日期时间字符串
      if (timeStr.includes('T')) {
        try {
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            // 使用 UTC 时间来避免时区转换问题
            const hours = date.getUTCHours().toString().padStart(2, '0');
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
          }
        } catch (error) {
          console.error('解析ISO时间字符串失败:', error);
        }
      }
      
      if (timeStr.length >= 5 && timeStr.includes(':')) {
        return timeStr.slice(0, 5);
      }
      return timeStr;
    };
    
    const startTime = formatTime(slot.startTime);
    const endTime = formatTime(slot.endTime);
    
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 ${dayjs(slot.date).format('YYYY-MM-DD')} ${startTime}-${endTime} 的时间槽吗？`,
      onOk: async () => {
        try {
          await timeSlotService.deleteTimeSlot(slot.id);
          message.success('删除成功');
          refresh();
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
      },
    });
  };

  // 处理复制
  const handleCopy = (slot: TimeSlot) => {
    setCopyingSlot(slot);
    setShowCopyModal(true);
  };

  // 处理表单提交
  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingSlot(null);
    refresh();
  };

  // 处理批量操作
  const handleBatchAction = (action: 'status' | 'delete') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要操作的时间槽');
      return;
    }
    setBatchAction(action);
    setBatchModalVisible(true);
  };

  // 确认批量操作
  const handleBatchConfirm = async (values?: any) => {
    try {
      if (batchAction === 'status' && values?.status) {
        await timeSlotService.batchUpdateStatus({
          ids: selectedRowKeys,
          status: values.status,
        });
        message.success('批量更新状态成功');
      } else if (batchAction === 'delete') {
        await timeSlotService.batchDeleteTimeSlots(selectedRowKeys.map(Number));
        message.success('批量删除成功');
      }
      setBatchModalVisible(false);
      setSelectedRowKeys([]);
      refresh();
    } catch (error: any) {
      console.error('批量操作失败:', error);
      
      // 处理具体的错误信息
      let errorMessage = '批量操作失败';
      if (error?.response?.data?.message) {
        const backendMessage = error.response.data.message;
        if (backendMessage.includes('Cannot delete time slots with bookings')) {
          errorMessage = '无法删除有预订的时间槽，请先处理相关订单';
        } else if (backendMessage.includes('Cannot delete time slot with existing orders')) {
          errorMessage = '无法删除有关联订单的时间槽，请先处理相关订单';
        } else {
          errorMessage = `操作失败：${backendMessage}`;
        }
      }
      
      message.error(errorMessage);
    }
  };

  // 处理导出
  const handleExport = async () => {
    try {
      await exportData(
        data,
        'xlsx',
        `时间槽数据_${dayjs().format('YYYY-MM-DD')}`
      );
    } catch (error) {
      message.error('导出失败');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  // 渲染筛选器
  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={(dates) => {
              handleSearch({
                ...searchParams,
                startDate: dates?.[0]?.format('YYYY-MM-DD'),
                endDate: dates?.[1]?.format('YYYY-MM-DD'),
              });
            }}
          />
        </Col>
        <Col span={4}>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: '100%' }}
            onChange={(status) => handleSearch({ ...searchParams, status })}
          >
            <Option value={TimeSlotStatus.AVAILABLE}>可用</Option>
            <Option value={TimeSlotStatus.BOOKED}>已预订</Option>
            <Option value={TimeSlotStatus.UNAVAILABLE}>不可用</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            placeholder="节假日"
            allowClear
            style={{ width: '100%' }}
            onChange={(isHoliday) => {
              handleSearch({ ...searchParams, isHoliday });
            }}
          >
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
        </Col>
        <Col span={4}>
          <div>
            <span style={{ marginRight: 8 }}>有余量:</span>
            <Switch
              checkedChildren="是"
              unCheckedChildren="否"
              onChange={(checked) => {
                handleSearch({ ...searchParams, hasCapacity: checked || undefined });
              }}
            />
          </div>
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

  // 根据视图模式渲染内容
  const renderContent = () => {
    if (viewMode === 'statistics') {
      return <StatisticsOverview />;
    }
    
    if (viewMode === 'calendar') {
      return <CalendarView onRefresh={refresh} />;
    }

    return (
      <>
        {showFilters && renderFilters()}
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
          }}
          onChange={handleTableChange}
          rowSelection={rowSelection}
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
        />
      </>
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <Card
        title="时间槽管理"
        extra={
          <Space>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              列表视图
            </Button>
            <Button
              type={viewMode === 'calendar' ? 'primary' : 'default'}
              icon={<CalendarOutlined />}
              onClick={() => setViewMode('calendar')}
            >
              日历视图
            </Button>
            <Button
              type={viewMode === 'statistics' ? 'primary' : 'default'}
              onClick={() => setViewMode('statistics')}
            >
              统计概览
            </Button>
          </Space>
        }
      >
        {viewMode === 'list' && (
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                新建时间槽
              </Button>
              
              <Button
                icon={<PlusOutlined />}
                onClick={() => setShowBatchModal(true)}
              >
                批量创建
              </Button>
              
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '隐藏筛选' : '显示筛选'}
              </Button>

              <Button
                icon={<SyncOutlined />}
                onClick={() => refresh()}
                loading={loading}
              >
                刷新
              </Button>

              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    icon={<TeamOutlined />}
                    onClick={() => handleBatchAction('status')}
                  >
                    批量更新状态
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleBatchAction('delete')}
                  >
                    批量删除
                  </Button>
                </>
              )}

              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                loading={exporting}
              >
                导出
              </Button>
            </Space>
          </div>
        )}

        {renderContent()}
      </Card>

      {/* 时间槽表单 */}
      <Drawer
        title={editingSlot ? '编辑时间槽' : '新建时间槽'}
        width={600}
        open={showForm}
        onClose={() => setShowForm(false)}
        destroyOnHidden={true}
      >
        <TimeSlotForm
          timeSlot={editingSlot || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Drawer>

      {/* 批量操作弹窗 */}
      <Modal
        title={`批量${batchAction === 'status' ? '更新状态' : '删除'}`}
        open={batchModalVisible}
        onCancel={() => setBatchModalVisible(false)}
        onOk={() => {
          if (batchAction === 'delete') {
            handleBatchConfirm({});
          }
        }}
        okButtonProps={{ danger: batchAction === 'delete' }}
      >
        {batchAction === 'status' ? (
          <div>
            <p>选中 {selectedRowKeys.length} 个时间槽，请选择要更新的状态：</p>
            <Select
              style={{ width: 200 }}
              placeholder="选择状态"
              onChange={(status) => handleBatchConfirm({ status })}
            >
              <Option value={TimeSlotStatus.AVAILABLE}>可用</Option>
              <Option value={TimeSlotStatus.BOOKED}>已预订</Option>
              <Option value={TimeSlotStatus.UNAVAILABLE}>不可用</Option>
            </Select>
          </div>
        ) : (
          <p>确定要删除选中的 {selectedRowKeys.length} 个时间槽吗？此操作不可恢复。</p>
        )}
      </Modal>

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

      {/* 批量创建模态框 */}
      <BatchCreateModal
        visible={showBatchModal}
        onCancel={() => setShowBatchModal(false)}
        onSubmit={() => {
          setShowBatchModal(false);
          refresh();
        }}
      />
    </div>
  );
};

export default TimeSlotList;
