import React, { useState } from 'react';
import {
  Card, Button, Space, Table, message, Statistic, Row, Col,
  Divider, Form, DatePicker, Alert,
} from 'antd';
import {
  DownloadOutlined, EyeOutlined, DollarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { exportService } from '@/services/export';
import { simple } from '@/services/api';

const { RangePicker } = DatePicker;

interface PaymentRecord {
  id: string;
  orderNo: string;
  userName: string;
  packageName: string;
  amount: number;
  paymentType: string;
  status: string;
  transactionId: string;
  paidAt: string;
  createdAt: string;
}

const statusMap: Record<string, string> = {
  PENDING: '待支付', PAID: '已支付',
  FULLY_PAID: '已支付', REFUNDED: '已退款',
  FAILED: '支付失败', CANCELLED: '已取消',
};

const ExportFinance: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<PaymentRecord[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [stats, setStats] = useState({ totalCount: 0, totalAmount: 0 });

  const columns: ColumnsType<PaymentRecord> = [
    { title: '支付单号', dataIndex: 'id', width: 200 },
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '用户', dataIndex: 'userName', width: 120 },
    { title: '套餐', dataIndex: 'packageName', width: 200 },
    {
      title: '金额', dataIndex: 'amount', width: 100,
      render: (v: number) => `¥${(v || 0).toFixed(2)}`,
    },
    { title: '支付方式', dataIndex: 'paymentType', width: 120 },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => statusMap[v] || v },
    { title: '交易号', dataIndex: 'transactionId', width: 200 },
    {
      title: '支付时间', dataIndex: 'paidAt', width: 180,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ];

  const getDateParams = () => {
    const values = form.getFieldsValue();
    if (values.dateRange && values.dateRange.length === 2) {
      return {
        startDate: dayjs(values.dateRange[0]).format('YYYY-MM-DD'),
        endDate: dayjs(values.dateRange[1]).format('YYYY-MM-DD'),
      };
    }
    return null;
  };

  const handlePreview = async () => {
    const dateParams = getDateParams();
    if (!dateParams) {
      message.warning('请选择日期范围');
      return;
    }
    setLoading(true);
    try {
      const res = await simple.get<any>('/payments', {
        params: { startDate: dateParams.startDate, endDate: dateParams.endDate, page: 1, limit: 100 },
      });
      const d = (res as any).data || res;
      const list = d.list || d.items || [];
      setPreviewData(list);
      const totalAmount = list.reduce((sum: number, r: PaymentRecord) => sum + Number(r.amount || 0), 0);
      setStats({ totalCount: list.length, totalAmount });
      setPreviewVisible(true);
    } catch {
      message.error('获取财务数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const dateParams = getDateParams();
    if (!dateParams) {
      message.warning('请选择日期范围');
      return;
    }
    setExporting(true);
    try {
      await exportService.exportFinancial(dateParams);
      message.success('财务数据导出已开始，文件正在下载...');
    } catch {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="导出财务数据" variant="borderless">
        <Alert
          message="功能说明"
          description="按日期范围导出财务明细数据，包含支付单号、订单号、用户、套餐、金额、支付方式等信息，生成 Excel 文件。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical">
          <Form.Item
            label="日期范围"
            name="dateRange"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker
              style={{ width: 400 }}
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          {previewVisible && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="记录数" value={stats.totalCount} suffix="条" />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="金额合计" value={stats.totalAmount} precision={2} prefix={<DollarOutlined />} />
                </Card>
              </Col>
            </Row>
          )}

          <Space size="middle">
            <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loading}>
              预览数据
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exporting}
            >
              导出 Excel
            </Button>
          </Space>
        </Form>

        {previewVisible && (
          <>
            <Divider />
            <Table
              rowKey="id"
              columns={columns}
              dataSource={previewData}
              loading={loading}
              scroll={{ x: 1200 }}
              pagination={{
                pageSize: 10,
                showTotal: (t) => `共 ${t} 条`,
                showSizeChanger: true,
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ExportFinance;
