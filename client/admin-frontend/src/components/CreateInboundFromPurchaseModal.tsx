import React, { useState } from 'react';
import { Modal, Form, InputNumber, Input, DatePicker, message } from 'antd';
import inboundService, { CreateInboundDto } from '@/services/inboundService';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface CreateInboundFromPurchaseModalProps {
  open: boolean;
  inTransitId?: string;
  expectedQuantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateInboundFromPurchaseModal: React.FC<CreateInboundFromPurchaseModalProps> = ({
  open,
  inTransitId,
  expectedQuantity,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!inTransitId) {
      message.error('缺少在途商品ID，无法创建入库记录');
      return;
    }

    try {
      setLoading(true);
      const dto: CreateInboundDto = {
        inTransitId,
        totalQuantity: values.totalQuantity,
        receivedDate: values.receivedDate ? values.receivedDate.format('YYYY-MM-DD') : undefined,
        warehouseLocation: values.warehouseLocation,
        remark: values.remark,
      };
      await inboundService.create(dto);
      message.success('入库记录创建成功');
      form.resetFields();
      onSuccess();
      try {
        window.dispatchEvent(new CustomEvent('inbound:created', { detail: { inTransitId } }));
      } catch (err) {}
    } catch (e: any) {
      message.error(e?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="创建入库记录"
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          totalQuantity: expectedQuantity || 0,
          receivedDate: dayjs(),
        }}
      >
        <Form.Item 
          name="totalQuantity" 
          label="总数量" 
          rules={[{ required: true, message: '请输入总数量' }]}
        >
          <InputNumber 
            min={1} 
            style={{ width: '100%' }} 
            placeholder="请输入预计入库数量"
          />
        </Form.Item>
        
        <Form.Item 
          name="receivedDate" 
          label="收货日期"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item 
          name="warehouseLocation" 
          label="仓库位置"
        >
          <Input placeholder="请输入仓库位置（如：A区-01货架）" />
        </Form.Item>
        
        <Form.Item name="remark" label="备注">
          <TextArea 
            rows={4} 
            placeholder="请输入备注信息" 
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateInboundFromPurchaseModal;
