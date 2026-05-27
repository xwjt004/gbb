import React, { useState } from 'react';
import {
  Card,
  Form,
  DatePicker,
  Select,
  Button,
  Space,
  Divider,
  Table,
  message,
  Statistic,
  Row,
  Col,
  Radio,
  Checkbox,
  Alert,
  Tag,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { exportService } from '@/services/export';
import { orderService } from '@/services/orders';
import { Order } from '@/types/order';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ExportOrders: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Order[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalAmount: 0,
    paidAmount: 0,
  });

  // 可选导出字段
  const availableFields = [
    { value: 'orderNo', label: '订单号' },
    { value: 'userName', label: '用户姓名' },
    { value: 'userPhone', label: '用户手机' },
    { value: 'packageName', label: '套餐名称' },
    { value: 'packagePrice', label: '套餐价格' },
    { value: 'appointmentDate', label: '预约日期' },
    { value: 'appointmentTime', label: '预约时间' },
    { value: 'orderStatus', label: '订单状态' },
    { value: 'paymentStatus', label: '支付状态' },
    { value: 'totalAmount', label: '订单金额' },
    { value: 'paidAmount', label: '已支付金额' },
    { value: 'paymentMethod', label: '支付方式' },
    { value: 'transactionId', label: '第三方交易号' },
    { value: 'createdAt', label: '创建时间' },
    { value: 'notes', label: '备注' },
  ];

  // 默认选中所有字段
  const [selectedFields, setSelectedFields] = useState<string[]>(
    availableFields.map(f => f.value)
  );

  // 预览数据的列定义
  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
    },
    {
      title: '用户',
      key: 'user',
      width: 120,
      render: (_, record) => record.user?.nickname || '未设置',
    },
    {
      title: '套餐',
      key: 'package',
      width: 200,
      render: (_, record) => record.package?.name || '',
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'orange', text: '待确认' },
          CONFIRMED: { color: 'blue', text: '已确认' },
          COMPLETED: { color: 'green', text: '已完成' },
          CANCELLED: { color: 'red', text: '已取消' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          PENDING_PAYMENT: { color: 'orange', text: '待支付' },
          PARTIAL_PAID: { color: 'blue', text: '部分支付' },
          PAID: { color: 'green', text: '已支付' },
          FAILED: { color: 'red', text: '支付失败' },
          REFUNDING: { color: 'orange', text: '退款中' },
          REFUNDED: { color: 'purple', text: '已退款' },
          CANCELLED: { color: 'default', text: '已取消' },
        };
        const config = statusMap[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => `¥${Number(amount || 0).toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  // 预览数据
  const handlePreview = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();
      
      const params: any = {};
      
      if (values.dateRange && values.dateRange.length === 2) {
        params.startDate = dayjs(values.dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(values.dateRange[1]).format('YYYY-MM-DD');
      }
      
      if (values.orderStatus) {
        params.status = values.orderStatus;
      }
      
      if (values.paymentStatus) {
        params.paymentStatus = values.paymentStatus;
      }

      const response = await orderService.getOrders({
        ...params,
        page: 1,
        pageSize: 100,
      });

      const orders = response.data.list || [];
      setPreviewData(orders);
      setPreviewVisible(true);

      // 计算统计数据
      const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      
      // 统计所有订单的已支付金额（每个订单的 paidAmount 已经包含了所有成功支付记录的汇总）
      const paidAmount = orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
      
      setStats({
        totalCount: orders.length,
        totalAmount,
        paidAmount,
      });

      message.success(`预览成功，共 ${orders.length} 条订单`);
    } catch (error) {
      console.error('预览失败:', error);
      message.error('预览失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const handleExport = async (format: 'excel' | 'pdf' | 'json') => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();
      
      const params: any = {};
      
      if (values.dateRange && values.dateRange.length === 2) {
        params.startDate = dayjs(values.dateRange[0]).format('YYYY-MM-DD');
        params.endDate = dayjs(values.dateRange[1]).format('YYYY-MM-DD');
      }
      
      if (values.orderStatus) {
        params.orderStatus = values.orderStatus;
      }
      
      if (values.paymentStatus) {
        params.paymentStatus = values.paymentStatus;
      }

      if (format === 'excel') {
        await exportService.exportOrders(params);
        message.success('Excel导出成功，文件正在下载...');
      } else if (format === 'json') {
        // JSON导出 - 使用前端实现
        const response = await orderService.getOrders({
          ...params,
          page: 1,
          pageSize: 10000,
        });
        
        const orders = response.data.list || [];
        const jsonData = JSON.stringify(orders, null, 2);
        
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `订单数据_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        message.success('JSON导出成功');
      } else if (format === 'pdf') {
        message.info('PDF导出功能开发中，敬请期待...');
      }
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="导出订单数据" variant="borderless">
        <Alert
          message="功能说明"
          description="选择筛选条件后，可以预览数据或直接导出。支持 Excel、PDF、JSON 三种格式。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            exportFormat: 'excel',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="日期范围"
                name="dateRange"
                tooltip="选择订单创建的日期范围"
              >
                <RangePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  placeholder={['开始日期', '结束日期']}
                />
              </Form.Item>
            </Col>
            
            <Col span={6}>
              <Form.Item
                label="订单状态"
                name="orderStatus"
              >
                <Select placeholder="全部状态" allowClear>
                  <Option value="PENDING">待确认</Option>
                  <Option value="CONFIRMED">已确认</Option>
                  <Option value="COMPLETED">已完成</Option>
                  <Option value="CANCELLED">已取消</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                label="支付状态"
                name="paymentStatus"
              >
                <Select placeholder="全部状态" allowClear>
                  <Option value="PENDING_PAYMENT">待支付</Option>
                  <Option value="PARTIAL_PAID">部分支付</Option>
                  <Option value="PAID">已支付</Option>
                  <Option value="FAILED">支付失败</Option>
                  <Option value="REFUNDING">退款中</Option>
                  <Option value="REFUNDED">已退款</Option>
                  <Option value="CANCELLED">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="导出格式"
            name="exportFormat"
          >
            <Radio.Group>
              <Radio.Button value="excel">
                <FileExcelOutlined /> Excel (.xlsx)
              </Radio.Button>
              <Radio.Button value="pdf" disabled>
                <FilePdfOutlined /> PDF (.pdf)
              </Radio.Button>
              <Radio.Button value="json">
                <FileTextOutlined /> JSON (.json)
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="导出字段"
            tooltip="选择需要导出的字段"
          >
            <Checkbox.Group
              options={availableFields}
              value={selectedFields}
              onChange={(values) => setSelectedFields(values as string[])}
            />
            <div style={{ marginTop: 8 }}>
              <Button
                size="small"
                type="link"
                onClick={() => setSelectedFields(availableFields.map(f => f.value))}
              >
                全选
              </Button>
              <Button
                size="small"
                type="link"
                onClick={() => setSelectedFields([])}
              >
                取消全选
              </Button>
            </div>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="default"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={loading}
              >
                预览数据
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const format = form.getFieldValue('exportFormat');
                  handleExport(format);
                }}
                loading={loading}
              >
                立即导出
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {previewVisible && (
          <>
            <Divider />
            
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="订单数量"
                      value={stats.totalCount}
                      suffix="条"
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="订单总额"
                      value={stats.totalAmount}
                      precision={2}
                      prefix="¥"
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="已支付金额"
                      value={stats.paidAmount}
                      precision={2}
                      prefix="¥"
                    />
                  </Card>
                </Col>
              </Row>
            </div>

            <Table
              columns={columns}
              dataSource={previewData}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total) => `共 ${total} 条`,
                showSizeChanger: true,
              }}
              scroll={{ x: 1200 }}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ExportOrders;
