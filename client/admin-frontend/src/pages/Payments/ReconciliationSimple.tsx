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
} from 'antd';
import dayjs from 'dayjs';
import {
  DownloadOutlined,
  SyncOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
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
}

const ReconciliationSimple: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
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
      try {
        const res = await fetch(`/api/v1/reconciliation/simple?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}&platform=${encodeURIComponent(plat)}`);
        if (res.ok) {
          const json = await res.json();
          const items: ReconciliationRecord[] = Array.isArray(json.data) ? json.data : json || [];
          setReconciliationData(items);
          const stats = {
            totalDays: items.length,
            matchedDays: items.filter(item => item.status === 'matched').length,
            totalDifference: items.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0),
            totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
          };
          setStatistics(stats);
        } else {
          setReconciliationData([]);
          setStatistics({ totalDays: 0, matchedDays: 0, totalDifference: 0, totalAmount: 0 });
        }
      } catch (err) {
        console.error('请求对账数据失败', err);
        setReconciliationData([]);
        setStatistics({ totalDays: 0, matchedDays: 0, totalDifference: 0, totalAmount: 0 });
      }
      
    } catch (error) {
      console.error('对账失败:', error);
      message.error('对账失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reconciliationData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    // 构造CSV数据
    const headers = ['日期', '平台', '订单数量', '系统金额', '平台金额', '差异金额', '状态'];
    const csvData = [
      headers.join(','),
      ...reconciliationData.map(record => [
        record.date,
        record.platform,
        record.orderCount,
        record.totalAmount.toFixed(2),
        record.platformAmount.toFixed(2),
        record.difference.toFixed(2),
        record.status === 'matched' ? '已匹配' : record.status === 'mismatched' ? '有差异' : '待处理'
      ].join(','))
    ].join('\n');

    // 下载CSV文件
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `对账报告_${dayjs().format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    message.success('对账报告导出成功');
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
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            onClick={() => message.info(`查看 ${record.date} 的详细信息`)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: '对账概览',
      children: (
        <div>
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
            <Space size="middle" wrap>
              <span>日期范围：</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                style={{ width: 240 }}
              />
              
              <span>支付平台：</span>
              <Select
                value={platform}
                onChange={setPlatform}
                style={{ width: 120 }}
              >
                <Option value="ALL">全部</Option>
                <Option value="微信支付">微信支付</Option>
                <Option value="支付宝">支付宝</Option>
                <Option value="现金">现金</Option>
              </Select>
              
              <Button
                type="primary"
                icon={<SyncOutlined />}
                loading={loading}
                onClick={() => handleReconciliation()}
              >
                开始对账
              </Button>
              
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={reconciliationData.length === 0}
              >
                导出报告
              </Button>
            </Space>
          </Card>

          {/* 对账表格 */}
          <Card title="对账明细">
            <Table
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
      key: 'statistics',
      label: '统计分析',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3>统计分析功能</h3>
            <p>此功能正在开发中，敬请期待...</p>
          </div>
        </Card>
      ),
    },
    {
      key: 'correction',
      label: '冲账退款',
      children: (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3>冲账退款功能</h3>
            <p>此功能正在开发中，敬请期待...</p>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>对账管理</Title>
      
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
};

export default ReconciliationSimple;
