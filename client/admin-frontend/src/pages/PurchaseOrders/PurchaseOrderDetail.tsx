import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Table, Tag, Button, Space, App, Modal, Form, Input, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import purchaseOrderService, { PurchaseOrder } from '@/services/purchaseOrderService';
import inTransitService, { InTransitGoods } from '@/services/inTransitService';
import inboundService from '@/services/inboundService';
import dayjs from 'dayjs';

const PurchaseOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);
  const [shippingForm] = Form.useForm();
  const [inTransitList, setInTransitList] = useState<InTransitGoods[]>([]);
  const [inboundList, setInboundList] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadDetail();
      loadInTransit();
      loadInbound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInTransit = async () => {
    if (!id) return;
    try {
      const res = await inTransitService.getByPurchaseOrderId(id);
      // 后端返回 {code, message, data: [...]}
      setInTransitList(res.data || []);
    } catch {}
  };

  const loadInbound = async () => {
    if (!id) return;
    try {
      const res = await inboundService.getList({ purchaseOrderId: id, page: 1, pageSize: 50 });
      setInboundList(res.data?.list || []);
    } catch {}
  };

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderService.getById(id!);
      setDetail(data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/purchase-orders');
  };

  const handleEdit = () => {
    navigate(`/purchase-orders/edit/${id}`);
  };

  const handleSubmit = async () => {
    modal.confirm({
      title: '确认提交',
      content: '提交后将无法修改，是否继续？',
      onOk: async () => {
        try {
          await purchaseOrderService.submit(id!);
          message.success('提交成功');
          loadDetail();
        } catch (e: any) {
          message.error(e?.message || '提交失败');
        }
      },
    });
  };

  // 审批操作已迁移到独立审批页面

  const handleReceive = async () => {
    modal.confirm({
      title: '确认收货',
      content: '确认收货后订单状态将变为已完成，是否继续？',
      onOk: async () => {
        try {
          await purchaseOrderService.confirmReceive(id!, {
            receivedQuantity: detail?.totalQuantity || 0,
            qualityCheckStatus: 'PASS',
          });
          message.success('收货成功');
          loadDetail();
        } catch (e: any) {
          message.error(e?.message || '收货失败');
        }
      },
    });
  };

  const handleUpdateShipping = () => {
    shippingForm.setFieldsValue({
      trackingNo: detail?.trackingNo,
    });
    setShippingModalVisible(true);
  };

  const handleShippingSubmit = async () => {
    try {
      const values = await shippingForm.validateFields();
      await purchaseOrderService.updateShipping(id!, {
        trackingNo: values.trackingNo,
        shippingStatus: 'SHIPPED',
      });
      message.success('物流信息更新成功');
      setShippingModalVisible(false);
      loadDetail();
    } catch (e: any) {
      message.error(e?.message || '更新失败');
    }
  };

  if (loading || !detail) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns = [
    {
      title: '商品编号',
      dataIndex: ['product', 'productNo'],
      width: 120,
    },
    {
      title: '商品名称',
      dataIndex: ['product', 'name'],
      width: 150,
    },
    {
      title: '规格',
      dataIndex: ['product', 'specification'],
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '品牌',
      dataIndex: ['product', 'brand'],
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '单位',
      dataIndex: ['product', 'unit'],
      width: 60,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 100,
      render: (val: number) => `¥${Number(val).toFixed(2)}`,
    },
    {
      title: '小计',
      dataIndex: 'totalPrice',
      width: 100,
      render: (val: number) => `¥${Number(val).toFixed(2)}`,
    },
    {
      title: '建议零售价',
      dataIndex: ['product', 'salePrice'],
      width: 100,
      render: (val: number) => val ? `¥${Number(val).toFixed(2)}` : '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
    },
  ];

  const renderActions = () => {
    const actions: React.ReactNode[] = [
      <Button key="back" onClick={handleBack}>返回</Button>,
    ];

    if (detail.status === 'DRAFT') {
      actions.push(
        <Button key="edit" onClick={handleEdit}>编辑</Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>提交审批</Button>
      );
    }

    if (detail.status === 'PENDING') {
      actions.push(
        <Button key="go-approval" type="primary" onClick={() => navigate(`/purchase-orders/approve/${detail.id}`)}>前往审批</Button>
      );
    }

    if (detail.status === 'APPROVED' && detail.shippingStatus !== 'RECEIVED') {
      actions.push(
        <Button key="shipping" onClick={handleUpdateShipping}>更新物流</Button>
      );
    }

    if (detail.status === 'IN_TRANSIT' && detail.shippingStatus === 'ARRIVED') {
      actions.push(
        <Button key="receive" type="primary" onClick={handleReceive}>确认收货</Button>
      );
    }

    return actions;
  };

  return (
    <div>
      <Card 
        title={`采购订单详情 - ${detail.purchaseNo}`}
        extra={<Space>{renderActions()}</Space>}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="订单编号">{detail.purchaseNo}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            <Tag color={purchaseOrderService.getStatusColor(detail.status)}>
              {purchaseOrderService.getStatusText(detail.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="供应商">
            {detail.supplier?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="供应商编号">
            {detail.supplier?.supplierNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="采购日期">
            {detail.purchaseDate ? dayjs(detail.purchaseDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="预计到货日期">
            {detail.expectedDate ? dayjs(detail.expectedDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="物流状态">
            {detail.shippingStatus ? (
              <Tag color={purchaseOrderService.getShippingStatusColor(detail.shippingStatus)}>
                {purchaseOrderService.getShippingStatusText(detail.shippingStatus)}
              </Tag>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="物流单号">
            {detail.trackingNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="实际到货日期">
            {detail.actualDate ? dayjs(detail.actualDate).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="收货日期">
            {detail.receivedAt ? dayjs(detail.receivedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="商品总额">
            ¥{Number(detail.totalAmount).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="运费">
            ¥{Number(detail.shippingFee).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="折扣金额">
            ¥{Number(detail.discountAmount).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="实付金额">
            ¥{Number(detail.finalAmount).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {detail.remark || '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* 在途商品列表 */}
        {inTransitList.length > 0 && (
          <Card title="在途商品" style={{ marginTop: 16 }}>
            {inTransitList.map((item) => (
              <div key={item.id} style={{ marginBottom: 8 }}>
                <a onClick={() => navigate(`/in-transit/${item.id}`)}>{item.transitNo}</a>
                {' - '}
                <Tag color={inTransitService.getShippingStatusColor(item.shippingStatus)}>
                  {inTransitService.getShippingStatusText(item.shippingStatus)}
                </Tag>
                {item.trackingNo && <span style={{ marginLeft: 8 }}>物流单号：{item.trackingNo}</span>}
              </div>
            ))}
          </Card>
        )}

        {/* 入库记录列表 */}
        {inboundList.length > 0 && (
          <Card title="入库记录" style={{ marginTop: 16 }}>
            {inboundList.map((record: any) => (
              <div key={record.id} style={{ marginBottom: 8 }}>
                <a onClick={() => navigate(`/inbound/${record.id}`)}>{record.inboundNo}</a>
                {' - '}
                <Tag color={inboundService.getStatusColor(record.inboundStatus)}>
                  {inboundService.getStatusText(record.inboundStatus)}
                </Tag>
              </div>
            ))}
          </Card>
        )}
      </Card>

      <Card title="采购明细" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={detail.items}
          pagination={false}
        />
      </Card>

      <Modal
        title="更新物流信息"
        open={shippingModalVisible}
        onOk={handleShippingSubmit}
        onCancel={() => setShippingModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={shippingForm} layout="vertical">
          <Form.Item 
            name="trackingNo" 
            label="物流单号"
            rules={[{ required: true, message: '请输入物流单号' }]}
          >
            <Input placeholder="请输入物流单号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseOrderDetail;
