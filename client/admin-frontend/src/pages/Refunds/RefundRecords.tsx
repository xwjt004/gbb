import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Statistic,
  App,
  Descriptions,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { refundService, RefundRequest } from '@/services/refundService';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

const RefundRecords: React.FC = () => {
  const { modal } = App.useApp();

  // 统计卡片辅助方法
  function getStatusCount(status: string) {
    if (!statistics?.statusStats) return 0;
    const stat = statistics.statusStats.find((s: any) => s.status === status);
    return stat?._count?.status || 0;
  }

  function getStatusAmount(status: string) {
    if (!statistics?.statusStats) return '0.00';
    const stat = statistics.statusStats.find((s: any) => s.status === status);
    return Number(stat?._sum?.refundAmount || 0).toFixed(2);
  }
  const [loading, setLoading] = useState(false);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statistics, setStatistics] = useState<any>(null);

  // 搜索表单
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});

  useEffect(() => {
    fetchRefunds();
    fetchStatistics();
  }, [currentPage, pageSize, searchParams]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const result = await refundService.getRefundRequests({
        page: currentPage,
        limit: pageSize,
        ...searchParams,
      });
      setRefunds(result.data || []);
      setTotal(result.total || 0);
    } catch (error: any) {
      console.error('获取退款列表失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '获取退款列表失败';
      message.error(errorMsg);
      setRefunds([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await refundService.getRefundStatistics();
      setStatistics(stats);
    } catch (error: any) {
      console.error('获取统计数据失败:', error);
      // 静默失败，不显示错误提示
      setStatistics(null);
    }
  };

  // 搜索
  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    const params: any = {};

    if (values.orderNo) params.orderNo = values.orderNo;
    if (values.refundNo) params.refundNo = values.refundNo;
    if (values.status) params.status = values.status;
    if (values.refundType) params.refundType = values.refundType;
    if (values.dateRange && values.dateRange.length === 2) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD');
      params.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    setSearchParams(params);
    setCurrentPage(1);
  };

  // 重置搜索
  const handleReset = () => {
    searchForm.resetFields();
    setSearchParams({});
    setCurrentPage(1);
  };

  // 导出数据
  const handleExport = async () => {
    try {
      message.loading({ content: '正在导出数据...', key: 'export' });
      
      // 获取所有符合条件的数据（不分页）
      const result = await refundService.getRefundRequests({
        ...searchParams,
        page: 1,
        limit: 10000, // 获取大量数据
      });

      if (!result.data || result.data.length === 0) {
        message.warning({ content: '没有可导出的数据', key: 'export' });
        return;
      }

      // 准备导出数据
      const exportData = result.data.map((item, index) => ({
        序号: index + 1,
        退款编号: item.refundNo,
        订单编号: item.orderNo,
        退款类型: refundService.getTypeText(item.refundType as any),
        退款金额: Number(item.refundAmount).toFixed(2),
        退款方式: refundService.getMethodText(item.refundMethod as any),
        状态: refundService.getStatusText(item.status as any),
        退款原因: item.refundReason,
        申请人: item.applicantName || '-',
        审批人: item.approvedBy || '-',
        拒绝原因: item.rejectReason || '-',
        交易流水号: item.transactionId || '-',
        申请时间: new Date(item.createdAt).toLocaleString('zh-CN'),
        审批时间: item.approvedAt ? new Date(item.approvedAt).toLocaleString('zh-CN') : '-',
        退款时间: item.refundedAt ? new Date(item.refundedAt).toLocaleString('zh-CN') : '-',
        备注: item.notes || '-',
      }));

      // 使用 XLSX 库创建 Excel 文件
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '退款记录');

      // 设置列宽
      const colWidths = [
        { wch: 6 },  // 序号
        { wch: 20 }, // 退款编号
        { wch: 20 }, // 订单编号
        { wch: 12 }, // 退款类型
        { wch: 12 }, // 退款金额
        { wch: 12 }, // 退款方式
        { wch: 10 }, // 状态
        { wch: 30 }, // 退款原因
        { wch: 12 }, // 申请人
        { wch: 12 }, // 审批人
        { wch: 30 }, // 拒绝原因
        { wch: 25 }, // 交易流水号
        { wch: 20 }, // 申请时间
        { wch: 20 }, // 审批时间
        { wch: 20 }, // 退款时间
        { wch: 30 }, // 备注
      ];
      worksheet['!cols'] = colWidths;

      // 导出文件
      const fileName = `退款记录_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success({ content: '导出成功', key: 'export' });
    } catch (error: any) {
      console.error('导出失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '导出失败，请重试';
      message.error({ content: errorMsg, key: 'export' });
    }
  };

  // 查看详情
  const showDetail = (record: RefundRequest) => {
    modal.info({
      title: '退款详情',
      width: 800,
      content: (
        <Descriptions column={2} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="退款编号" span={2}>{record.refundNo}</Descriptions.Item>
          <Descriptions.Item label="订单编号" span={2}>{record.orderNo}</Descriptions.Item>
          <Descriptions.Item label="退款类型">{refundService.getTypeText(record.refundType as any)}</Descriptions.Item>
          <Descriptions.Item label="退款金额">¥{Number(record.refundAmount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="退款方式">{refundService.getMethodText(record.refundMethod as any)}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={refundService.getStatusColor(record.status as any)}>
              {refundService.getStatusText(record.status as any)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="退款原因" span={2}>{record.refundReason}</Descriptions.Item>
          {record.notes && (
            <Descriptions.Item label="备注" span={2}>{record.notes}</Descriptions.Item>
          )}
          {record.rejectReason && (
            <Descriptions.Item label="拒绝原因" span={2}>{record.rejectReason}</Descriptions.Item>
          )}
          {record.applicantName && (
            <Descriptions.Item label="申请人" span={2}>{record.applicantName}</Descriptions.Item>
          )}
          {record.applicantType && (
            <Descriptions.Item label="申请人类型" span={2}>{record.applicantType}</Descriptions.Item>
          )}
          {record.approvedBy && (
            <Descriptions.Item label="审批人" span={2}>{record.approvedBy}</Descriptions.Item>
          )}
          {record.rejectedBy && (
            <Descriptions.Item label="拒绝人" span={2}>{record.rejectedBy}</Descriptions.Item>
          )}
          {record.refundedBy && (
            <Descriptions.Item label="退款操作人" span={2}>{record.refundedBy}</Descriptions.Item>
          )}
          {record.transactionId && (
            <Descriptions.Item label="交易流水号" span={2}>{record.transactionId}</Descriptions.Item>
          )}
          <Descriptions.Item label="申请时间">{new Date(record.createdAt).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{new Date(record.updatedAt).toLocaleString()}</Descriptions.Item>
          {record.approvedAt && (
            <Descriptions.Item label="审批时间" span={2}>{new Date(record.approvedAt).toLocaleString()}</Descriptions.Item>
          )}
          {record.rejectedAt && (
            <Descriptions.Item label="拒绝时间" span={2}>{new Date(record.rejectedAt).toLocaleString()}</Descriptions.Item>
          )}
          {record.refundedAt && (
            <Descriptions.Item label="退款时间" span={2}>{new Date(record.refundedAt).toLocaleString()}</Descriptions.Item>
          )}
        </Descriptions>
      ),
    });
  };

  const columns = [
    {
      title: '退款编号',
      dataIndex: 'refundNo',
      key: 'refundNo',
      width: 150,
      fixed: 'left' as const,
    },
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
    },
    {
      title: '退款类型',
      dataIndex: 'refundType',
      key: 'refundType',
      width: 100,
      render: (type: string) => refundService.getTypeText(type as any),
    },
    {
      title: '退款金额',
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      width: 120,
      render: (amount: number) => `¥${Number(amount).toFixed(2)}`,
      sorter: (a: RefundRequest, b: RefundRequest) => Number(a.refundAmount) - Number(b.refundAmount),
    },
    {
      title: '退款方式',
      dataIndex: 'refundMethod',
      key: 'refundMethod',
      width: 120,
      render: (method: string) => refundService.getMethodText(method as any),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={refundService.getStatusColor(status as any)}>
          {refundService.getStatusText(status as any)}
        </Tag>
      ),
      filters: [
        { text: '待审批', value: 'PENDING' },
        { text: '已审批', value: 'APPROVED' },
        { text: '已拒绝', value: 'REJECTED' },
        { text: '处理中', value: 'PROCESSING' },
        { text: '已完成', value: 'COMPLETED' },
        { text: '失败', value: 'FAILED' },
        { text: '已取消', value: 'CANCELLED' },
      ],
      onFilter: (value: any, record: RefundRequest) => record.status === value,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: RefundRequest, b: RefundRequest) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '完成时间',
      dataIndex: 'refundedAt',
      key: 'refundedAt',
      width: 160,
      render: (date: string | undefined) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: RefundRequest) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => showDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card>
              <Statistic
                title="待审批"
                value={getStatusCount('PENDING')}
                suffix="笔"
                valueStyle={{ color: '#faad14' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('PENDING')}
              </div>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已审批"
                value={getStatusCount('APPROVED')}
                suffix="笔"
                valueStyle={{ color: '#108ee9' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('APPROVED')}
              </div>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已拒绝"
                value={getStatusCount('REJECTED')}
                suffix="笔"
                valueStyle={{ color: '#f5222d' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('REJECTED')}
              </div>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="退款失败"
                value={getStatusCount('FAILED')}
                suffix="笔"
                valueStyle={{ color: '#d46b08' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('FAILED')}
              </div>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已取消"
                value={getStatusCount('CANCELLED')}
                suffix="笔"
                valueStyle={{ color: '#bfbfbf' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('CANCELLED')}
              </div>
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="已完成"
                value={getStatusCount('COMPLETED')}
                suffix="笔"
                valueStyle={{ color: '#52c41a' }}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                金额：¥{getStatusAmount('COMPLETED')}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 搜索区域 */}
      <Card 
        title="退款记录查询" 
        extra={
          <Space>
            <Tag color="warning">默认不显示已取消/已拒绝的退款</Tag>
            <span style={{ fontSize: 12, color: '#999' }}>
              如需查看,请在状态中选择对应选项
            </span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="inline">
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            <Col span={6}>
              <Form.Item name="orderNo" style={{ width: '100%' }}>
                <Input placeholder="订单编号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="refundNo" style={{ width: '100%' }}>
                <Input placeholder="退款编号" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" style={{ width: '100%' }}>
                <Select placeholder="退款状态" allowClear>
                  <Select.Option value="PENDING">待审批</Select.Option>
                  <Select.Option value="APPROVED">已审批</Select.Option>
                  <Select.Option value="REJECTED">已拒绝</Select.Option>
                  <Select.Option value="PROCESSING">处理中</Select.Option>
                  <Select.Option value="COMPLETED">已完成</Select.Option>
                  <Select.Option value="FAILED">失败</Select.Option>
                  <Select.Option value="CANCELLED">已取消</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="refundType" style={{ width: '100%' }}>
                <Select placeholder="退款类型" allowClear>
                  <Select.Option value="FULL">全额退款</Select.Option>
                  <Select.Option value="PARTIAL">部分退款</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dateRange" style={{ width: '100%' }}>
                <RangePicker 
                  placeholder={['开始日期', '结束日期']} 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={16} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  搜索
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  导出
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 数据表格 */}
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              fetchRefunds();
              fetchStatistics();
            }}
            loading={loading}
          >
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={refunds}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default RefundRecords;
