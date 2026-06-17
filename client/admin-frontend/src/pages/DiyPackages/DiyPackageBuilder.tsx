import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Row,
  Col,
  InputNumber,
  message,
  Spin,
  Empty,
  Divider,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
} from 'antd';
import { ShoppingCartOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import productsService from '@/services/products';
import serviceItemsService from '@/services/serviceItems';
import diyPackagesService from '@/services/diyPackages';
import { timeSlotService } from '@/services/timeSlots';
import { userService } from '@/services/users';
import type { Product, ServiceItem } from '@/types/product';
import type { SelectedItem, PricingPreviewResponse, CreateDiyPackageDto } from '@/types/diy-package';
import type { TimeSlot } from '@/types/timeSlot';
import type { User } from '@/types/user';
import { Status } from '@/types/common';
import { createSelectedItemFromProduct, createSelectedItemFromService, sanitizeSelectedItems } from './utils/diy-package-utils';
import dayjs, { Dayjs } from 'dayjs';

// 类型别名，保持向后兼容
type PricingPreview = PricingPreviewResponse;

const DiyPackageBuilder: React.FC = () => {
  // 入口日志已精简
  
  // 状态定义
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载商品列表
  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await productsService.getProducts({
        page: 1,
        pageSize: 100,
        isActive: true,
      });
      console.log('📦 加载的商品数据:', response.list);
      setProducts(response.list || []);
    } catch (error) {
      console.error('加载商品失败:', error);
      message.error('加载商品列表失败');
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // 加载服务列表
  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const response = await serviceItemsService.getServiceItems({
        page: 1,
        pageSize: 100,
        isActive: true,
      });
      console.log('🔧 加载的服务数据:', response.list);
      setServices(response.list || []);
    } catch (error) {
  console.error('加载服务失败:', error);
      message.error('加载服务列表失败');
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  // helper: 根据 SelectedItem 的 id 与 type 在已加载列表中查找对应详情
  const getDetailForSelectedItem = (item: SelectedItem) => {
    if (item.type === 'product') {
      return products.find(p => String(p.id) === String(item.id));
    }
    return services.find(s => String(s.id) === String(item.id));
  };

  // 获取价格预览
  const getPricingPreview = async (items: SelectedItem[]) => {
    if (items.length === 0) {
      setPricingPreview(null);
      return;
    }

  // 触发后端价格计算
    setPreviewLoading(true);
    try {
      const originalAmount = items.reduce((s, it) => s + (it.subtotal || 0), 0);
      const requestData = {
        selectedItems: items,
        originalAmount,
      };

      console.log('💰 发送价格预览请求:', requestData);
  const response = await diyPackagesService.previewPricing(requestData);
      console.log('💰 价格预览响应:', response);
      setPricingPreview(response);
    } catch (error) {
      console.error('获取价格预览失败:', error);
      message.error('获取价格预览失败');
      setPricingPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
  // 页面加载时获取商品与服务
    loadProducts();
    loadServices();
  }, []);

  // 当选中商品变化时自动计算价格
  useEffect(() => {
    getPricingPreview(selectedItems);
  }, [selectedItems]);

  // 添加商品到购物车 - 核心逻辑检查
  const addProductToCart = (product: Product) => {
  // 添加商品到购物车
    console.log('➕ 添加商品到购物车:', { id: product.id, name: product.name, salePrice: product.salePrice });

    // 使用函数式更新，防止并发更新导致的竞态
    let resultMsg = '';
    setSelectedItems(prev => {
      // 查找时把 id 转为字符串比较，避免 number vs string 的不一致
      const existingIndex = prev.findIndex(
        item => String(item.id) === String(product.id) && item.type === 'product'
      );

      if (existingIndex >= 0) {
        const newItems = [...prev];
        const oldQuantity = newItems[existingIndex].quantity;
        newItems[existingIndex].quantity = oldQuantity + 1;
        newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].price;
  // 更新已存在商品数量
        resultMsg = `${product.name} 数量已增加到 ${newItems[existingIndex].quantity}`;
        return newItems;
      }

  const newItem = createSelectedItemFromProduct(product);
      console.log('🆕 创建的新商品项:', newItem);
  // 添加新商品
      resultMsg = `已添加 ${product.name} 到套系`;
      return [...prev, newItem];
    });

  if (resultMsg) message.success(resultMsg);
  };

  // 添加服务到购物车 - 核心逻辑检查
  const addServiceToCart = (service: ServiceItem) => {
  // 添加服务到购物车

    let resultMsg = '';
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(
        item => String(item.id) === String(service.id) && item.type === 'service'
      );

      if (existingIndex >= 0) {
        const newItems = [...prev];
        const oldQuantity = newItems[existingIndex].quantity;
        newItems[existingIndex].quantity = oldQuantity + 1;
        newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].price;
  // 更新已存在服务数量
        resultMsg = `${service.name} 数量已增加到 ${newItems[existingIndex].quantity}`;
        return newItems;
      }

  const newItem = createSelectedItemFromService(service);
  // 添加新服务
      resultMsg = `已添加 ${service.name} 到套系`;
      return [...prev, newItem];
    });

  if (resultMsg) message.success(resultMsg);
  };

  // 从购物车移除商品
  const removeItem = (index: number) => {
  // 从购物车移除项
    let removedName = '';
    setSelectedItems(prev => {
      const itemToRemove = prev[index];
      removedName = itemToRemove?.name || '';
      const newItems = prev.filter((_, i) => i !== index);
      return newItems;
    });

  if (removedName) message.info(`已移除 ${removedName}`);
  };

  // 更新购物车商品数量
  const updateQuantity = (index: number, quantity: number) => {
    console.log('🔢 updateQuantity 被调用:', { index, quantity });
    if (quantity <= 0) {
      removeItem(index);
      return;
    }

    setSelectedItems(prev => {
      const newItems = [...prev];
      const oldQuantity = newItems[index]?.quantity ?? 0;
      if (!newItems[index]) return prev;
      newItems[index].quantity = quantity;
      newItems[index].subtotal = quantity * newItems[index].price;
      console.log('🔢 数量更新（函数式）:', { itemName: newItems[index].name, oldQuantity, newQuantity: quantity });
      return newItems;
    });
  };

  // 保存DIY套系
  const [saving, setSaving] = useState(false);
  const [savedPackageId, setSavedPackageId] = useState<number | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [orderForm] = Form.useForm();
  const [creatingOrder, setCreatingOrder] = useState(false);
  
  // 时间槽相关状态
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  
  // 用户选择相关状态
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const saveDiyPackage = async (values: any) => {
    if (selectedItems.length === 0) {
      message.error('请先添加商品或服务到套系中');
      return;
    }
    // 在发送到后端前，过滤掉前端临时展示字段
    const sanitizedSelectedItems = sanitizeSelectedItems(selectedItems);

    const packageData: CreateDiyPackageDto = {
      packageName: values.name,
      selectedItems: sanitizedSelectedItems,
      originalAmount: cartTotal,
      expiresAt: undefined,
    };

    setSaving(true);
    try {
      const result = await diyPackagesService.createDiyPackage(packageData);
      message.success('DIY套系保存成功');
      setSaveModalVisible(false);
      form.resetFields();
      setSavedPackageId(result.id);
      
      // 询问是否创建订单
      Modal.confirm({
        title: '创建订单',
        content: '套系已保存成功，是否要为该套系创建预约订单？',
        onOk: () => {
          setOrderModalVisible(true);
        },
        onCancel: () => {
          setSelectedItems([]);
          setSavedPackageId(null);
        },
      });
    } catch (error) {
      message.error('保存DIY套系失败');
    } finally {
      setSaving(false);
    }
  };

  // 加载用户列表(用于订单创建时选择)
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await userService.getUsers({
        page: 1,
        pageSize: 100,
        status: Status.ACTIVE, // 只加载正常状态的用户
      });
      setUsers(response.data.list || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      message.error('加载员工列表失败');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 加载可用时间槽
  const loadAvailableTimeSlots = async (date: Dayjs) => {
    setLoadingTimeSlots(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const slots = await timeSlotService.getAvailableSlots({ date: dateStr });
      setAvailableTimeSlots(slots || []);
      
      if (!slots || slots.length === 0) {
        message.warning('该日期没有可用的时间槽');
      }
    } catch (error) {
      console.error('加载时间槽失败:', error);
      message.error('加载时间槽失败');
      setAvailableTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // 处理日期变化
  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
    
    if (date) {
      // 加载该日期的可用时间槽
      loadAvailableTimeSlots(date);
    } else {
      setAvailableTimeSlots([]);
    }
  };

  //创建订单

  const createOrderFromPackage = async (values: any) => {
    if (!savedPackageId) {
      message.error('没有可用的套系ID');
      return;
    }

    setCreatingOrder(true);
    try {
      const orderData = {
        userOpenid: values.userOpenid, // 使用选择的用户openid
        customerName: values.customerName,
        timeSlotId: values.timeSlotId,
        appointmentDate: values.appointmentDate?.format('YYYY-MM-DD'),
        childrenCount: values.childrenCount || 1,
        notes: values.notes,
      };

      console.log('📝 创建订单数据:', orderData);
      const result = await diyPackagesService.createOrderFromDiyPackage(savedPackageId, orderData);
      console.log('✅ 订单创建结果:', result);
      message.success(`订单创建成功！订单号: ${result.order.orderNo}`);
      setOrderModalVisible(false);
      orderForm.resetFields();
      setSelectedItems([]);
      setSavedPackageId(null);
      
      // 可选：跳转到订单详情页面
      // navigate(`/orders/${result.order.id}`);
    } catch (error: any) {
      console.error('❌ 创建订单失败:', error);
      message.error(error.response?.data?.message || '创建订单失败');
    } finally {
      setCreatingOrder(false);
    }
  };

  // 计算购物车总计
  const cartTotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  // 渲染组件状态用于内部参考（已移除冗余日志）

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Row gutter={24} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* 左侧：商品和服务选择 */}
        <Col span={16} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Card 
            title="选择商品和服务" 
            style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }} 
            styles={{ body: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: 0 } }}
          >
            <Row gutter={16} style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {/* 商品列表 */}
              <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Card 
                  title={`商品列表 (${products.length})`} 
                  size="small"
                  style={{ 
                    marginBottom: '16px', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    minHeight: 0
                  }}
                  styles={{ 
                    body: {
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                      padding: '12px',
                      minHeight: 0
                    }
                  }}
                >
                  {productsLoading ? (
                    <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
                  ) : products.length === 0 ? (
                    <Empty description="暂无商品" />
                  ) : (
                    <div>
                      {products.map(product => (
                        <Card
                          key={product.id}
                          size="small"
                          style={{ marginBottom: '8px' }}
                          actions={[
                            <Button
                              type="primary"
                              size="small"
                              icon={<ShoppingCartOutlined />}
                              onClick={() => addProductToCart(product)}
                            >
                              添加到购物车
                            </Button>
                          ]}
                        >
                          <Card.Meta
                            avatar={product.images && product.images.length > 0 ? <img src={product.images[0]} alt={product.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} /> : undefined}
                            title={product.name}
                            description={
                              <div>
                                <div style={{ marginBottom: 6 }}>
                                  <Tag color="orange">¥{product.salePrice}</Tag>
                                  <span style={{ marginLeft: 8, color: '#888' }}>{product.brand || ''} {product.model || ''}</span>
                                </div>
                                <div style={{ color: '#666', fontSize: 12 }}>{product.category?.name || ''} {product.specification || ''}</div>
                              </div>
                            }
                          />
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>

              {/* 服务列表 */}
              <Col span={12} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Card 
                  title={`服务列表 (${services.length})`} 
                  size="small"
                  style={{ 
                    marginBottom: '16px', 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    minHeight: 0
                  }}
                  styles={{ 
                    body: {
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      overflowY: 'auto',
                      padding: '12px',
                      minHeight: 0
                    }
                  }}
                >
                  {servicesLoading ? (
                    <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
                  ) : services.length === 0 ? (
                    <Empty description="暂无服务" />
                  ) : (
                    <div>
                      {services.map(service => (
                        <Card
                          key={service.id}
                          size="small"
                          style={{ marginBottom: '8px' }}
                          actions={[
                            <Button
                              type="primary"
                              size="small"
                              icon={<ShoppingCartOutlined />}
                              onClick={() => addServiceToCart(service)}
                            >
                              添加到购物车
                            </Button>
                          ]}
                        >
                          <Card.Meta
                            avatar={service.images && service.images.length > 0 ? <img src={service.images[0]} alt={service.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} /> : undefined}
                            title={service.name}
                            description={
                              <div>
                                <div style={{ marginBottom: 6 }}>
                                  <Tag color="green">¥{service.basePrice || 0}</Tag>
                                </div>
                                <div style={{ color: '#666', fontSize: 12 }}>{service.category || ''}</div>
                              </div>
                            }
                          />
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 右侧：购物车 */}
        <Col span={8} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card 
            title={`DIY套系购物车 (${selectedItems.length})`}
            style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            styles={{ 
              body: {
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '16px'
              }
            }}
            extra={
              selectedItems.length > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => setSaveModalVisible(true)}
                  disabled={saving}
                >
                  保存套系
                </Button>
              )
            }
          >
            {selectedItems.length === 0 ? (
              <Empty description="购物车为空，请选择商品或服务" />
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
                  {selectedItems.map((item, index) => {
                    // 使用 helper 获取详情（渲染时查找）
                    const detail = getDetailForSelectedItem(item);

                    const thumb = detail && (detail as any).images && (detail as any).images.length > 0 ? (detail as any).images[0] : undefined;
                    const brand = detail && (detail as any).brand ? (detail as any).brand : '';
                    const model = detail && (detail as any).model ? (detail as any).model : '';
                    const spec = detail && (detail as any).specification ? (detail as any).specification : '';
                    const categoryName = item.type === 'product' ? (detail && (detail as any).category?.name ? (detail as any).category.name : '') : (detail && (detail as any).category ? (detail as any).category : '');

                    return (
                      <Card 
                        key={`${item.type}-${item.id}-${index}`}
                        size="small" 
                        style={{ marginBottom: '8px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                            <div style={{ width: 48, height: 48, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                              {thumb ? <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                              <div style={{ color: '#666', fontSize: 12 }}>{categoryName} {spec}</div>
                              <div style={{ color: '#888', fontSize: 12 }}>{brand} {model}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <div style={{ fontSize: 12, color: '#888' }}>¥{item.price.toFixed(2)} × </div>
                              <InputNumber
                                min={1}
                                value={item.quantity}
                                size="small"
                                style={{ width: '60px' }}
                                onChange={(value) => updateQuantity(index, value || 1)}
                              />
                            </div>
                            <div style={{ minWidth: '80px', textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f50' }}>
                                ¥{item.subtotal.toFixed(2)}
                              </div>
                            </div>
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => removeItem(index)}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <Divider />
                
                {/* 价格预览 */}
                <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>商品小计:</span>
                    <span>¥{cartTotal.toFixed(2)}</span>
                  </div>
                  
                  {previewLoading ? (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <Spin size="small" /> 计算中...
                    </div>
                  ) : pricingPreview ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>优惠金额:</span>
                        <span style={{ color: '#f50' }}>-¥{pricingPreview.discountAmount.toFixed(2)}</span>
                      </div>

                      {pricingPreview.appliedRule && (
                        <div style={{ marginBottom: 8, color: '#333' }}>
                          应用规则：<strong>{pricingPreview.appliedRule.name}</strong>
                        </div>
                      )}

                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                        <span>最终价格:</span>
                        <span style={{ color: '#f50' }}>¥{(pricingPreview.originalAmount - pricingPreview.discountAmount).toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                      <span>总计:</span>
                      <span style={{ color: '#f50' }}>¥{cartTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* 保存套系模态框 */}
      <Modal
        title="保存DIY套系"
        open={saveModalVisible}
  onCancel={() => setSaveModalVisible(false)}
  onOk={() => form.submit()}
  confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} onFinish={saveDiyPackage} layout="vertical">
          <Form.Item
            name="name"
            label="套系名称"
            rules={[{ required: true, message: '请输入套系名称' }]}
          >
            <Input placeholder="请输入套系名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="套系描述"
          >
            <Input.TextArea rows={4} placeholder="请输入套系描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 创建订单模态框 */}
      <Modal
        title="创建预约订单"
        open={orderModalVisible}
        onCancel={() => {
          setOrderModalVisible(false);
          setSelectedItems([]);
          setSavedPackageId(null);
        }}
        onOk={() => orderForm.submit()}
        confirmLoading={creatingOrder}
        okText="创建订单"
        cancelText="取消"
        width={600}
        afterOpenChange={(open) => {
          if (open) {
            // 模态框打开时加载用户列表
            loadUsers();
          }
        }}
      >
        <Form form={orderForm} onFinish={createOrderFromPackage} layout="vertical">
          <Form.Item
            name="userOpenid"
            label="选择员工"
            rules={[{ required: true, message: '请选择员工' }]}
          >
            <Select
              placeholder="请选择员工"
              showSearch
              loading={loadingUsers}
              filterOption={(input, option) => {
                const user = users.find(u => u.openid === option?.value);
                if (!user) return false;
                const searchText = input.toLowerCase();
                return (
                  user.nickname?.toLowerCase().includes(searchText) ||
                  user.phone?.toLowerCase().includes(searchText) ||
                  user.openid.toLowerCase().includes(searchText)
                );
              }}
              notFoundContent={loadingUsers ? <Spin size="small" /> : '暂无用户'}
            >
              {users.map(user => (
                <Select.Option key={user.openid} value={user.openid}>
                  {user.nickname || '未命名'} ({user.phone || user.openid})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="customerName"
            label="客户姓名"
            rules={[{ required: true, message: '请输入客户姓名' }]}
          >
            <Input placeholder="请输入客户姓名" />
          </Form.Item>
          
          <Form.Item
            name="appointmentDate"
            label="预约日期"
            rules={[{ required: true, message: '请选择预约日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="请选择预约日期" 
              onChange={(date) => {
                handleDateChange(date);
                // 清空时间槽选择
                if (date) {
                  orderForm.resetFields(['timeSlotId']);
                }
              }}
              disabledDate={(current) => {
                // 禁用过去的日期
                return current && current < dayjs().startOf('day');
              }}
            />
          </Form.Item>

          <Form.Item
            name="timeSlotId"
            label="预约时间"
            rules={[{ required: true, message: '请选择预约时间' }]}
          >
            <Select
              placeholder={selectedDate ? "请选择预约时间" : "请先选择预约日期"}
              disabled={!selectedDate}
              loading={loadingTimeSlots}
              notFoundContent={loadingTimeSlots ? <Spin size="small" /> : '暂无可用时间槽'}
            >
              {availableTimeSlots.map(slot => {
                // 格式化时间显示
                const formatTime = (timeStr: string) => {
                  // 如果是 ISO 格式的时间戳，解析并格式化（不加时区偏移，后端已返回本地时间）
                  if (timeStr.includes('T')) {
                    return dayjs(timeStr).format('HH:mm');
                  }
                  // 如果已经是 HH:mm 格式，直接返回
                  return timeStr;
                };
                
                return (
                  <Select.Option key={slot.id} value={slot.id}>
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)} 
                    <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                      (剩余 {slot.capacity - slot.bookedCount} 个名额)
                    </span>
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="childrenCount"
            label="儿童数量"
            initialValue={1}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入儿童数量" />
          </Form.Item>
          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
          <Form.Item>
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ marginBottom: 8 }}>
                <strong>订单金额预览：</strong>
              </div>
              {pricingPreview && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>原价：</span>
                    <span>¥{pricingPreview.originalAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>优惠：</span>
                    <span style={{ color: '#f50' }}>-¥{pricingPreview.discountAmount.toFixed(2)}</span>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                    <span>应付金额：</span>
                    <span style={{ color: '#f50' }}>¥{(pricingPreview.originalAmount - pricingPreview.discountAmount).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiyPackageBuilder;
