import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Table, Tag, App, DatePicker, Statistic, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import purchaseOrderService, { PurchaseOrder, QueryPurchaseOrderParams } from '@/services/purchaseOrderService';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const PurchaseOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [queryForm] = Form.useForm<QueryPurchaseOrderParams>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [stats, setStats] = useState<any>(null);

  // 防抖
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
        values.endDate = dateRange[1]?.startOf('day').format('YYYY-MM-DD');
      }
      delete values.dateRange;

      const params: QueryPurchaseOrderParams = {
        ...values,
        page: page || pagination.page,
        pageSize: pageSize || pagination.pageSize,
      };
      const res = await purchaseOrderService.getList(params);
      setData(res.list);
      setPagination(res.pagination);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await purchaseOrderService.getStatistics();
      setStats(s);
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

  const handleCreate = () => {
    navigate('/purchase-orders/create');
  };

  const handleEdit = (record: PurchaseOrder) => {
    navigate(`/purchase-orders/edit/${record.id}`);
  };

  const handleDetail = (record: PurchaseOrder) => {
    navigate(`/purchase-orders/${record.id}`);
  };

  const handleRemove = (record: PurchaseOrder) => {
    modal.confirm({
      title: '确定删除此采购订单？',
      content: '删除后数据不可恢复。',
      onOk: async () => {
        try {
          await purchaseOrderService.remove(record.id);
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
      title: '采购单号', 
      dataIndex: 'purchaseNo', 
      width: 180, 
      render: (_: any, r: PurchaseOrder) => (
        <a onClick={() => handleDetail(r)}>{r.purchaseNo}</a>
      )
    },
    { 
      title: '供应商', 
      dataIndex: ['supplier', 'name'], 
      width: 150,
      render: (_: any, r: PurchaseOrder) => r.supplier?.name || '-'
    },
    { 
      title: '采购日期', 
      dataIndex: 'purchaseDate', 
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '预计到货', 
      dataIndex: 'expectedDate', 
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '总数量', 
      dataIndex: 'totalQuantity', 
      width: 90,
      align: 'right' as const,
    },
    { 
      title: '总金额', 
      dataIndex: 'finalAmount', 
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toFixed(2)}`
    },
    { 
      title: '订单状态', 
      dataIndex: 'status', 
      width: 100,
      render: (status: any) => (
        <Tag color={purchaseOrderService.getStatusColor(status)}>
          {purchaseOrderService.getStatusText(status)}
        </Tag>
      )
    },
    { 
      title: '物流状态', 
      dataIndex: 'shippingStatus', 
      width: 100,
      render: (status: any) => (
        <Tag color={purchaseOrderService.getShippingStatusColor(status)}>
          {purchaseOrderService.getShippingStatusText(status)}
        </Tag>
      )
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
      width: 200, 
      render: (_: any, r: PurchaseOrder) => (
        <Space>
          <Button type="link" onClick={() => handleDetail(r)}>详情</Button>
          {r.status === 'DRAFT' && (
            <>
              <Button type="link" onClick={() => handleEdit(r)}>编辑</Button>
              <Button type="link" danger onClick={() => handleRemove(r)}>删除</Button>
            </>
          )}
        </Space>
      )
    },
  ];

  return (
    <div>
      <Card 
        title="采购订单查询" 
        style={{ marginBottom: 16 }} 
        extra={
          <Space>
            <Button type="primary" onClick={handleCreate}>新增采购订单</Button>
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
          <Form.Item name="purchaseNo" label="采购单号">
            <Input allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="supplierId" label="供应商">
            <Input allowClear style={{ width: 150 }} placeholder="供应商ID" />
          </Form.Item>
          <Form.Item name="status" label="订单状态">
            <Select allowClear style={{ width: 120 }}>
              <Option value="DRAFT">草稿</Option>
              <Option value="PENDING">待审批</Option>
              <Option value="APPROVED">已审批</Option>
              <Option value="REJECTED">已驳回</Option>
              <Option value="IN_TRANSIT">在途</Option>
              <Option value="RECEIVED">已收货</Option>
              <Option value="CANCELLED">已取消</Option>
            </Select>
          </Form.Item>
          <Form.Item name="shippingStatus" label="物流状态">
            <Select allowClear style={{ width: 110 }}>
              <Option value="PENDING">待发货</Option>
              <Option value="SHIPPED">已发货</Option>
              <Option value="IN_TRANSIT">在途</Option>
              <Option value="ARRIVED">已到达</Option>
              <Option value="RECEIVED">已收货</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="采购日期">
            <RangePicker allowEmpty={[true, true]} />
          </Form.Item>
        </Form>
      </Card>

      {stats && (
        <Card title="统计概览" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="总订单数" value={stats.total} />
            </Col>
            <Col span={6}>
              <Statistic title="草稿" value={stats.byStatus?.DRAFT || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="进行中" value={
                (stats.byStatus?.PENDING || 0) + 
                (stats.byStatus?.APPROVED || 0) + 
                (stats.byStatus?.IN_TRANSIT || 0)
              } />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总金额" 
                value={stats.totalAmount || 0} 
                precision={2}
                prefix="¥"
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card title="采购订单列表">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 1500, y: 'calc(100vh - 420px)' }}
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

export default PurchaseOrderList;
