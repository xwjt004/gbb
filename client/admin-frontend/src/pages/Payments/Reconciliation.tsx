import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  DatePicker,
  Button,
  Space,
  Select,
  Statistic,
  Row,
  Col,
  message,
  Typography,
  Tag,
  Tabs,
  Empty,
  Alert,
  Form,
  Dropdown,
} from 'antd';
import dayjs from 'dayjs';
import {
  SyncOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import OrderAmountStatistics from '../Reconciliation/components/OrderAmountStatistics';
import RefundStatistics from '../Reconciliation/components/RefundStatistics';
import PaymentStatistics from '../Reconciliation/components/PaymentStatistics';
import RefundCorrectionModal from '../Reconciliation/components/RefundCorrectionModal';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title } = Typography;

interface ReconciliationRecord {
  id: string;
  date: string;
  platform: string;
  orderCount: number;
  totalAmount: number;
  platformAmount: number;
  difference: number;
  status: 'matched' | 'mismatched' | 'pending';
  details?: {
    systemOrders: any[];
    platformOrders: any[];
  };
}

const Reconciliation: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [platform, setPlatform] = useState<string>('ALL');
  const [reconciliationData, setReconciliationData] = useState<ReconciliationRecord[]>([]);
  const [statistics, setStatistics] = useState({
    totalDays: 0,
    matchedDays: 0,
    totalDifference: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    // 默认加载最近7天的对账数据
    const today = dayjs();
    const lastWeek = today.subtract(7, 'day');
    setDateRange([lastWeek, today]);
  handleReconciliation(lastWeek.toDate(), today.toDate(), 'ALL');
  }, []);

  const handleReconciliation = async (startDate?: Date, endDate?: Date, selectedPlatform?: string) => {
    try {
      setLoading(true);
      
      const start = startDate || dateRange?.[0]?.toDate();
      const end = endDate || dateRange?.[1]?.toDate();
      const plat = selectedPlatform || platform;
      
      if (!start || !end) {
        message.warning('请选择日期范围');
        return;
      }
      // 调用后端 API 获取对账数据（接口可能需要调整）
      const params = {
        start: dayjs(start).format('YYYY-MM-DD'),
        end: dayjs(end).format('YYYY-MM-DD'),
        platform: plat === 'ALL' ? undefined : plat,
      } as any;

      let respData: ReconciliationRecord[] = [];
      try {
        const res = await api.get('/api/v1/reconciliation/simple', { params });
        if (res && res.data && Array.isArray(res.data.items)) {
          // 兼容后端返回结构 { items: [...] }
          respData = res.data.items.map((it: any) => ({
            id: it.id || `${it.date}_${it.platform}`,
            date: it.date || it.day || '',
            platform: it.platform || it.method || '未知',
            orderCount: Number(it.orderCount || it.orders || 0),
            totalAmount: Number(it.totalAmount || it.amount || 0),
            platformAmount: Number(it.platformAmount || it.remoteAmount || 0),
            difference: Number((it.totalAmount || it.amount || 0) - (it.platformAmount || it.remoteAmount || 0)),
            status: it.status || (Math.abs(((it.totalAmount || it.amount || 0) - (it.platformAmount || it.remoteAmount || 0))) < 1 ? 'matched' : 'mismatched'),
            details: it.details || undefined,
          }));
        }
      } catch (err) {
        // 请求失败时记录日志并保持空数据
        console.warn('获取对账数据失败', err);
        respData = [];
      }

      setReconciliationData(respData);

      // 计算统计数据
      const stats = {
        totalDays: respData.length,
        matchedDays: respData.filter(item => item.status === 'matched').length,
        totalDifference: respData.reduce((sum, item) => sum + Math.abs(item.difference), 0),
        totalAmount: respData.reduce((sum, item) => sum + item.totalAmount, 0),
      };
      setStatistics(stats);
      
    } catch (error) {
      console.error('对账失败:', error);
      message.error('对账失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取导出数据
  const getExportData = () => {
    if (reconciliationData.length === 0) {
      message.warning('暂无数据可导出');
      return null;
    }

    const headers = ['日期', '平台', '订单数量', '系统金额', '平台金额', '差异金额', '状态'];
    const rows = reconciliationData.map(record => [
      record.date,
      record.platform,
      record.orderCount,
      record.totalAmount.toFixed(2),
      record.platformAmount.toFixed(2),
      record.difference.toFixed(2),
      record.status === 'matched' ? '已匹配' : record.status === 'mismatched' ? '有差异' : '待处理'
    ]);

    return {
      headers,
      rows,
      title: `对账报告 ${dayjs().format('YYYY-MM-DD')}`,
      dateRange: dateRange ? 
        `${dayjs(dateRange[0]).format('YYYY-MM-DD')} 至 ${dayjs(dateRange[1]).format('YYYY-MM-DD')}` : 
        '全部日期',
      platform: platform === 'ALL' ? '全部平台' : platform,
    };
  };

  // 导出为 Excel
  const handleExportExcel = () => {
    const data = getExportData();
    if (!data) return;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [`${data.title}（${data.dateRange}）`],
      [`支付平台：${data.platform}`],
      [],
      data.headers,
      ...data.rows
    ]);

    // 设置标题合并单元格
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
    ];

    XLSX.utils.book_append_sheet(wb, ws, '对账明细');
    XLSX.writeFile(wb, `对账报告_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    
    message.success('Excel报告导出成功');
  };

  // 导出为 PDF
  const handleExportPDF = () => {
    const data = getExportData();
    if (!data) return;

    const doc = new jsPDF();
    
    // 添加标题
    doc.setFontSize(16);
    doc.text(data.title, 14, 15);
    
    // 添加筛选条件
    doc.setFontSize(10);
    doc.text(`时间范围：${data.dateRange}`, 14, 25);
    doc.text(`支付平台：${data.platform}`, 14, 30);

    // 添加表格
    autoTable(doc, {
      head: [data.headers],
      body: data.rows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 25 }, // 日期
        1: { cellWidth: 20 }, // 平台
        2: { cellWidth: 20, halign: 'right' }, // 订单数量
        3: { cellWidth: 25, halign: 'right' }, // 系统金额
        4: { cellWidth: 25, halign: 'right' }, // 平台金额
        5: { cellWidth: 25, halign: 'right' }, // 差异金额
        6: { cellWidth: 20 }, // 状态
      },
    });

    // 添加页脚
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `第 ${i} 页，共 ${pageCount} 页`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`对账报告_${dayjs().format('YYYY-MM-DD')}.pdf`);
    message.success('PDF报告导出成功');
  };

  const handleRefundCorrectionSubmit = (data: any) => {
    console.log('冲账退款申请:', data);
    message.success('冲账退款申请已提交，等待审核');
  };

  const columns: ColumnsType<ReconciliationRecord> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: (platform) => {
        const colorMap: { [key: string]: string } = {
          '微信支付': 'green',
          '支付宝': 'blue',
          '现金': 'orange',
        };
        return <Tag color={colorMap[platform] || 'default'}>{platform}</Tag>;
      },
    },
    {
      title: '订单数量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right',
    },
    {
      title: '系统金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '平台金额',
      dataIndex: 'platformAmount',
      key: 'platformAmount',
      width: 120,
      align: 'right',
      render: (amount) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '差异金额',
      dataIndex: 'difference',
      key: 'difference',
      width: 120,
      align: 'right',
      render: (difference) => (
        <span style={{ 
          color: Math.abs(difference) < 1 ? '#52c41a' : '#ff4d4f',
          fontWeight: Math.abs(difference) > 0 ? 'bold' : 'normal'
        }}>
          {difference >= 0 ? '+' : ''}¥{difference.toFixed(2)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          matched: { color: 'success', text: '已匹配', icon: <CheckCircleOutlined /> },
          mismatched: { color: 'error', text: '有差异', icon: <ExclamationCircleOutlined /> },
          pending: { color: 'processing', text: '待处理', icon: <SyncOutlined /> },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
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
            size="small"
            onClick={() => handleViewDetails(record)}
          >
            查看详情
          </Button>
          {record.status === 'mismatched' && (
            <Button 
              type="link" 
              size="small" 
              danger
              onClick={() => handleMarkException(record)}
            >
              标记异常
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handleViewDetails = (record: ReconciliationRecord) => {
    message.info(`查看 ${record.date} 的详细对账信息`);
    // 这里可以打开详情弹窗或跳转到详情页面
  };

  const handleMarkException = (record: ReconciliationRecord) => {
    message.warning(`标记 ${record.date} 为异常订单`);
    // 这里可以实现标记异常的逻辑
  };

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ marginBottom: 0 }}>对账管理中心</Title>
        </Col>
        <Col>
          <Space>
            <Button.Group>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportExcel}
                disabled={reconciliationData.length === 0}
              >
                导出 Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
                disabled={reconciliationData.length === 0}
              >
                导出 PDF
              </Button>
            </Button.Group>

            <Dropdown
              menu={{
                items: [
                  {
                    label: '导出全部交易明细',
                    key: 'export-all',
                    icon: <FileExcelOutlined />,
                    onClick: () => message.info('导出全部交易明细 - 开发中'),
                  },
                  {
                    label: '重新对账',
                    key: 'reconcile',
                    icon: <SyncOutlined />,
                    onClick: () => handleReconciliation(),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    label: '对账设置',
                    key: 'settings',
                    onClick: () => message.info('对账设置 - 开发中'),
                  },
                ],
              }}
            >
              <Button>
                更多功能
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>
      
      {/* 功能选项卡 */}
      <Card style={{ marginBottom: 24 }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: '对账概览',
              children: (
                <div>
                  {/* 无数据或出错提示 */}
                  {!loading && reconciliationData.length === 0 && dateRange && (
                    <Alert
                      style={{ marginBottom: 24 }}
                      message="暂无对账数据"
                      description={
                        <span>
                          在 {dayjs(dateRange[0]).format('YYYY-MM-DD')} 至{' '}
                          {dayjs(dateRange[1]).format('YYYY-MM-DD')} 期间
                          {platform !== 'ALL' ? `的${platform}平台` : ''}
                          暂无对账记录
                        </span>
                      }
                      type="info"
                      showIcon
                    />
                  )}

                  {/* 统计卡片 */}
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="对账天数"
                          value={statistics.totalDays}
                          suffix="天"
                          prefix={<DollarOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="匹配天数"
                          value={statistics.matchedDays}
                          suffix="天"
                          valueStyle={{ color: '#3f8600' }}
                          prefix={<CheckCircleOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="总差异金额"
                          value={statistics.totalDifference}
                          precision={2}
                          prefix="¥"
                          valueStyle={{ color: statistics.totalDifference > 0 ? '#cf1322' : '#3f8600' }}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="总交易金额"
                          value={statistics.totalAmount}
                          precision={2}
                          prefix="¥"
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* 搜索控件 */}
                  <Card style={{ marginBottom: 24 }}>
                    <Form layout="inline" style={{ marginBottom: 16 }}>
                      <Form.Item label="日期范围" required>
                        <RangePicker
                          value={dateRange as any}
                          onChange={(dates: any) => {
                            setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                            if (dates) {
                              // 日期变化时自动触发查询
                              handleReconciliation(dates[0].toDate(), dates[1].toDate(), platform);
                            }
                          }}
                          style={{ width: 240 }}
                        />
                      </Form.Item>
                      
                      <Form.Item label="支付平台">
                        <Select
                          value={platform}
                          onChange={(value) => {
                            setPlatform(value);
                            if (dateRange) {
                              // 平台变化时自动触发查询
                              handleReconciliation(dateRange[0].toDate(), dateRange[1].toDate(), value);
                            }
                          }}
                          style={{ width: 120 }}
                        >
                          <Option value="ALL">全部</Option>
                          <Option value="微信支付">微信支付</Option>
                          <Option value="支付宝">支付宝</Option>
                          <Option value="现金">现金</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item>
                        <Space>
                          <Button
                            type="primary"
                            icon={<SyncOutlined />}
                            loading={loading}
                            onClick={() => handleReconciliation()}
                          >
                            刷新数据
                          </Button>
                          
                          <Button
                            type="default"
                            danger
                            onClick={() => setRefundModalVisible(true)}
                          >
                            冲账退款
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 对账表格 */}
                  <Card 
                    title="对账明细"
                    extra={
                      reconciliationData.length > 0 ? (
                        <Alert 
                          message={`共 ${reconciliationData.length} 条记录，${statistics.matchedDays} 天已匹配`}
                          type={statistics.totalDifference === 0 ? 'success' : 'warning'}
                          showIcon
                          style={{ marginBottom: 0 }}
                        />
                      ) : null
                    }
                  >
                    <Table
                      locale={{
                        emptyText: (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                              loading ? '加载中...' : (
                                <span>
                                  暂无对账数据
                                  <br />
                                  <Button 
                                    type="link"
                                    onClick={() => handleReconciliation()}
                                  >
                                    点击刷新
                                  </Button>
                                </span>
                              )
                            }
                          />
                        )
                      }}
                      columns={columns}
                      dataSource={reconciliationData}
                      rowKey="id"
                      loading={loading}
                      scroll={{ x: 900 }}
                      pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条记录`,
                      }}
                      summary={() => (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <strong>合计</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <strong>{reconciliationData.reduce((sum, item) => sum + item.orderCount, 0)}</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <strong>¥{reconciliationData.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4} align="right">
                            <strong>¥{reconciliationData.reduce((sum, item) => sum + item.platformAmount, 0).toFixed(2)}</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <strong style={{ 
                              color: statistics.totalDifference > 0 ? '#ff4d4f' : '#52c41a' 
                            }}>
                              ¥{reconciliationData.reduce((sum, item) => sum + item.difference, 0).toFixed(2)}
                            </strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6}>-</Table.Summary.Cell>
                          <Table.Summary.Cell index={7}>-</Table.Summary.Cell>
                        </Table.Summary.Row>
                      )}
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'orderStats',
              label: '订单金额统计',
              children: <OrderAmountStatistics />,
            },
            {
              key: 'refundStats',
              label: '退款统计',
              children: <RefundStatistics />,
            },
            {
              key: 'paymentStats',
              label: '收款统计',
              children: <PaymentStatistics />,
            },
            {
              key: 'vouchers',
              label: '凭证统计',
              children: (
                <Card>
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <h3>凭证统计功能</h3>
                    <p>支付凭证管理、凭证完整性检查等功能开发中...</p>
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </Card>

      {/* 冲账退款弹窗 */}
      <RefundCorrectionModal
        visible={refundModalVisible}
        onCancel={() => setRefundModalVisible(false)}
        onSubmit={handleRefundCorrectionSubmit}
      />
    </div>
  );
};

export default Reconciliation;
