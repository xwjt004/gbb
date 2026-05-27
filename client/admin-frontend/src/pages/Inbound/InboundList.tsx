import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Table, Tag, DatePicker, Statistic, Row, Col, App } from 'antd';
import { useNavigate } from 'react-router-dom';
import inboundService, { InboundRecord, QueryInboundParams, InboundStatus, QualityCheckStatus } from '@/services/inboundService';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InboundList: React.FC = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [queryForm] = Form.useForm<QueryInboundParams>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboundRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState<any>(null);

  const debounceRef = React.useRef<number | undefined>();

  const loadData = async (page?: number, pageSize?: number) => {
    try {
      setLoading(true);
      const rawValues: any = queryForm.getFieldsValue();
      const values: any = { ...rawValues };
      
      // 日期范围转换
      const dateRange: any = rawValues.dateRange;
      if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
        values.startDate = dateRange[0]?.startOf('day').format('YYYY-MM-DD');
        values.endDate = dateRange[1]?.endOf('day').format('YYYY-MM-DD');
      }
      delete values.dateRange;

      const params: QueryInboundParams = {
        ...values,
        page: page || pagination.page,
        pageSize: pageSize || pagination.pageSize,
      };
      const res = await inboundService.getList(params);
      setData(res.data.list);
      setPagination(res.data.pagination);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await inboundService.getStatistics();
      setStats(s.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadData(1, pagination.pageSize);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadData(1, pagination.pageSize);
  };

  const handleDetail = (record: InboundRecord) => {
    navigate(`/inbound/${record.id}`);
  };

  const handleRemove = (record: InboundRecord) => {
    modal.confirm({
      title: '确定删除此入库记录？',
      content: '删除后数据不可恢复。',
      onOk: async () => {
        try {
          await inboundService.remove(record.id);
          message.success('删除成功');
          loadData();
          loadStats();
        } catch (e: any) {
          message.error(e?.message || '删除失败');
        }
      },
    });
  };

  const columns = [
    { 
      title: '入库单号', 
      dataIndex: 'inboundNo', 
      width: 180, 
      render: (_: any, r: InboundRecord) => (
        <a onClick={() => handleDetail(r)}>{r.inboundNo}</a>
      )
    },
    { 
      title: '采购订单号', 
      dataIndex: ['purchaseOrder', 'purchaseNo'], 
      width: 180,
      render: (_: any, r: InboundRecord) => r.purchaseOrder?.purchaseNo || '-'
    },
    { 
      title: '供应商', 
      dataIndex: ['purchaseOrder', 'supplier', 'name'], 
      width: 150,
      render: (_: any, r: InboundRecord) => r.purchaseOrder?.supplier?.name || '-'
    },
    { 
      title: '入库日期', 
      dataIndex: 'inboundDate', 
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '预计数量', 
      dataIndex: 'expectedQuantity', 
      width: 100,
      align: 'right' as const,
    },
    { 
      title: '实际数量', 
      dataIndex: 'actualQuantity', 
      width: 100,
      align: 'right' as const,
    },
    { 
      title: '合格数量', 
      dataIndex: 'qualifiedQuantity', 
      width: 100,
      align: 'right' as const,
    },
    { 
      title: '质检状态', 
      dataIndex: 'qualityCheckStatus', 
      width: 100,
      render: (status: QualityCheckStatus) => (
        <Tag color={inboundService.getQualityStatusColor(status)}>
          {inboundService.getQualityStatusText(status)}
        </Tag>
      )
    },
    { 
      title: '入库状态', 
      dataIndex: 'inboundStatus', 
      width: 100,
      render: (status: InboundStatus) => (
        <Tag color={inboundService.getStatusColor(status)}>
          {inboundService.getStatusText(status)}
        </Tag>
      )
    },
    { 
      title: '仓库位置', 
      dataIndex: 'warehouseId', 
      width: 120,
      render: (id: string) => id || '-'
    },
    { 
      title: '创建时间', 
      dataIndex: 'createdAt', 
      width: 160,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
    },
    { 
      title: '操作', 
      fixed: 'right' as const, 
      width: 150, 
      render: (_: any, r: InboundRecord) => (
        <Space>
          <Button type="link" onClick={() => handleDetail(r)}>详情</Button>
          {r.inboundStatus === 'PENDING' && (
            <Button type="link" danger onClick={() => handleRemove(r)}>删除</Button>
          )}
        </Space>
      )
    },
  ];

  return (
    <div>
      <Card 
        title="入库记录查询" 
        style={{ marginBottom: 16 }} 
        extra={
          <Space>
            <Button onClick={handleSearch}>查询</Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        }
      >
        <Form 
          form={queryForm} 
          layout="inline"
          onValuesChange={() => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
              loadData(1, pagination.pageSize);
            }, 300);
          }}
        >
          <Form.Item name="inboundNo" label="入库单号">
            <Input allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="purchaseOrderId" label="采购订单ID">
            <Input allowClear style={{ width: 150 }} placeholder="采购订单ID" />
          </Form.Item>
          <Form.Item name="status" label="入库状态">
            <Select allowClear style={{ width: 120 }}>
              <Option value="PENDING">待入库</Option>
              <Option value="IN_PROGRESS">入库中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
          </Form.Item>
          <Form.Item name="qualityStatus" label="质检状态">
            <Select allowClear style={{ width: 120 }}>
              <Option value="PENDING">待质检</Option>
              <Option value="IN_PROGRESS">质检中</Option>
              <Option value="PASSED">已通过</Option>
              <Option value="FAILED">未通过</Option>
              <Option value="PARTIAL">部分通过</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="入库日期">
            <RangePicker allowEmpty={[true, true]} />
          </Form.Item>
        </Form>
      </Card>

      {stats && (
        <Card title="统计概览" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总记录数" value={stats.total} />
            </Col>
            <Col span={6}>
              <Statistic title="待入库" value={stats.byStatus?.PENDING || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="入库中" value={stats.byStatus?.IN_PROGRESS || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="已完成" value={stats.byStatus?.COMPLETED || 0} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic 
                title="平均合格率" 
                value={stats.avgQualifiedRate || 0} 
                precision={2}
                suffix="%"
              />
            </Col>
            <Col span={6}>
              <Statistic title="质检通过" value={stats.byQualityStatus?.PASSED || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="质检未通过" value={stats.byQualityStatus?.FAILED || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="部分通过" value={stats.byQualityStatus?.PARTIAL || 0} />
            </Col>
          </Row>
        </Card>
      )}

      <Card title="入库记录列表">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1800, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, ps) => loadData(p, ps),
          }}
        />
      </Card>
    </div>
  );
};

export default InboundList;
