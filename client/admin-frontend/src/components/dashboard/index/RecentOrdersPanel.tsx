import React, { useState } from 'react';
import { Card, Table, Space, Tooltip, Avatar, Button, Tag, Empty, Dropdown, Typography, Modal, message } from 'antd';
import { UserOutlined, EyeOutlined, EditOutlined, PlusOutlined, UnorderedListOutlined, MoreOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import OrderDetail from '@/pages/Orders/OrderDetail';
import type { Order } from '@/types/order';
import { orderService } from '@/services/orders';

const { Text } = Typography;
const { confirm } = Modal;

interface RecentOrdersPanelProps {
  recentOrders: Order[];
  loading: boolean;
  onRefresh?: () => void;
}

const RecentOrdersPanel: React.FC<RecentOrdersPanelProps> = ({ recentOrders, loading, onRefresh }) => {
  const navigate = useNavigate();
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 订单状态映射
  const getOrderStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '待确认' },
      CONFIRMED: { color: 'blue', text: '已确认' },
      IN_PROGRESS: { color: 'cyan', text: '进行中' },
      COMPLETED: { color: 'green', text: '已完成' },
      CANCELLED: { color: 'red', text: '已取消' },
      REFUNDED: { color: 'purple', text: '已退款' },
    };
    return statusMap[status] || { color: 'default', text: status || '未知' };
  };

  // 支付状态映射
  const getPaymentStatusConfig = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      // Prisma enum values
      PENDING_PAYMENT: { color: 'default', text: '待支付' },
      PARTIAL_PAID: { color: 'orange', text: '部分支付' },
      FULLY_PAID: { color: 'green', text: '已支付' },
      REFUNDING: { color: 'purple', text: '退款中' },
      PARTIAL_REFUNDED: { color: 'purple', text: '部分退款' },
      REFUNDED: { color: 'purple', text: '已退款' },
      CANCELLED: { color: 'default', text: '已取消' },
      // 兼容旧简写
      PENDING: { color: 'default', text: '待支付' },
      PAID: { color: 'green', text: '已支付' },
      PARTIAL: { color: 'orange', text: '部分支付' },
      OVERPAID: { color: 'cyan', text: '超额支付' },
      FAILED: { color: 'red', text: '支付失败' },
      CREATED: { color: 'blue', text: '已创建' },
    };
    return statusMap[status] || { color: 'default', text: status || '未知' };
  };

  // 查看全部订单
  const handleViewAll = () => {
    navigate('/orders');
  };

  // 新建订单
  const handleCreateOrder = () => {
    navigate('/orders/create');
  };

  // 查看订单详情
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setViewModalVisible(true);
    // 也可以直接跳转到详情页
    // navigate(`/orders/${order.id}`);
  };

  // 编辑订单
  const handleEditOrder = (order: Order) => {
    navigate(`/orders/edit/${order.id}`);
  };

  // 关闭详情弹窗
  const handleCloseViewModal = () => {
    setViewModalVisible(false);
    setSelectedOrder(null);
  };

  // 处理订单状态变更
  const handleStatusChange = async (id: string, action: 'confirm' | 'cancel' | 'complete') => {
    try {
      switch (action) {
        case 'confirm':
          await orderService.confirmOrder(id);
          message.success('订单确认成功');
          break;
        case 'cancel':
          await orderService.cancelOrder(id, '管理员取消');
          message.success('订单取消成功');
          break;
        case 'complete':
          await orderService.completeOrder(id);
          message.success('订单完成成功');
          break;
      }
      // 刷新仪表盘数据
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 处理删除订单
  const handleDeleteOrder = async (order: Order) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除订单 ${order.orderNo} 吗？`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await orderService.deleteOrder(order.id);
          message.success('订单删除成功');
          // 刷新仪表盘数据
          if (onRefresh) {
            onRefresh();
          }
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || '删除失败';
          message.error(errorMessage);
        }
      },
    });
  };

  // 获取操作菜单项
  const getActionMenuItems = (record: Order): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => handleEditOrder(record),
      },
    ];

    // 使用 orderStatus 字段
    const orderStatus = record.orderStatus;

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
        onClick: () => handleDeleteOrder(record),
      });
    }

    return items;
  };

  // 表格列定义
  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '客户',
      dataIndex: ['user', 'phone'],
      width: 120,
      render: (phone: string, record: Order) => (
        <Space size="small">
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{phone || record.user?.nickname || '未知客户'}</span>
        </Space>
      ),
    },
    {
      title: '套餐',
      dataIndex: ['package', 'name'],
      width: 150,
      ellipsis: {
        showTitle: false,
      },
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name}>
          <span>{name || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 180,
      align: 'right',
      render: (amount: number | string) => (
        <span style={{ color: '#f8e7c1', fontWeight: '900', fontSize: '24px', textShadow: '0 0 20px rgba(212,163,115,0.2)' }}>
          ¥{Number(amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '预约时间',
      dataIndex: 'appointmentDate',
      width: 200,
      render: (date: string, record: Order) => {
        if (!date && !record.timeSlot?.date) return <Text type="secondary">未预约</Text>;
        
        const appointmentDate = date || record.timeSlot?.date || '';
        const displayDate = new Date(appointmentDate).toLocaleDateString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
        });
        
        // 如果有时间槽信息，显示时间段
        if (record.timeSlot?.startTime && record.timeSlot?.endTime) {
          const formatTime = (timeStr: string) => {
            try {
              const date = new Date(timeStr);
              return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
            } catch {
              return timeStr.substring(0, 5);
            }
          };
          const timeRange = `${formatTime(record.timeSlot.startTime)}-${formatTime(record.timeSlot.endTime)}`;
          return (
            <div>
          <div style={{ fontSize: '22px', fontWeight: 700 }}>{displayDate}</div>
            <Text type="secondary" style={{ fontSize: '22px', fontWeight: 600 }}>{timeRange}</Text>
            </div>
          );
        }
        
  return <span style={{ fontSize: '22px', fontWeight: 700 }}>{displayDate}</span>;
      },
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      width: 90,
      render: (status: string) => {
        const config = getOrderStatusConfig(status);
        return (
          <Tag color={config.color}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      width: 90,
      render: (status: string) => {
        if (!status) return <Tag color="default">未知</Tag>;
        const config = getPaymentStatusConfig(status);
        return (
          <Tag color={config.color}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: any, record: Order) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewOrder(record)}
            style={{ fontSize: '16px', fontWeight: 600 }}
          >
            详情
          </Button>
          <Dropdown
            menu={{
              items: getActionMenuItems(record),
            }}
            trigger={['click']}
          >
            <Button type="link" size="small" icon={<MoreOutlined />} style={{ fontSize: '16px', fontWeight: 600 }}>
              更多
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            <span>最近订单</span>
          </Space>
        }
        loading={loading}
        extra={
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={handleViewAll}
            >
              查看全部
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleCreateOrder}
            >
              新建订单
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={recentOrders}
          pagination={false}
          size="small"
          rowKey="id"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无订单数据"
              >
                <Button type="primary" size="small" onClick={handleCreateOrder}>
                  立即创建订单
                </Button>
              </Empty>
            ),
          }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* 订单详情抽屉 */}
      <OrderDetail
        visible={viewModalVisible}
        order={selectedOrder || undefined}
        onClose={handleCloseViewModal}
        onEdit={(order) => {
          handleCloseViewModal();
          handleEditOrder(order);
        }}
        onRefresh={() => {
          // 刷新仪表盘数据
          if (onRefresh) {
            onRefresh();
          }
        }}
      />
    </>
  );
};

export default RecentOrdersPanel;
