import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Table, Tag, message, Modal, DatePicker, Statistic, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import inTransitService, { InTransitGoods, QueryInTransitParams, ShippingStatus } from '@/services/inTransitService';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InTransitList: React.FC = () => {
  const navigate = useNavigate();
  const [queryForm] = Form.useForm<QueryInTransitParams>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InTransitGoods[]>([]);
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

      const params: QueryInTransitParams = {
        ...values,
        page: page || pagination.page,
        pageSize: pageSize || pagination.pageSize,
      };
      const res = await inTransitService.getList(params);
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
      const s = await inTransitService.getStatistics();
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

  const handleDetail = (record: InTransitGoods) => {
    navigate(`/in-transit/${record.id}`);
  };

  const handleRemove = (record: InTransitGoods) => {
    Modal.confirm({
      title: '确定删除此在途商品记录？',
      content: '删除后数据不可恢复。',
      onOk: async () => {
        try {
          await inTransitService.remove(record.id);
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
      title: '在途单号', 
      dataIndex: 'transitNo', 
      width: 180, 
      render: (_: any, r: InTransitGoods) => (
        <a onClick={() => handleDetail(r)}>{r.transitNo}</a>
      )
    },
    { 
      title: '采购订单号', 
      dataIndex: ['purchaseOrder', 'purchaseNo'], 
      width: 180,
      render: (_: any, r: InTransitGoods) => r.purchaseOrder?.purchaseNo || '-'
    },
    { 
      title: '供应商', 
      dataIndex: ['purchaseOrder', 'supplier', 'name'], 
      width: 150,
      render: (_: any, r: InTransitGoods) => r.purchaseOrder?.supplier?.name || '-'
    },
    { 
      title: '物流公司', 
      dataIndex: 'shippingCompany', 
      width: 120,
      render: (val: string) => val || '-'
    },
    { 
      title: '物流单号', 
      dataIndex: 'trackingNo', 
      width: 150,
      render: (val: string) => val || '-'
    },
    { 
      title: '总数量', 
      dataIndex: 'totalQuantity', 
      width: 100,
      align: 'right' as const,
    },
    { 
      title: '总金额', 
      dataIndex: 'totalAmount', 
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toFixed(2)}`
    },
    { 
      title: '物流状态', 
      dataIndex: 'shippingStatus', 
      width: 100,
      render: (status: ShippingStatus) => (
        <Tag color={inTransitService.getShippingStatusColor(status)}>
          {inTransitService.getShippingStatusText(status)}
        </Tag>
      )
    },
    { 
      title: '预计到货', 
      dataIndex: 'expectedDate', 
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '实际到货', 
      dataIndex: 'actualDate', 
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '是否延迟', 
      dataIndex: 'isDelayed', 
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'warning' : 'success'}>
          {val ? '是' : '否'}
        </Tag>
      )
    },
    { 
      title: '是否异常', 
      dataIndex: 'hasException', 
      width: 90,
      render: (val: boolean) => (
        <Tag color={val ? 'error' : 'success'}>
          {val ? '是' : '否'}
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
      width: 150, 
      render: (_: any, r: InTransitGoods) => (
        <Space>
          <Button type="link" onClick={() => handleDetail(r)}>详情</Button>
          {r.shippingStatus === 'PREPARING' && (
            <Button type="link" danger onClick={() => handleRemove(r)}>删除</Button>
          )}
        </Space>
      )
    },
  ];

  return (
    <div>
      <Card 
        title="在途商品查询" 
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
          <Form.Item name="transitNo" label="在途单号">
            <Input allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="trackingNo" label="物流单号">
            <Input allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="purchaseOrderId" label="采购订单ID">
            <Input allowClear style={{ width: 150 }} placeholder="采购订单ID" />
          </Form.Item>
          <Form.Item name="shippingStatus" label="物流状态">
            <Select allowClear style={{ width: 120 }}>
              <Option value="PREPARING">备货中</Option>
              <Option value="SHIPPED">已发货</Option>
              <Option value="IN_TRANSIT">在途中</Option>
              <Option value="ARRIVED">已到达</Option>
              <Option value="DELIVERED">已交付</Option>
              <Option value="DELAYED">延迟</Option>
              <Option value="EXCEPTION">异常</Option>
            </Select>
          </Form.Item>
          <Form.Item name="isDelayed" label="是否延迟">
            <Select allowClear style={{ width: 100 }}>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="hasException" label="是否异常">
            <Select allowClear style={{ width: 100 }}>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="预计到货日期">
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
              <Statistic title="备货中" value={stats.byStatus?.PREPARING || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="在途中" value={stats.byStatus?.IN_TRANSIT || 0} />
            </Col>
            <Col span={6}>
              <Statistic title="已交付" value={stats.byStatus?.DELIVERED || 0} />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={6}>
              <Statistic title="延迟数" value={stats.delayedCount || 0} valueStyle={{ color: '#faad14' }} />
            </Col>
            <Col span={6}>
              <Statistic title="异常数" value={stats.exceptionCount || 0} valueStyle={{ color: '#ff4d4f' }} />
            </Col>
            <Col span={6}>
              <Statistic title="平均运输天数" value={stats.avgTransitDays || 0} precision={1} suffix="天" />
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

      <Card title="在途商品列表">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          scroll={{ x: 2000, y: 'calc(100vh - 420px)' }}
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

export default InTransitList;
