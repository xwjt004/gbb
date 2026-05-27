import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Steps, Modal, Form, Input, InputNumber, Select, DatePicker, Checkbox, Table, App } from 'antd';
import inboundService, { InboundRecord, StartQualityCheckDto, CompleteQualityCheckDto, ConfirmInboundDto, CancelInboundDto, QualityCheckStatus } from '@/services/inboundService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const InboundDetail: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboundRecord | null>(null);
  const [startQCForm] = Form.useForm();
  const [completeQCForm] = Form.useForm();
  const [confirmForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [showStartQC, setShowStartQC] = useState(false);
  const [showCompleteQC, setShowCompleteQC] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const loadData = async () => {
    // 支持通过 inTransitId 查询参数查找入库记录
    const inTransitId = searchParams.get('inTransitId');
    
    if (inTransitId) {
      // 通过在途ID查找入库记录
      try {
        setLoading(true);
        const listUrl = `/inbound/list?inTransitId=${inTransitId}&page=1&pageSize=1`;void listUrl;
        const listRes = await inboundService.getList({ inTransitId, page: 1, pageSize: 1 } as any);
        if (listRes.data.list.length > 0) {
          const inboundId = listRes.data.list[0].id;
          // 重定向到正确的入库详情URL
          navigate(`/inbound/${inboundId}`, { replace: true });
          return;
        } else {
          message.error('未找到对应的入库记录');
          navigate('/inbound', { replace: true });
          return;
        }
      } catch (e: any) {
        message.error(e?.message || '查找入库记录失败');
        setLoading(false);
        return;
      }
    }
    
    // 通过入库ID直接加载
    if (!id) return;
    try {
      setLoading(true);
      const res = await inboundService.getDetail(id);
      setData(res.data);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, searchParams]);

  const handleStartQC = async (values: StartQualityCheckDto) => {
    if (!id) return;
    try {
      await inboundService.startQualityCheck(id, values);
      message.success('已开始质检');
      setShowStartQC(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleCompleteQC = async (values: CompleteQualityCheckDto) => {
    if (!id) return;
    try {
      await inboundService.completeQualityCheck(id, values);
      message.success('质检已完成');
      setShowCompleteQC(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleConfirm = async (values: ConfirmInboundDto) => {
    if (!id) return;
    try {
      await inboundService.confirmInbound(id, values);
      message.success('入库确认成功');
      setShowConfirm(false);
      loadData();
      try {
        window.dispatchEvent(new CustomEvent('inventory:updated', { detail: { inboundId: id } }));
      } catch (err) {}
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleCancel = async (values: CancelInboundDto) => {
    if (!id) return;
    try {
      await inboundService.cancelInbound(id, values);
      message.success('入库已取消');
      setShowCancel(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const getStepCurrent = () => {
    if (!data) return 0;
    switch (data.inboundStatus) {
      case 'PENDING':
        return 0;
      case 'IN_PROGRESS':
        return 1;
      case 'COMPLETED':
        return 2;
      case 'CANCELLED':
        return -1;
      default:
        return 0;
    }
  };

  const columns = [
    { title: '商品编号', dataIndex: ['product', 'productNo'], width: 150 },
    { title: '商品名称', dataIndex: ['product', 'name'], width: 200 },
    { title: '规格', dataIndex: ['product', 'specification'], width: 150 },
    { title: '单位', dataIndex: ['product', 'unit'], width: 80 },
    { title: '数量', dataIndex: 'quantity', width: 100, align: 'right' as const },
    { title: '单价', dataIndex: 'unitPrice', width: 120, align: 'right' as const, render: (price: number) => `¥${Number(price || 0).toFixed(2)}` },
    { title: '小计', dataIndex: 'totalPrice', width: 120, align: 'right' as const, render: (price: number) => `¥${Number(price || 0).toFixed(2)}` },
  ];

  return (
    <div>
      <Card 
        title="入库记录详情" 
        loading={loading}
        extra={
          <Space>
            <Button onClick={() => navigate('/inbound')}>返回列表</Button>
            {data?.inboundStatus === 'PENDING' && data?.qualityCheckStatus === 'PENDING' && (
              <Button type="primary" onClick={() => setShowStartQC(true)}>开始质检</Button>
            )}
            {data?.qualityCheckStatus === 'IN_PROGRESS' && (
              <Button type="primary" onClick={() => setShowCompleteQC(true)}>完成质检</Button>
            )}
            {(data?.qualityCheckStatus === 'PASSED' || data?.qualityCheckStatus === 'PARTIAL') && 
             data?.inboundStatus !== 'COMPLETED' && (
              <Button type="primary" onClick={() => setShowConfirm(true)}>确认入库</Button>
            )}
            {data?.inboundStatus !== 'COMPLETED' && data?.inboundStatus !== 'CANCELLED' && (
              <Button danger onClick={() => setShowCancel(true)}>取消入库</Button>
            )}
          </Space>
        }
      >
        {data && (
          <>
            <Steps
              current={getStepCurrent()}
              status={data.inboundStatus === 'CANCELLED' ? 'error' : undefined}
              style={{ marginBottom: 24 }}
              items={[
                { title: '待入库', description: '等待开始质检' },
                { title: '入库中', description: '质检进行中' },
                { title: '已完成', description: '入库确认完成' },
              ]}
            />

            <Descriptions column={2} bordered>
              <Descriptions.Item label="入库单号">{data.inboundNo}</Descriptions.Item>
              <Descriptions.Item label="入库日期">
                {data.inboundDate ? dayjs(data.inboundDate).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="采购订单号">
                <a onClick={() => navigate(`/purchase-orders/${data.purchaseOrderId}`)}>
                  {data.purchaseOrder?.purchaseNo || '-'}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="供应商">
                {data.purchaseOrder?.supplier?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="在途单号">
                {data.inTransit?.transitNo || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="物流公司">
                {data.inTransit?.shippingCompany || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计数量">{data.expectedQuantity}</Descriptions.Item>
              <Descriptions.Item label="实际数量">{data.actualQuantity}</Descriptions.Item>
              <Descriptions.Item label="合格数量">
                <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{data.qualifiedQuantity}</span>
              </Descriptions.Item>
              <Descriptions.Item label="不合格数量">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{data.defectiveQuantity}</span>
              </Descriptions.Item>
              <Descriptions.Item label="质检状态">
                <Tag color={inboundService.getQualityStatusColor(data.qualityCheckStatus)}>
                  {inboundService.getQualityStatusText(data.qualityCheckStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="入库状态">
                <Tag color={inboundService.getStatusColor(data.inboundStatus)}>
                  {inboundService.getStatusText(data.inboundStatus)}
                </Tag>
              </Descriptions.Item>
              {data.qualityCheckBy && (
                <Descriptions.Item label="质检人">{data.qualityCheckBy}</Descriptions.Item>
              )}
              {data.qualityCheckAt && (
                <Descriptions.Item label="质检时间">
                  {dayjs(data.qualityCheckAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {data.qualityCheckResult && (
                <Descriptions.Item label="质检结果" span={2}>
                  {data.qualityCheckResult}
                </Descriptions.Item>
              )}
              {data.confirmedBy && (
                <Descriptions.Item label="确认人">{data.confirmedBy}</Descriptions.Item>
              )}
              {data.confirmedAt && (
                <Descriptions.Item label="确认时间">
                  {dayjs(data.confirmedAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {data.warehouseId && (
                <Descriptions.Item label="仓库位置" span={data.locationId ? 1 : 2}>{data.warehouseId}</Descriptions.Item>
              )}
              {data.locationId && (
                <Descriptions.Item label="库位">{data.locationId}</Descriptions.Item>
              )}
              <Descriptions.Item label="库存已更新" span={data.inventoryUpdateAt ? 1 : 2}>
                {data.inventoryUpdated ? '是' : '否'}
              </Descriptions.Item>
              {data.inventoryUpdateAt && (
                <Descriptions.Item label="库存更新时间">
                  {dayjs(data.inventoryUpdateAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {data.rejectionReason && (
                <Descriptions.Item label="取消/拒收原因" span={2}>
                  {data.rejectionReason}
                </Descriptions.Item>
              )}
              {data.remark && (
                <Descriptions.Item label="备注" span={2}>
                  {data.remark}
                </Descriptions.Item>
              )}
            </Descriptions>

            {data.purchaseOrder?.items && data.purchaseOrder.items.length > 0 && (
              <Card title="采购商品明细" style={{ marginTop: 16 }}>
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={data.purchaseOrder.items}
                  pagination={false}
                />
              </Card>
            )}
          </>
        )}
      </Card>

      {/* 开始质检对话框 */}
      <Modal
        title="开始质检"
        open={showStartQC}
        onOk={() => startQCForm.submit()}
        onCancel={() => {
          setShowStartQC(false);
          startQCForm.resetFields();
        }}
        afterClose={() => startQCForm.resetFields()}
      >
        <Form form={startQCForm} layout="vertical" onFinish={handleStartQC}>
          <Form.Item 
            name="inspectorName" 
            label="质检人" 
            rules={[{ required: true, message: '请输入质检人' }]}
          >
            <Input placeholder="请输入质检人姓名" />
          </Form.Item>
          <Form.Item name="checkStartTime" label="开始时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 完成质检对话框 */}
      <Modal
        title="完成质检"
        open={showCompleteQC}
        onOk={() => completeQCForm.submit()}
        onCancel={() => {
          setShowCompleteQC(false);
          completeQCForm.resetFields();
        }}
        afterClose={() => completeQCForm.resetFields()}
        width={600}
      >
        <Form 
          form={completeQCForm} 
          layout="vertical" 
          onFinish={handleCompleteQC}
          initialValues={{ 
            qualityStatus: QualityCheckStatus.PASSED,
            qualityScore: 100 
          }}
        >
          <Form.Item 
            name="qualityStatus" 
            label="质检结果" 
            rules={[{ required: true, message: '请选择质检结果' }]}
          >
            <Select>
              <Option value="PASSED">已通过</Option>
              <Option value="FAILED">未通过</Option>
              <Option value="PARTIAL">部分通过</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            name="qualityScore" 
            label="质检评分" 
            rules={[{ required: true, message: '请输入质检评分' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100分" />
          </Form.Item>
          <Form.Item 
            name="qualifiedQuantity" 
            label="合格数量" 
            rules={[{ required: true, message: '请输入合格数量' }]}
          >
            <InputNumber min={0} max={data?.expectedQuantity} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rejectedQuantity" label="不合格数量">
            <InputNumber min={0} max={data?.expectedQuantity} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="checkResult" label="质检结果描述">
            <TextArea rows={3} placeholder="请输入质检结果详细描述" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 确认入库对话框 */}
      <Modal
        title="确认入库"
        open={showConfirm}
        onOk={() => confirmForm.submit()}
        onCancel={() => {
          setShowConfirm(false);
          confirmForm.resetFields();
        }}
        afterClose={() => confirmForm.resetFields()}
      >
        <Form 
          form={confirmForm} 
          layout="vertical" 
          onFinish={handleConfirm}
          initialValues={{ inboundQuantity: data?.qualifiedQuantity, updateInventory: true }}
        >
          <Form.Item 
            name="inboundQuantity" 
            label="入库数量" 
            rules={[{ required: true, message: '请输入入库数量' }]}
          >
            <InputNumber min={0} max={data?.qualifiedQuantity} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item 
            name="warehouseLocation" 
            label="仓库位置" 
            rules={[{ required: true, message: '请输入仓库位置' }]}
          >
            <Input placeholder="请输入仓库位置" />
          </Form.Item>
          <Form.Item 
            name="confirmedBy" 
            label="确认人" 
            rules={[{ required: true, message: '请输入确认人' }]}
          >
            <Input placeholder="请输入确认人姓名" />
          </Form.Item>
          <Form.Item name="confirmedDate" label="确认日期">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="updateInventory" label="更新库存" valuePropName="checked">
            <Checkbox>同时更新商品库存</Checkbox>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 取消入库对话框 */}
      <Modal
        title="取消入库"
        open={showCancel}
        onOk={() => cancelForm.submit()}
        onCancel={() => {
          setShowCancel(false);
          cancelForm.resetFields();
        }}
        afterClose={() => cancelForm.resetFields()}
      >
        <Form form={cancelForm} layout="vertical" onFinish={handleCancel}>
          <Form.Item 
            name="cancelReason" 
            label="取消原因" 
            rules={[{ required: true, message: '请输入取消原因' }]}
          >
            <TextArea rows={4} placeholder="请输入取消入库的原因" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入其他备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InboundDetail;
