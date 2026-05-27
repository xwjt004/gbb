import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Button, Space, App, Form, Input, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import purchaseOrderService, { PurchaseOrder } from '@/services/purchaseOrderService';
import dayjs from 'dayjs';
import { Table } from 'antd';

const PurchaseOrderApproval: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleBack = () => navigate(`/purchase-orders/${id}`);

  const handleApprove = () => {
    form.validateFields().then(async (values) => {
      modal.confirm({
        title: '确认审批通过',
        content: values.approvalRemark ? `审批意见：${values.approvalRemark}` : '确认审批通过该订单？',
        onOk: async () => {
          try {
            const currentUser = localStorage.getItem('userName') || '系统管理员';
            await purchaseOrderService.approve(id!, currentUser, values.approvalRemark);
            message.success('审批通过');
            navigate(`/purchase-orders/${id}`);
          } catch (e: any) {
            message.error(e?.message || '审批失败');
          }
        },
      });
    }).catch(() => {});
  };

  const handleReject = () => {
    form.validateFields().then(async (values) => {
      if (!values.rejectReason) {
        form.setFields([{
          name: 'rejectReason',
          errors: ['请填写驳回原因'],
        }]);
        return;
      }

      modal.confirm({
        title: '确认驳回',
        content: `驳回原因：${values.rejectReason}`,
        okText: '确认驳回',
        okType: 'danger',
        onOk: async () => {
          try {
            const currentUser = localStorage.getItem('userName') || '系统管理员';
            await purchaseOrderService.reject(id!, currentUser, values.rejectReason);
            message.success('已驳回');
            navigate(`/purchase-orders/${id}`);
          } catch (e: any) {
            message.error(e?.message || '驳回失败');
          }
        },
      });
    }).catch(() => {});
  };

  if (loading || !detail) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={`采购订单审批 - ${detail.purchaseNo}`}
        extra={<Space>
          <Button onClick={handleBack}>返回详情</Button>
        </Space>}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="订单编号">{detail.purchaseNo}</Descriptions.Item>
          <Descriptions.Item label="供应商">{detail.supplier?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="采购日期">{detail.purchaseDate ? dayjs(detail.purchaseDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
          <Descriptions.Item label="预计到货日期">{detail.expectedDate ? dayjs(detail.expectedDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
          <Descriptions.Item label="商品总额">¥{Number(detail.totalAmount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="运费">¥{Number(detail.shippingFee).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="折扣金额">¥{Number(detail.discountAmount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="实付金额">¥{Number(detail.finalAmount).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>{detail.remark || '-'}</Descriptions.Item>
        </Descriptions>

          <Card title="采购明细" style={{ marginTop: 16 }}>
            <Table
              rowKey="id"
              size="small"
              dataSource={detail.items || []}
              pagination={false}
              columns={[
                { title: '商品编号', dataIndex: ['product', 'productNo'], width: 140 },
                { title: '商品名称', dataIndex: ['product', 'name'], width: 220 },
                { title: '规格', dataIndex: ['product', 'specification'], width: 120, render: (v: any) => v || '-' },
                { title: '数量', dataIndex: 'quantity', width: 80 },
                { title: '单价', dataIndex: 'unitPrice', width: 100, render: (v: any) => `¥${Number(v || 0).toFixed(2)}` },
                { title: '小计', key: 'subtotal', render: (_: any, record: any) => `¥${Number((record.quantity || 0) * (record.unitPrice || 0)).toFixed(2)}` },
              ]}
            />
          </Card>

        <Card title="审批意见" style={{ marginTop: 16 }}>
          <Form form={form} layout="vertical">
            <Form.Item name="approvalRemark" label="审批意见（选填）">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="rejectReason" label="驳回原因（驳回必填）">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" onClick={handleApprove}>审批通过</Button>
                <Button danger onClick={handleReject}>驳回</Button>
                <Button onClick={handleBack}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Card>
    </div>
  );
};

export default PurchaseOrderApproval;
