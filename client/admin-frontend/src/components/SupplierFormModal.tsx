import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Row, Col, Divider } from 'antd';
import { supplierService, CreateSupplierDto, Supplier, UpdateSupplierDto } from '@/services/supplierService';

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
  editingSupplier?: Supplier | null;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ open, onClose, onSuccess, editingSupplier }) => {
  const [form] = Form.useForm<CreateSupplierDto & { id?: string }>();
  const isEdit = !!editingSupplier?.id;

  useEffect(() => {
    if (open) {
      if (isEdit && editingSupplier) {
        form.setFieldsValue({
          name: editingSupplier.name,
          shortName: editingSupplier.shortName,
          contactPerson: editingSupplier.contactPerson,
          contactPhone: editingSupplier.contactPhone,
          telephone: editingSupplier.telephone,
          contactEmail: editingSupplier.contactEmail,
          address: editingSupplier.address,
          wechatId: editingSupplier.wechatId,
          douyinId: editingSupplier.douyinId,
          kuaishouId: editingSupplier.kuaishouId,
          xiaohongshuId: editingSupplier.xiaohongshuId,
          businessLicense: editingSupplier.businessLicense,
          taxId: editingSupplier.taxId,
          bankAccount: editingSupplier.bankAccount,
          bankName: editingSupplier.bankName,
          supplierType: editingSupplier.supplierType,
          category: editingSupplier.category,
          businessScope: editingSupplier.businessScope,
          status: editingSupplier.status,
          creditLevel: editingSupplier.creditLevel,
          paymentTerms: editingSupplier.paymentTerms,
          deliveryDays: editingSupplier.deliveryDays,
          minOrderAmount: editingSupplier.minOrderAmount,
          remark: editingSupplier.remark,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ supplierType: 'PRODUCT', status: 'ACTIVE', creditLevel: 'B', deliveryDays: 7, minOrderAmount: 0 });
      }
    }
  }, [open, isEdit, editingSupplier, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let result: Supplier;
      if (isEdit && editingSupplier) {
        const updateData: UpdateSupplierDto = values;
        result = await supplierService.update(editingSupplier.id, updateData);
      } else {
        const createData: CreateSupplierDto = values;
        result = await supplierService.create(createData);
      }
      onSuccess(result);
    } catch (e) {
      // ignore
    }
  };

  return (
    <Modal
      open={open}
      title={<div style={{ cursor: 'move' }}>{isEdit ? '编辑供应商' : '新增供应商'}</div>}
      onCancel={onClose}
      onOk={handleSubmit}
      destroyOnHidden
      okText={isEdit ? '保存' : '创建'}
      width={1200}
      styles={{ 
        body: { 
          maxHeight: '75vh', 
          overflowY: 'auto',
          padding: '24px 24px 8px'
        } 
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          {/* 第一栏：基本信息 */}
          <Col span={8}>
            <Divider orientation="left" style={{ marginTop: 0 }}>基本信息</Divider>
            <Form.Item name="name" label="供应商名称" rules={[{ required: true, message: '请输入供应商名称' }]}>
              <Input maxLength={200} placeholder="请输入供应商全称" />
            </Form.Item>
            <Form.Item name="shortName" label="简称">
              <Input maxLength={100} placeholder="供应商简称" />
            </Form.Item>
            <Form.Item name="supplierType" label="供应商类型" rules={[{ required: true }]}>
              <Select 
                options={[
                  { value: 'PRODUCT', label: '商品供应商' }, 
                  { value: 'SERVICE', label: '服务供应商' }, 
                  { value: 'BOTH', label: '综合供应商' }
                ]} 
              />
            </Form.Item>
            <Form.Item name="category" label="供应商类别">
              <Input maxLength={100} placeholder="如：摄影器材、道具服装等" />
            </Form.Item>
            <Form.Item name="businessScope" label="经营范围">
              <Input.TextArea rows={3} placeholder="请输入经营项目范围" />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select 
                options={[
                  { value: 'ACTIVE', label: '✅ 启用中' }, 
                  { value: 'INACTIVE', label: '⏸️ 已停用' }, 
                  { value: 'BLACKLIST', label: '🚫 黑名单' }
                ]} 
              />
            </Form.Item>
            <Form.Item name="creditLevel" label="信用等级" rules={[{ required: true }]}>
              <Select 
                options={[
                  { value: 'A+', label: '⭐⭐⭐⭐⭐ A+' }, 
                  { value: 'A', label: '⭐⭐⭐⭐ A' }, 
                  { value: 'B', label: '⭐⭐⭐ B' }, 
                  { value: 'C', label: '⭐⭐ C' }, 
                  { value: 'D', label: '⭐ D' }
                ]} 
              />
            </Form.Item>
          </Col>

          {/* 第二栏：联系信息 */}
          <Col span={8}>
            <Divider orientation="left" style={{ marginTop: 0 }}>联系信息</Divider>
            <Form.Item name="contactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
              <Input maxLength={100} placeholder="主要联系人姓名" />
            </Form.Item>
            <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
              <Input maxLength={50} placeholder="手机号码" />
            </Form.Item>
            <Form.Item name="telephone" label="固定电话">
              <Input maxLength={50} placeholder="座机号码（可选）" />
            </Form.Item>
            <Form.Item name="contactEmail" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
              <Input maxLength={100} placeholder="联系邮箱" />
            </Form.Item>
            <Form.Item name="address" label="联系地址">
              <Input.TextArea rows={2} maxLength={500} placeholder="详细地址" />
            </Form.Item>
            <Divider orientation="left">社交账号</Divider>
            <Form.Item name="wechatId" label="微信号">
              <Input maxLength={100} placeholder="微信号（可选）" />
            </Form.Item>
            <Form.Item name="douyinId" label="抖音号">
              <Input maxLength={100} placeholder="抖音号（可选）" />
            </Form.Item>
            <Form.Item name="kuaishouId" label="快手号">
              <Input maxLength={100} placeholder="快手号（可选）" />
            </Form.Item>
            <Form.Item name="xiaohongshuId" label="小红书号">
              <Input maxLength={100} placeholder="小红书号（可选）" />
            </Form.Item>
          </Col>

          {/* 第三栏：财务与合作信息 */}
          <Col span={8}>
            <Divider orientation="left" style={{ marginTop: 0 }}>财务信息</Divider>
            <Form.Item name="businessLicense" label="营业执照号">
              <Input maxLength={100} placeholder="统一社会信用代码" />
            </Form.Item>
            <Form.Item name="taxId" label="税号">
              <Input maxLength={100} placeholder="纳税人识别号" />
            </Form.Item>
            <Form.Item name="bankName" label="开户银行">
              <Input maxLength={200} placeholder="开户银行名称" />
            </Form.Item>
            <Form.Item name="bankAccount" label="银行账号">
              <Input maxLength={100} placeholder="对公账号" />
            </Form.Item>
            <Divider orientation="left">合作条款</Divider>
            <Form.Item name="paymentTerms" label="付款条件">
              <Input maxLength={200} placeholder="如：货到付款、月结30天等" />
            </Form.Item>
            <Form.Item name="deliveryDays" label="交货周期（天）">
              <InputNumber min={0} max={365} style={{ width: '100%' }} placeholder="预计交货天数" />
            </Form.Item>
            <Form.Item name="minOrderAmount" label="最小订货金额（¥）">
              <InputNumber 
                min={0} 
                precision={2}
                style={{ width: '100%' }} 
                placeholder="起订金额"
              />
            </Form.Item>
            <Form.Item name="remark" label="备注说明">
              <Input.TextArea rows={4} placeholder="其他需要说明的信息" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default SupplierFormModal;
