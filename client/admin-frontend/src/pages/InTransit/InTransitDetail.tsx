import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Steps, Modal, Form, Input, Select, DatePicker, Timeline, Alert, App } from 'antd';
import inTransitService, { InTransitGoods, ShippingStatus, UpdateShippingStatusDto, ConfirmReceiveDto, RecordExceptionDto, HandleExceptionDto, ExceptionType } from '@/services/inTransitService';
import inboundService, { CreateInboundDto } from '@/services/inboundService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const InTransitDetail: React.FC = () => {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InTransitGoods | null>(null);
  const [updateStatusForm] = Form.useForm();
  const [receiveForm] = Form.useForm();
  const [exceptionForm] = Form.useForm();
  const [handleExceptionForm] = Form.useForm();
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showException, setShowException] = useState(false);
  const [showHandleException, setShowHandleException] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await inTransitService.getDetail(id);
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
  }, [id]);

  const handleUpdateStatus = async (values: any) => {
    if (!id) return;
    try {
      const dto: UpdateShippingStatusDto = {
        shippingStatus: values.shippingStatus,
        currentLocation: values.currentLocation,
        remark: values.remark,
      };
      await inTransitService.updateShippingStatus(id, dto);
      message.success('物流状态更新成功');
      setShowUpdateStatus(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleReceive = async (values: any) => {
    if (!id) return;
    try {
      const dto: ConfirmReceiveDto = {
        receivedBy: values.receivedBy,
        receivedQuantity: values.receivedQuantity,
        actualDate: values.receivedAt ? values.receivedAt.toISOString() : new Date().toISOString(),
        remark: values.remark,
      };
      const res = await inTransitService.confirmReceive(id, dto);
      
      // 检查是否自动创建了入库记录
      if (res.data?.autoCreated && res.data?.inbound?.id) {
        message.success(res.message || '确认收货成功，已自动创建入库单');
        // 跳转到入库详情页
        setTimeout(() => {
          navigate(`/inbound/${res.data.inbound.id}`);
        }, 1000);
      } else {
        message.success('确认收货成功');
        setShowReceive(false);
        loadData();
      }
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleRecordException = async (values: any) => {
    if (!id) return;
    try {
      const dto: RecordExceptionDto = {
        exceptionType: values.exceptionType,
        exceptionDesc: values.exceptionDesc,
        remark: values.remark,
      };
      await inTransitService.recordException(id, dto);
      message.success('异常已记录');
      setShowException(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleHandleException = async (values: any) => {
    if (!id) return;
    try {
      const dto: HandleExceptionDto = {
        handlingDesc: values.handlingDesc,
        remark: values.remark,
      };
      await inTransitService.handleException(id, dto);
      message.success('异常已处理');
      setShowHandleException(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleCreateInbound = async () => {
    if (!id || !data) return;
    
    try {
      message.loading('正在创建入库记录...', 0);
      
      // 调用API创建入库记录
      const createDto: CreateInboundDto = {
        inTransitId: id,
        totalQuantity: data.totalQuantity,
        receivedDate: new Date().toISOString(),
        warehouseLocation: '001', // 默认仓库位置
        remark: `从在途商品 ${data.transitNo} 创建`,
      };
      
      const res = await inboundService.create(createDto);
      message.destroy();
      
      if (res && res.data) {
        message.success('入库记录创建成功');
        // 跳转到入库详情页
        setTimeout(() => {
          navigate(`/inbound/${res.data.id}`);
        }, 500);
      } else {
        message.error('创建失败');
      }
    } catch (e: any) {
      message.destroy();
      message.error(e?.message || '创建入库记录失败');
    }
  };

  const getStepCurrent = () => {
    if (!data) return 0;
    switch (data.shippingStatus) {
      case ShippingStatus.PREPARING:
        return 0;
      case ShippingStatus.SHIPPED:
        return 1;
      case ShippingStatus.IN_TRANSIT:
        return 2;
      case ShippingStatus.ARRIVED:
        return 3;
      case ShippingStatus.DELIVERED:
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div>
      <Card 
        title="在途商品详情" 
        loading={loading}
        extra={
          <Space>
            <Button onClick={() => navigate('/in-transit')}>返回列表</Button>
            {data && data.shippingStatus !== ShippingStatus.DELIVERED && (
              <Button type="primary" onClick={() => setShowUpdateStatus(true)}>更新物流状态</Button>
            )}
            {data && data.shippingStatus === ShippingStatus.ARRIVED && (
              <Button type="primary" onClick={() => setShowReceive(true)}>确认收货</Button>
            )}
            {data && !data.hasException && data.shippingStatus !== ShippingStatus.DELIVERED && (
              <Button onClick={() => setShowException(true)}>记录异常</Button>
            )}
            {data && data.hasException && !data.exceptionHandled && (
              <Button type="primary" onClick={() => setShowHandleException(true)}>处理异常</Button>
            )}
            {data && data.shippingStatus === ShippingStatus.DELIVERED && (
              <Button type="primary" onClick={handleCreateInbound}>创建入库记录</Button>
            )}
          </Space>
        }
      >
        {data && (
          <>
            {data.hasException && !data.exceptionHandled && (
              <Alert
                message="物流异常"
                description={`异常类型：${inTransitService.getExceptionTypeText(data.exceptionType as ExceptionType)} - ${data.exceptionDesc}`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {data.isDelayed && (
              <Alert
                message="运输延迟"
                description={`已延迟 ${data.delayDays} 天${data.delayReason ? ` - ${data.delayReason}` : ''}`}
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Steps
              current={getStepCurrent()}
              status={data.hasException ? 'error' : undefined}
              style={{ marginBottom: 24 }}
              items={[
                { title: '备货中', description: '准备发货' },
                { title: '已发货', description: '物流已发出' },
                { title: '在途中', description: '运输中' },
                { title: '已到达', description: '到达目的地' },
                { title: '已交付', description: '完成交付' },
              ]}
            />

            <Descriptions column={2} bordered>
              <Descriptions.Item label="在途单号">{data.transitNo}</Descriptions.Item>
              <Descriptions.Item label="物流状态">
                <Tag color={inTransitService.getShippingStatusColor(data.shippingStatus)}>
                  {inTransitService.getShippingStatusText(data.shippingStatus)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="采购订单号">
                <a onClick={() => navigate(`/purchase-orders/${data.purchaseOrderId}`)}>
                  {data.purchaseOrder?.purchaseNo || '-'}
                </a>
              </Descriptions.Item>
              <Descriptions.Item label="供应商">
                {data.purchaseOrder?.supplier?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="总数量">{data.totalQuantity}</Descriptions.Item>
              <Descriptions.Item label="总金额">¥{Number(data.totalAmount).toFixed(2)}</Descriptions.Item>
              
              {data.shippedDate && (
                <Descriptions.Item label="发货日期">
                  {dayjs(data.shippedDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              {data.shippedBy && (
                <Descriptions.Item label="发货人">{data.shippedBy}</Descriptions.Item>
              )}
              {data.shippedFrom && (
                <Descriptions.Item label="发货地点" span={2}>{data.shippedFrom}</Descriptions.Item>
              )}
              
              <Descriptions.Item label="物流公司">{data.shippingCompany || '-'}</Descriptions.Item>
              <Descriptions.Item label="物流单号">{data.trackingNo || '-'}</Descriptions.Item>
              {data.shippingMethod && (
                <Descriptions.Item label="物流方式">
                  {inTransitService.getShippingMethodText(data.shippingMethod)}
                </Descriptions.Item>
              )}
              {data.currentLocation && (
                <Descriptions.Item label="当前位置">{data.currentLocation}</Descriptions.Item>
              )}
              
              <Descriptions.Item label="预计到货">
                {dayjs(data.expectedDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              {data.estimatedDays && (
                <Descriptions.Item label="预计天数">{data.estimatedDays} 天</Descriptions.Item>
              )}
              {data.actualDate && (
                <Descriptions.Item label="实际到货">
                  {dayjs(data.actualDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              {data.actualDays && (
                <Descriptions.Item label="实际天数">{data.actualDays} 天</Descriptions.Item>
              )}
              
              {data.receivedBy && (
                <Descriptions.Item label="收货人">{data.receivedBy}</Descriptions.Item>
              )}
              {data.receivedAt && (
                <Descriptions.Item label="收货时间">
                  {dayjs(data.receivedAt).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {data.receivedQuantity && (
                <Descriptions.Item label="收货数量">{data.receivedQuantity}</Descriptions.Item>
              )}
              
              <Descriptions.Item label="是否延迟">
                <Tag color={data.isDelayed ? 'warning' : 'success'}>
                  {data.isDelayed ? '是' : '否'}
                </Tag>
              </Descriptions.Item>
              {data.isDelayed && data.delayDays && (
                <Descriptions.Item label="延迟天数">{data.delayDays} 天</Descriptions.Item>
              )}
              {data.delayReason && (
                <Descriptions.Item label="延迟原因" span={2}>{data.delayReason}</Descriptions.Item>
              )}
              
              <Descriptions.Item label="是否异常">
                <Tag color={data.hasException ? 'error' : 'success'}>
                  {data.hasException ? '是' : '否'}
                </Tag>
              </Descriptions.Item>
              {data.hasException && (
                <Descriptions.Item label="异常处理">
                  <Tag color={data.exceptionHandled ? 'success' : 'warning'}>
                    {data.exceptionHandled ? '已处理' : '待处理'}
                  </Tag>
                </Descriptions.Item>
              )}
              {data.exceptionType && (
                <Descriptions.Item label="异常类型">
                  {inTransitService.getExceptionTypeText(data.exceptionType as ExceptionType)}
                </Descriptions.Item>
              )}
              {data.exceptionDesc && (
                <Descriptions.Item label="异常描述" span={2}>{data.exceptionDesc}</Descriptions.Item>
              )}
              
              {data.lastUpdateTime && (
                <Descriptions.Item label="最后更新">
                  {dayjs(data.lastUpdateTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {data.remark && (
                <Descriptions.Item label="备注" span={2}>{data.remark}</Descriptions.Item>
              )}
            </Descriptions>

            {data.trackingHistory && Array.isArray(data.trackingHistory) && data.trackingHistory.length > 0 && (
              <Card title="物流跟踪" style={{ marginTop: 16 }}>
                <Timeline
                  items={data.trackingHistory.map((item: any, idx: number) => ({
                    color: idx === data.trackingHistory.length - 1 ? 'green' : 'blue',
                    children: (
                      <div>
                        <div><strong>{item.location || '未知位置'}</strong></div>
                        <div style={{ fontSize: 12, color: '#999' }}>
                          {item.timestamp ? dayjs(item.timestamp).format('YYYY-MM-DD HH:mm') : ''}
                        </div>
                        <div>
                          <Tag>{inTransitService.getShippingStatusText(item.status)}</Tag>
                        </div>
                        {item.remark && <div style={{ fontSize: 13, color: '#666' }}>{item.remark}</div>}
                      </div>
                    )
                  }))}
                />
              </Card>
            )}

            {data.inboundRecords && data.inboundRecords.length > 0 && (
              <Card title="关联入库记录" style={{ marginTop: 16 }}>
                {data.inboundRecords.map((record: any) => (
                  <div key={record.id} style={{ marginBottom: 8 }}>
                    <a onClick={() => navigate(`/inbound/${record.id}`)}>
                      {record.inboundNo}
                    </a>
                    {' - '}
                    <Tag>{record.inboundStatus}</Tag>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </Card>

      {/* 更新物流状态对话框 */}
      <Modal
        title="更新物流状态"
        open={showUpdateStatus}
        onOk={() => updateStatusForm.submit()}
        onCancel={() => setShowUpdateStatus(false)}
      >
        <Form form={updateStatusForm} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item 
            name="shippingStatus" 
            label="物流状态" 
            rules={[{ required: true, message: '请选择物流状态' }]}
          >
            <Select>
              <Option value="PREPARING">备货中</Option>
              <Option value="SHIPPED">已发货</Option>
              <Option value="IN_TRANSIT">在途中</Option>
              <Option value="ARRIVED">已到达</Option>
              <Option value="DELIVERED">已交付</Option>
            </Select>
          </Form.Item>
          <Form.Item name="currentLocation" label="当前位置">
            <Input placeholder="请输入当前位置" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 确认收货对话框 */}
      <Modal
        title="确认收货"
        open={showReceive}
        onOk={() => receiveForm.submit()}
        onCancel={() => setShowReceive(false)}
      >
        <Form 
          form={receiveForm} 
          layout="vertical" 
          onFinish={handleReceive}
          initialValues={{
            receivedQuantity: data?.totalQuantity,
            receivedAt: dayjs(),
          }}
        >
          <Form.Item 
            name="receivedBy" 
            label="收货人" 
            rules={[{ required: true, message: '请输入收货人' }]}
          >
            <Input placeholder="请输入收货人姓名" />
          </Form.Item>
          <Form.Item 
            name="receivedQuantity" 
            label="收货数量" 
            rules={[{ required: true, message: '请输入收货数量' }]}
          >
            <Input type="number" placeholder="请输入实际收货数量" />
          </Form.Item>
          <Form.Item name="receivedAt" label="收货时间">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 记录异常对话框 */}
      <Modal
        title="记录物流异常"
        open={showException}
        onOk={() => exceptionForm.submit()}
        onCancel={() => setShowException(false)}
      >
        <Form form={exceptionForm} layout="vertical" onFinish={handleRecordException}>
          <Form.Item 
            name="exceptionType" 
            label="异常类型" 
            rules={[{ required: true, message: '请选择异常类型' }]}
          >
            <Select>
              <Option value="DAMAGED">破损</Option>
              <Option value="LOST">丢失</Option>
              <Option value="WRONG_ROUTE">路线错误</Option>
              <Option value="CUSTOMS">海关问题</Option>
              <Option value="OTHER">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item 
            name="exceptionDesc" 
            label="异常描述" 
            rules={[{ required: true, message: '请输入异常描述' }]}
          >
            <TextArea rows={4} placeholder="请详细描述异常情况" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 处理异常对话框 */}
      <Modal
        title="处理物流异常"
        open={showHandleException}
        onOk={() => handleExceptionForm.submit()}
        onCancel={() => setShowHandleException(false)}
      >
        <Form form={handleExceptionForm} layout="vertical" onFinish={handleHandleException}>
          <Form.Item 
            name="handlingDesc" 
            label="处理说明" 
            rules={[{ required: true, message: '请输入处理说明' }]}
          >
            <TextArea rows={4} placeholder="请详细说明如何处理该异常" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InTransitDetail;
