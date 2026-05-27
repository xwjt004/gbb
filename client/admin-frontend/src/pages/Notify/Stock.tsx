import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Space, Select, Tag, Card, Row, Col, Statistic,
  DatePicker, message, Modal, Input, Descriptions, Badge,
} from 'antd';
import {
  AlertOutlined, CheckCircleOutlined, SyncOutlined,
  ExclamationCircleOutlined, FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { stockAlertService, StockAlertQuery, StockAlertUpdate } from '@/services/stockAlertService';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

const alertTypeMap: Record<string, { label: string; color: string }> = {
  LOW_STOCK: { label: '低库存', color: 'orange' },
  HIGH_STOCK: { label: '高库存', color: 'blue' },
  OUT_OF_STOCK: { label: '缺货', color: 'red' },
};

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待处理', color: 'red' },
  PROCESSING: { label: '处理中', color: 'blue' },
  RESOLVED: { label: '已解决', color: 'green' },
  IGNORED: { label: '已忽略', color: 'default' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  HIGH: { label: '高', color: 'red' },
  MEDIUM: { label: '中', color: 'orange' },
  LOW: { label: '低', color: 'default' },
};

const StockAlert: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<StockAlertQuery>({});
  const [handleModalOpen, setHandleModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [handleNote, setHandleNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockAlertService.getAlerts({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      });
      const d = (res as any).data || res;
      setAlerts(d.items || []);
      setPagination(prev => ({ ...prev, total: d.total || 0 }));
    } catch {
      message.error('获取预警列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await stockAlertService.getStatistics();
      const d = (res as any).data || res;
      setStats(d);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [fetchAlerts, fetchStats]);

  const handleManualCheck = async () => {
    try {
      message.loading({ content: '正在检测库存...', key: 'check' });
      await stockAlertService.manualCheck();
      message.success({ content: '检测完成', key: 'check' });
      fetchAlerts();
      fetchStats();
    } catch {
      message.error({ content: '检测失败', key: 'check' });
    }
  };

  const openHandleModal = (alert: any) => {
    setCurrentAlert(alert);
    setHandleNote('');
    setHandleModalOpen(true);
  };

  const submitHandle = async (status: string) => {
    if (!currentAlert) return;
    setSubmitting(true);
    try {
      const data: StockAlertUpdate = { status, handleNote };
      await stockAlertService.handleAlert(currentAlert.id, data);
      message.success('处理成功');
      setHandleModalOpen(false);
      fetchAlerts();
      fetchStats();
    } catch {
      message.error('处理失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (alert: any) => {
    setCurrentAlert(alert);
    setDetailModalOpen(true);
  };

  const columns: ColumnsType<any> = [
    {
      title: '预警编号',
      dataIndex: 'alertNo',
      width: 180,
      render: (v: string, r: any) => <a onClick={() => openDetail(r)}>{v}</a>,
    },
    {
      title: '商品',
      dataIndex: 'product',
      width: 200,
      render: (p: any) => p?.name || '-',
    },
    {
      title: '类型',
      dataIndex: 'alertType',
      width: 100,
      render: (v: string) => {
        const m = alertTypeMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '库存/阈值',
      width: 130,
      render: (_: any, r: any) => `${r.currentStock} / ${r.threshold}`,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (v: string) => {
        const m = priorityMap[v] || { label: v, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => {
        const m = statusMap[v] || { label: v, color: 'default' };
        return <Badge status={m.color as any} text={m.label} />;
      },
    },
    {
      title: '预警时间',
      dataIndex: 'alertedAt',
      width: 170,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '处理人',
      width: 120,
      render: (_: any, r: any) => r.handler?.nickname || '-',
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'PENDING' && (
            <Button type="link" size="small" onClick={() => openHandleModal(r)}>
              处理
            </Button>
          )}
          <Button type="link" size="small" onClick={() => openDetail(r)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2 style={{ margin: 0 }}>库存报警</h2>
        </Col>
        <Col>
          <Button icon={<SyncOutlined />} onClick={handleManualCheck}>
            手动检测
          </Button>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="预警总数"
              value={stats.totalCount || 0}
              prefix={<AlertOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待处理"
              value={stats.pendingCount || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: stats.pendingCount > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已解决"
              value={stats.byStatus?.RESOLVED || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="缺货预警"
              value={stats.byType?.OUT_OF_STOCK || 0}
              prefix={<FilterOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
          >
            <Select.Option value="PENDING">待处理</Select.Option>
            <Select.Option value="PROCESSING">处理中</Select.Option>
            <Select.Option value="RESOLVED">已解决</Select.Option>
            <Select.Option value="IGNORED">已忽略</Select.Option>
          </Select>
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 120 }}
            value={filters.alertType}
            onChange={(v) => setFilters(prev => ({ ...prev, alertType: v }))}
          >
            <Select.Option value="LOW_STOCK">低库存</Select.Option>
            <Select.Option value="HIGH_STOCK">高库存</Select.Option>
            <Select.Option value="OUT_OF_STOCK">缺货</Select.Option>
          </Select>
          <Select
            placeholder="优先级"
            allowClear
            style={{ width: 120 }}
            value={filters.priority}
            onChange={(v) => setFilters(prev => ({ ...prev, priority: v }))}
          >
            <Select.Option value="HIGH">高</Select.Option>
            <Select.Option value="MEDIUM">中</Select.Option>
            <Select.Option value="LOW">低</Select.Option>
          </Select>
          <RangePicker
            onChange={(dates) => {
              setFilters(prev => ({
                ...prev,
                startDate: dates?.[0]?.format('YYYY-MM-DD'),
                endDate: dates?.[1]?.format('YYYY-MM-DD'),
              }));
            }}
          />
          <Button onClick={() => {
            setFilters({});
            setPagination(prev => ({ ...prev, current: 1 }));
          }}>
            重置
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={alerts}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setPagination({ current: page, pageSize, total: pagination.total }),
        }}
      />

      <Modal
        title="处理预警"
        open={handleModalOpen}
        onCancel={() => setHandleModalOpen(false)}
        footer={null}
        width={500}
      >
        {currentAlert && (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="编号">{currentAlert.alertNo}</Descriptions.Item>
              <Descriptions.Item label="商品">{currentAlert.product?.name}</Descriptions.Item>
              <Descriptions.Item label="类型">
                <Tag color={alertTypeMap[currentAlert.alertType]?.color}>
                  {alertTypeMap[currentAlert.alertType]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={priorityMap[currentAlert.priority]?.color}>
                  {priorityMap[currentAlert.priority]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前库存">{currentAlert.currentStock}</Descriptions.Item>
              <Descriptions.Item label="阈值">{currentAlert.threshold}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8 }}>处理说明：</div>
              <TextArea
                rows={3}
                value={handleNote}
                onChange={(e) => setHandleNote(e.target.value)}
                placeholder="请输入处理说明"
              />
            </div>
            <Space>
              <Button
                type="primary"
                loading={submitting}
                onClick={() => submitHandle('RESOLVED')}
              >
                标记已解决
              </Button>
              <Button
                loading={submitting}
                onClick={() => submitHandle('IGNORED')}
              >
                忽略
              </Button>
              <Button onClick={() => setHandleModalOpen(false)}>取消</Button>
            </Space>
          </div>
        )}
      </Modal>

      <Modal
        title="预警详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={<Button onClick={() => setDetailModalOpen(false)}>关闭</Button>}
        width={600}
      >
        {currentAlert && (
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="预警编号" span={2}>{currentAlert.alertNo}</Descriptions.Item>
            <Descriptions.Item label="商品名称" span={2}>{currentAlert.product?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="预警类型">
              <Tag color={alertTypeMap[currentAlert.alertType]?.color}>
                {alertTypeMap[currentAlert.alertType]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">
              <Tag color={priorityMap[currentAlert.priority]?.color}>
                {priorityMap[currentAlert.priority]?.label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="当前库存">{currentAlert.currentStock}</Descriptions.Item>
            <Descriptions.Item label="阈值">{currentAlert.threshold}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge status={statusMap[currentAlert.status]?.color as any} text={statusMap[currentAlert.status]?.label} />
            </Descriptions.Item>
            <Descriptions.Item label="预警时间">{dayjs(currentAlert.alertedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="处理人">{currentAlert.handler?.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="处理时间">{currentAlert.handledAt ? dayjs(currentAlert.handledAt).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
            <Descriptions.Item label="处理说明" span={2}>{currentAlert.handleNote || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StockAlert;
