import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, App, Alert } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import productService from '@/services/products';
import { Product } from '@/types/product';

const { Option } = Select;

export interface PurchaseItemFormData {
  productId?: number;
  productNo: string;
  productName: string;
  productCategoryId?: number;
  specification?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  salePrice?: number;
  brand?: string;
  model?: string;
  barcode?: string;
  description?: string;
  images?: string[];
  remark?: string;
}

interface Props {
  visible: boolean;
  initialData?: Partial<PurchaseItemFormData>;
  onSubmit: (data: PurchaseItemFormData) => void;
  onCancel: () => void;
}

const PurchaseItemModal: React.FC<Props> = ({ visible, initialData, onSubmit, onCancel }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
        form.setFieldsValue({ quantity: 1 });
      }
    }
  }, [visible, initialData, form]);

  const handleSearchProduct = async (value: string) => {
    if (!value || value.length < 2) {
      setProducts([]);
      return;
    }
    try {
      setSearchLoading(true);
      const response = await productService.getProducts({ 
        name: value, 
        isActive: true,
        pageSize: 20,
      });
      setProducts(response.list || []);
    } catch (e: any) {
      message.error('搜索商品失败');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectProduct = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setFieldsValue({
        productId: product.id,
        productNo: product.productNo,
        productName: product.name,
        productCategoryId: product.categoryId,
        specification: product.specification,
        unit: product.unit,
        unitPrice: Number(product.costPrice) || 0,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        brand: product.brand,
        model: product.model,
        barcode: product.barcode,
        description: product.description,
        images: product.images,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const totalPrice = (values.quantity || 0) * (values.unitPrice || 0);
      onSubmit({ ...values, totalPrice });
      form.resetFields();
    } catch (e) {
      // Validation failed
    }
  };

  return (
    <Modal
      title={initialData ? '编辑采购明细' : '添加采购明细'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={800}
      okText="确定"
      cancelText="取消"
    >
      <Alert
        message="提示"
        description="请先在【商品管理】中创建商品，然后在此选择商品添加到采购明细"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item 
          name="productId"
          label="搜索商品" 
          rules={[{ required: true, message: '请选择商品' }]}
        >
          <Select
            showSearch
            placeholder="输入商品名称或编号搜索"
            filterOption={false}
            onSearch={handleSearchProduct}
            onChange={handleSelectProduct}
            loading={searchLoading}
            suffixIcon={<SearchOutlined />}
          >
            {products.map(p => (
              <Option key={p.id} value={p.id}>
                {p.productNo} - {p.name} ({p.specification || '无规格'})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="productNo"
              label="商品编号"
            >
              <Input placeholder="自动填充" disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="productName"
              label="商品名称"
            >
              <Input placeholder="自动填充" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="specification" label="规格说明">
              <Input placeholder="自动填充" disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="unit" label="单位">
              <Input placeholder="自动填充" disabled />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="quantity"
              label="采购数量"
              rules={[{ required: true, message: '请输入数量' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="数量" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="unitPrice"
              label="采购单价"
              rules={[{ required: true, message: '请输入单价' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                precision={2}
                prefix="¥"
                placeholder="单价"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.quantity !== curr.quantity || prev.unitPrice !== curr.unitPrice}
            >
              {({ getFieldValue }) => {
                const qty = getFieldValue('quantity') || 0;
                const price = getFieldValue('unitPrice') || 0;
                return (
                  <Form.Item label="小计">
                    <Input
                      value={`¥${(qty * price).toFixed(2)}`}
                      disabled
                      style={{ fontWeight: 'bold' }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>

        <Form.Item name="productId" hidden>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PurchaseItemModal;
