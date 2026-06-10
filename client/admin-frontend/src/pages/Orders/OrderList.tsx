import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
  message,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Dropdown,
} from 'antd';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  PlusOutlined,
  ExportOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Order, OrderSearchParams, OrderStatus } from '@/types/order';
import { orderService } from '@/services/orders';
import { exportService } from '@/services/export';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchOrders, fetchOrderStats, updateOrderStatus, setSearchParams, setPagination } from '@/store/orderSlice';
import OrderDetail from './OrderDetail';
import OrderForm from './OrderForm';
import PageContainer from '@/components/PageContainer';

const { Option } = Select;
const { RangePicker } = DatePicker;

// 格式化时间函数
const formatTime = (timeString: string) => {
  if (!timeString) return '';
  // 从 "1970-01-01T09:00:00.000Z" 格式中提取时间部分
  const date = new Date(timeString);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

const OrderList: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | undefined>();
  const [searchValues, setSearchValues] = useState<OrderSearchParams>({});

  const dispatch = useAppDispatch();
  const { orders, loading, pagination, searchParams, stats } = useAppSelector((state) => state.order);

  // 使用 useMemo 来稳定对象引用，避免无限循环
  const stablePagination = useMemo(() => pagination, [pagination.current, pagination.pageSize, pagination.total]);
  const stableSearchParams = useMemo(() => searchParams, [JSON.stringify(searchParams)]);

  useEffect(() => {
    dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
    dispatch(fetchOrderStats());
  }, [dispatch, stablePagination, stableSearchParams]);

  // 状态标签配置
  const statusConfig = {
    [OrderStatus.PENDING]: { color: 'orange', text: '待确认' },
    [OrderStatus.CONFIRMED]: { color: 'blue', text: '已确认' },
    [OrderStatus.REJECTED]: { color: 'red', text: '已拒绝' },
    [OrderStatus.IN_PROGRESS]: { color: 'processing', text: '进行中' },
    [OrderStatus.COMPLETED]: { color: 'green', text: '已完成' },
    [OrderStatus.CANCELLED]: { color: 'red', text: '已取消' },
  };

  // 表格列定义
  const columns: ColumnsType<Order> = [
    {
      title: '订单信息',
      key: 'orderInfo',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
            {record.orderNo}
          </div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {new Date(record.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      title: '客户信息',
      key: 'customerInfo',
      width: 150,
      render: (_, record) => (
        <div>
          <div>{record.customerName || record.user?.nickname || '未设置'}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {record.customerPhone || '-'}
          </div>
        </div>
      ),
    },
    {
      title: '操作人员',
      key: 'staffInfo',
      width: 120,
      render: (_, record) => (
        <div style={{ color: '#999', fontSize: '12px' }}>
          {record.user?.nickname || '-'}
        </div>
      ),
    },
    {
      title: '套餐信息',
      dataIndex: ['package', 'name'],
      width: 180,
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            ¥{Number(record.totalAmount || 0).toFixed(2)}
          </div>
        </div>
      ),
    },
    {
      title: '预约时间',
      dataIndex: ['timeSlot'],
      width: 150,
      render: (timeSlot) => timeSlot ? (
        <div>
          <div>{new Date(timeSlot.date).toLocaleDateString()}</div>
          <div style={{ color: '#666', fontSize: '12px' }}>
            {formatTime(timeSlot.startTime)}-{formatTime(timeSlot.endTime)}
          </div>
        </div>
      ) : '-',
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      width: 100,
      render: (status: string) => {
        // 将后端返回的状态转换为前端枚举
        const statusMap: { [key: string]: OrderStatus } = {
          'PENDING': OrderStatus.PENDING,
          'CONFIRMED': OrderStatus.CONFIRMED,
          'REJECTED': OrderStatus.REJECTED,
          'COMPLETED': OrderStatus.COMPLETED,
          'CANCELLED': OrderStatus.CANCELLED,
          'IN_PROGRESS': OrderStatus.IN_PROGRESS,
        };
        const mappedStatus = statusMap[status] || OrderStatus.PENDING;
        const config = statusConfig[mappedStatus];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      width: 100,
      render: (status: string) => {
        const paymentConfig: { [key: string]: { color: string; text: string } } = {
          'PENDING_PAYMENT': { color: 'orange', text: '待支付' },
          'PARTIAL_PAID': { color: 'blue', text: '部分支付' },
          'FULLY_PAID': { color: 'green', text: '已支付' },
          'PAID': { color: 'green', text: '已支付' },
          'FAILED': { color: 'red', text: '支付失败' },
          'REFUNDING': { color: 'orange', text: '退款中' },
          'REFUNDED': { color: 'purple', text: '已退款' },
          'CANCELLED': { color: 'red', text: '已取消' },
        };
        const config = paymentConfig[status] || { color: 'default', text: status || '未知' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Dropdown
            menu={{
              items: getActionMenuItems(record),
            }}
            trigger={['click']}
          >
            <Button type="link" icon={<MoreOutlined />}>
              更多
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  // 获取操作菜单项
  const getActionMenuItems = (record: Order) => {
    const items = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleEdit(record),
      },
    ];

    // 使用后端返回的 orderStatus 字段
    const orderStatus = (record as any).orderStatus;

    if (orderStatus === 'PENDING') {
      items.push({
        key: 'confirm',
        icon: <CheckCircleOutlined />,
        label: '确认订单',
        onClick: () => handleStatusChange(record.id, 'confirm'),
      });
    }

    if (orderStatus !== 'CANCELLED' && orderStatus !== 'COMPLETED') {
      items.push({
        key: 'cancel',
        icon: <CloseCircleOutlined />,
        label: '取消订单',
        onClick: () => handleStatusChange(record.id, 'cancel'),
      });
    }

    // 已确认或进行中的订单可以完成（需先付款后付货，未支付订单不可完成）
    if ((orderStatus === 'CONFIRMED' || orderStatus === 'IN_PROGRESS') && record.paymentStatus !== 'PENDING_PAYMENT') {
      items.push({
        key: 'complete',
        icon: <CheckCircleOutlined />,
        label: '完成订单',
        onClick: () => handleStatusChange(record.id, 'complete'),
      });
    }

    // 只对已取消的订单显示删除选项
    if (orderStatus === 'CANCELLED') {
      items.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除订单',
        onClick: () => handleDelete(record),
      });
    }

    return items;
  };

  // 搜索处理
  const handleSearch = (values: OrderSearchParams) => {
    const newSearchValues = { ...searchValues, ...values };
    setSearchValues(newSearchValues);
    dispatch(setSearchParams(newSearchValues));
  };

  // 清除搜索条件
  const handleClearSearch = () => {
    setSearchValues({});
    dispatch(setSearchParams({}));
  };

  // 查看详情
  const handleViewDetail = (order: Order) => {
    setCurrentOrder(order);
    setDetailVisible(true);
  };

  // 编辑订单
  const handleEdit = (order: Order) => {
    setCurrentOrder(order);
    setFormVisible(true);
  };

  // 状态变更
  const handleStatusChange = (id: string, action: 'confirm' | 'cancel' | 'complete') => {
    const actionText = action === 'confirm' ? '确认' : action === 'cancel' ? '取消' : '完成';
    Modal.confirm({
      title: `确定${actionText}此订单？`,
      content: action === 'cancel' ? '取消订单后可能影响支付记录和库存数据。' : undefined,
      onOk: async () => {
        try {
          await dispatch(updateOrderStatus({ id, action })).unwrap();
          message.success(`订单${actionText}成功`);
          dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
        } catch (error) {
          message.error('操作失败');
        }
      },
    });
  };

  // 删除订单
  const handleDelete = (order: Order) => {
    Modal.confirm({
      title: '确定删除此订单？',
      content: '删除后数据不可恢复。',
      onOk: async () => {
        try {
          await orderService.deleteOrder(order.id);
          message.success('订单删除成功');
          dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || '删除失败';
          message.error(errorMessage);
        }
      },
    });
  };

  // 批量操作
  const handleBatchAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的订单');
      return;
    }

    const actionText = action === 'confirm' ? '确认' : action === 'cancel' ? '取消' : action;
    Modal.confirm({
      title: `批量${actionText}订单`,
      content: `确定要${actionText}选中的 ${selectedRowKeys.length} 个订单吗？`,
      onOk: async () => {
        try {
          await orderService.batchOperateOrders(selectedRowKeys, action);
          message.success('批量操作成功');
          setSelectedRowKeys([]);
          dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
        } catch (error) {
          message.error('批量操作失败');
        }
      },
    });
  };

  // Excel导出
  const handleExportExcel = async () => {
    try {
      // 获取当前筛选条件下的所有订单数据
      const response = await orderService.getOrders({
        ...searchValues,
        page: 1,
        pageSize: 10000, // 获取所有数据
      });
      
      const exportData = response.data.list?.map((order) => ({
        订单号: order.orderNo,
        客户姓名: order.customerName || order.user?.nickname || '',
        客户手机: order.customerPhone || '',
        套餐名称: order.package?.name || '',
        预约日期: order.timeSlot ? dayjs(order.timeSlot.date).format('YYYY-MM-DD') : '',
        预约时间: order.timeSlot ? `${formatTime(order.timeSlot.startTime)}-${formatTime(order.timeSlot.endTime)}` : '',
        订单状态: getStatusText(order.orderStatus),
        支付状态: getPaymentStatusText(order.paymentStatus),
        订单金额: Number(order.totalAmount || 0).toFixed(2),
        已支付金额: Number(order.paidAmount || 0).toFixed(2),
        创建时间: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        备注: order.notes || '',
      })) || [];

      // 创建工作簿和工作表
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '订单数据');

      // 设置列宽
      const colWidths = [
        { wch: 20 }, // 订单号
        { wch: 15 }, // 用户姓名
        { wch: 15 }, // 用户手机
        { wch: 25 }, // 套餐名称
        { wch: 12 }, // 预约日期
        { wch: 15 }, // 预约时间
        { wch: 10 }, // 订单状态
        { wch: 10 }, // 支付状态
        { wch: 12 }, // 订单金额
        { wch: 12 }, // 已支付金额
        { wch: 20 }, // 创建时间
        { wch: 30 }, // 备注
      ];
      ws['!cols'] = colWidths;

      // 导出文件
      XLSX.writeFile(wb, `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.xlsx`);
      message.success('Excel导出成功');
    } catch (error) {
      console.error('Excel导出失败:', error);
      message.error('Excel导出失败');
    }
  };

  // CSV导出数据
  const handleExport = async () => {
    try {
      // 获取当前筛选条件下的所有订单数据
      const response = await orderService.getOrders({
        ...searchValues,
        page: 1,
        pageSize: 10000, // 获取所有数据
      });
      
      const exportData = response.data.list?.map((order) => ({
        订单号: order.orderNo,
        客户姓名: order.customerName || order.user?.nickname || '',
        客户手机: order.customerPhone || '',
        套餐名称: order.package?.name || '',
        预约日期: order.timeSlot ? dayjs(order.timeSlot.date).format('YYYY-MM-DD') : '',
        预约时间: order.timeSlot ? `${formatTime(order.timeSlot.startTime)}-${formatTime(order.timeSlot.endTime)}` : '',
        订单状态: getStatusText(order.orderStatus),
        支付状态: getPaymentStatusText(order.paymentStatus),
        订单金额: `¥${Number(order.totalAmount || 0).toFixed(2)}`,
        已支付金额: `¥${Number(order.paidAmount || 0).toFixed(2)}`,
        创建时间: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        备注: order.notes || '',
      })) || [];

      // 转换为CSV格式
      const csvContent = convertToCSV(exportData);
      
      // 创建下载链接 - 使用更明确的编码设置
      const BOM = '\uFEFF'; // UTF-8 BOM
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
      
      // 确保链接可见性和点击
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 后端导出 - 使用后端生成Excel
  const handleBackendExport = async () => {
    try {
      const params: any = {};
      
      // 添加日期范围
      if (searchValues.dateRange && searchValues.dateRange.length === 2) {
        params.startDate = dayjs(searchValues.dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(searchValues.dateRange[1]).format('YYYY-MM-DD');
      }
      
      // 添加状态筛选
      if (searchValues.status) {
        params.orderStatus = searchValues.status;
      }
      if (searchValues.paymentStatus) {
        params.paymentStatus = searchValues.paymentStatus;
      }
      
      // 调用后端导出API
      await exportService.exportOrders(params);
      message.success('正在导出，请稍候...');
    } catch (error) {
      console.error('后端导出失败:', error);
      message.error('导出失败');
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PENDING': '待确认',
      'CONFIRMED': '已确认',
      'REJECTED': '已拒绝',
      'IN_PROGRESS': '进行中',
      'COMPLETED': '已完成',
      'CANCELLED': '已取消',
    };
    return statusMap[status] || status;
  };

  // 获取支付状态文本
  const getPaymentStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PENDING_PAYMENT': '待支付',
      'PARTIAL_PAID': '部分支付',
      'FULLY_PAID': '已支付',
      'PAID': '已支付',
      'FAILED': '支付失败',
      'REFUNDING': '退款中',
      'REFUNDED': '已退款',
      'CANCELLED': '已取消',
      'CREATED': '已创建',
    };
    return statusMap[status] || status;
  };

  // 转换为CSV格式
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // 添加表头 - 所有字段都用引号包围，确保中文正确显示
    csvRows.push(headers.map(header => `"${header}"`).join(','));
    
    // 添加数据行
    for (const row of data) {
      const values = headers.map(header => {
        let value = row[header];
        
        // 确保值不为null或undefined
        if (value === null || value === undefined) {
          value = '';
        }
        
        // 转换为字符串
        value = String(value);
        
        // 所有值都用引号包围，并处理内部引号
        return `"${value.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\r\n'); // 使用Windows换行符，兼容性更好
  };

  return (
    <PageContainer>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总订单数" value={stats?.totalOrders || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待处理订单" value={stats?.pendingOrders || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成订单" value={stats?.completedOrders || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总收入"
              value={stats?.totalRevenue || 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* 搜索表单 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Input.Search
              placeholder="搜索订单号/手机号"
              onSearch={(value) => {
                if (value.trim()) {
                  handleSearch({ keyword: value.trim() });
                } else {
                  // 当清空搜索时，移除关键字搜索条件
                  const { keyword, orderNo, phone, ...rest } = searchValues;
                  setSearchValues(rest);
                  dispatch(setSearchParams(rest));
                }
              }}
              allowClear
              enterButton="搜索"
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="订单状态"
              allowClear
              style={{ width: '100%' }}
              value={searchValues.status}
              onChange={(value) => {
                if (value) {
                  handleSearch({ status: value });
                } else {
                  // 当清空选择时，移除状态搜索条件
                  const { status, ...rest } = searchValues;
                  setSearchValues(rest);
                  dispatch(setSearchParams(rest));
                }
              }}
            >
              <Option value="PENDING">待确认</Option>
              <Option value="CONFIRMED">已确认</Option>
              <Option value="IN_PROGRESS">进行中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="支付状态"
              allowClear
              style={{ width: '100%' }}
              value={searchValues.paymentStatus}
              onChange={(value) => {
                if (value) {
                  handleSearch({ paymentStatus: value });
                } else {
                  // 当清空选择时，移除支付状态搜索条件
                  const { paymentStatus, ...rest } = searchValues;
                  setSearchValues(rest);
                  dispatch(setSearchParams(rest));
                }
              }}
            >
              <Option value="PENDING_PAYMENT">待支付</Option>
              <Option value="PARTIAL_PAID">部分支付</Option>
              <Option value="FULLY_PAID">已支付</Option>
              <Option value="REFUNDING">退款中</Option>
              <Option value="REFUNDED">已退款</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  // 设置开始时间为当天00:00:00，结束时间为当天23:59:59
                  const startDate = dates[0].startOf('day').toISOString();
                  const endDate = dates[1].endOf('day').toISOString();
                  handleSearch({
                    startDate,
                    endDate,
                    dateRange: [startDate, endDate],
                  });
                } else {
                  // 当清空日期时，移除日期搜索条件
                  const { startDate, endDate, dateRange, ...rest } = searchValues;
                  setSearchValues(rest);
                  dispatch(setSearchParams(rest));
                }
              }}
            />
          </Col>
          <Col span={4}>
            <Button onClick={handleClearSearch} style={{ width: '100%' }}>
              清除筛选
            </Button>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Row style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setFormVisible(true)}
            >
              新增订单
            </Button>
            <Button
              onClick={() => handleBatchAction('confirm')}
              disabled={selectedRowKeys.length === 0}
            >
              批量确认
            </Button>
            <Button
              onClick={() => handleBatchAction('cancel')}
              disabled={selectedRowKeys.length === 0}
            >
              批量取消
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'backend',
                    label: '后端导出 (推荐)',
                    icon: <ExportOutlined />,
                    onClick: handleBackendExport,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'excel',
                    label: '前端导出 - Excel',
                    icon: <ExportOutlined />,
                    onClick: handleExportExcel,
                  },
                  {
                    key: 'csv',
                    label: '前端导出 - CSV',
                    icon: <ExportOutlined />,
                    onClick: handleExport,
                  },
                ],
              }}
            >
              <Button icon={<ExportOutlined />}>
                导出数据 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </Row>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={orders}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page: number, pageSize?: number) => {
              dispatch(setPagination({ current: page, pageSize }));
            },
          }}
        />
      </Card>

      {/* 订单详情弹窗 */}
      <OrderDetail
        visible={detailVisible}
        order={currentOrder}
        onClose={() => {
          setDetailVisible(false);
          setCurrentOrder(undefined);
        }}
        onEdit={(order) => {
          setCurrentOrder(order);
          setFormVisible(true);
          setDetailVisible(false);
        }}
        onRefresh={() => {
          dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
        }}
      />

      {/* 订单表单弹窗 */}
      <OrderForm
        visible={formVisible}
        order={currentOrder}
        onCancel={() => {
          setFormVisible(false);
          setCurrentOrder(undefined);
        }}
        onSubmit={() => {
          setFormVisible(false);
          setCurrentOrder(undefined);
          dispatch(fetchOrders({ pagination: stablePagination, searchParams: stableSearchParams }));
        }}
      />
    </PageContainer>
  );
};

export default OrderList;
