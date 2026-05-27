import React, { useEffect, useState } from 'react';
import { Card, Form, Input, DatePicker, Button, Space, App, InputNumber, Table, Popconfirm } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import purchaseOrderService, { CreatePurchaseOrderDto } from '@/services/purchaseOrderService';
import SupplierSelect from '@/components/SupplierSelect';
import PurchaseItemModal, { PurchaseItemFormData } from '@/components/PurchaseItemModal';
import dayjs from 'dayjs';

interface ProductItem {
  key: number;
  productId?: number;
  productNo: string;
  productName: string;
  productCategoryId?: number;
  productCategoryName?: string;
  specification?: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice?: number;
  salePrice?: number;
  brand?: string;
  model?: string;
  barcode?: string;
  description?: string;
  images?: string[];
  remark?: string;
}

const PurchaseOrderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);

  useEffect(() => {
    if (id) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrderService.getById(id!);
      form.setFieldsValue({
        supplierId: data.supplierId,
        purchaseDate: data.purchaseDate ? dayjs(data.purchaseDate) : undefined,
        expectedDate: data.expectedDate ? dayjs(data.expectedDate) : undefined,
        freight: data.shippingFee,
        discount: data.discountAmount,
        remark: data.remark,
      });
      if (data.items && data.items.length > 0) {
        const loadedItems = data.items.map((item, idx) => ({
          key: idx,
          productId: item.productId,
          productNo: item.product?.productNo || '',
          productName: item.product?.name || '',
          productCategoryId: item.product?.category?.id,
          productCategoryName: item.product?.category?.name,
          specification: item.product?.specification,
          unit: item.product?.unit || '',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          costPrice: item.product?.costPrice ? Number(item.product.costPrice) : undefined,
          salePrice: item.product?.salePrice ? Number(item.product.salePrice) : undefined,
          brand: item.product?.brand,
          model: item.product?.model,
          barcode: undefined, // product 接口中没有 barcode
          description: item.product?.description,
          images: item.product?.images,
          remark: item.remark,
        }));
        setItems(loadedItems);
        setNextKey(loadedItems.length);
      }
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemModalVisible(true);
  };

  const handleEditItem = (item: ProductItem) => {
    setEditingItem(item);
    setItemModalVisible(true);
  };

  const handleRemoveItem = (key: number) => {
    setItems(items.filter(item => item.key !== key));
  };

  const handleItemSubmit = (data: PurchaseItemFormData) => {
    const totalPrice = data.quantity * data.unitPrice;
    if (editingItem) {
      // 编辑现有明细
      setItems(items.map(item => 
        item.key === editingItem.key 
          ? { ...item, ...data, totalPrice } 
          : item
      ));
    } else {
      // 添加新明细
      setItems([...items, { key: nextKey, ...data, totalPrice }]);
      setNextKey(nextKey + 1);
    }
    setItemModalVisible(false);
  };

  const freight = Form.useWatch('freight', form) || 0;
  const discount = Form.useWatch('discount', form) || 0;

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    // 确保 freight 和 discount 是数字类型
    const freightNum = Number(freight) || 0;
    const discountNum = Number(discount) || 0;
    return {
      subtotal,
      freight: freightNum,
      discount: discountNum,
      total: subtotal + freightNum - discountNum,
    };
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      if (items.length === 0) {
        message.error('请至少添加一项商品');
        return;
      }
      
      const invalidItems = items.filter(item => !item.productNo || !item.productName || item.quantity <= 0 || item.unitPrice <= 0);
      if (invalidItems.length > 0) {
        message.error('请完善商品信息：商品编号、名称、数量和单价必须填写且数量/单价大于0');
        return;
      }

      // 验证所有商品必须有 productId
      const itemsWithoutId = items.filter(item => !item.productId);
      if (itemsWithoutId.length > 0) {
        message.error('所有商品必须选择已存在的商品。请在【商品管理】中先创建商品，然后选择添加到采购明细');
        return;
      }

      setLoading(true);
      const values = form.getFieldsValue();
      
      const dto: CreatePurchaseOrderDto = {
        supplierId: values.supplierId,
        purchaseDate: values.purchaseDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        expectedDate: values.expectedDate?.format('YYYY-MM-DD'),
        freight: values.freight ? Number(values.freight) : 0,
        discount: values.discount ? Number(values.discount) : 0,
        remark: values.remark,
        items: items.map(item => ({
          productId: item.productId!,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          remark: item.remark,
        })),
      };

      if (id) {
        await purchaseOrderService.update(id, dto);
        message.success('采购订单更新成功');
      } else {
        await purchaseOrderService.create(dto);
        message.success('采购订单创建成功');
      }
      navigate('/purchase-orders');
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/purchase-orders');
  };

  const totals = calculateTotal();

  const columns = [
    {
      title: '商品编号',
      dataIndex: 'productNo',
      width: 120,
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 150,
    },
    {
      title: '规格',
      dataIndex: 'specification',
      width: 100,
      render: (val: string) => val || '-',
    },
    {
      title: '单位',
      dataIndex: 'unit',
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
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '小计',
      dataIndex: 'totalPrice',
      width: 100,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '操作',
      width: 120,
      render: (_: any, record: ProductItem) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEditItem(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleRemoveItem(record.key)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card 
        title={id ? '编辑采购订单' : '新增采购订单'} 
        extra={
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" loading={loading} onClick={handleSubmit}>
              {id ? '更新' : '创建'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="horizontal" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          <Form.Item 
            name="supplierId" 
            label="供应商" 
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <SupplierSelect placeholder="搜索并选择供应商" />
          </Form.Item>

          <Form.Item 
            name="purchaseDate" 
            label="采购日期"
            rules={[{ required: true, message: '请选择采购日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="expectedDate" label="预计到货日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="freight" label="运费">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>

          <Form.Item name="discount" label="折扣金额">
            <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Card>

      <Card 
        title="采购明细" 
        style={{ marginTop: 16 }}
        extra={
          <Button type="dashed" onClick={handleAddItem} icon={<PlusOutlined />}>
            添加商品
          </Button>
        }
      >
        <Table
          rowKey="key"
          size="small"
          columns={columns}
          dataSource={items}
          pagination={false}
          scroll={{ x: 900 }}
          footer={() => (
            <div style={{ textAlign: 'right' }}>
              <Space direction="vertical" style={{ width: '300px' }}>
                <div>小计: ¥{totals.subtotal.toFixed(2)}</div>
                <div>运费: ¥{totals.freight.toFixed(2)}</div>
                <div>折扣: -¥{totals.discount.toFixed(2)}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  合计: ¥{totals.total.toFixed(2)}
                </div>
              </Space>
            </div>
          )}
        />
      </Card>

      <PurchaseItemModal
        visible={itemModalVisible}
        initialData={editingItem || undefined}
        onSubmit={handleItemSubmit}
        onCancel={() => setItemModalVisible(false)}
      />
    </div>
  );
};

export default PurchaseOrderForm;
