import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  DatePicker,
  Divider,
  Button,
  Spin,
  App,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, TeamOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { Package } from '@/types/package';
import { Status } from '@/types/common';
import { packageService } from '@/services/packages';
import packageCategoryService, { type PackageCategory } from '@/services/packageCategoryService';
import serviceItemService from '@/services/serviceItems';
import productService from '@/services/products';
import type { ServiceItem, Product } from '@/types/product';
import api from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;

interface PackageFormProps {
  visible?: boolean; // undefined -> page mode, true -> modal mode
  package?: Package;
  onCancel: () => void;
  onSubmit: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({
  visible = false,
  package: pkg,
  onCancel,
  onSubmit,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // 加载分类列表
  useEffect(() => {
    loadCategories();
  }, []);

  // 加载服务项目
  useEffect(() => {
    loadServiceItems();
  }, []);

  // 加载商品列表
  useEffect(() => {
    loadProducts();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await packageCategoryService.getActiveCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('加载分类失败:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadServiceItems = async () => {
    try {
      const data = await serviceItemService.getServiceItems({ isActive: true, pageSize: 200 });
      setServiceItems(data.list);
    } catch (error: any) {
      console.error('加载服务项目失败:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts({ pageSize: 500 });
      setProducts(data.list || []);
    } catch (error: any) {
      console.error('加载商品列表失败:', error);
    }
  };

  useEffect(() => {
    if (visible || pkg) {
      if (pkg) {
        form.setFieldsValue({
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          deposit: pkg.deposit,
          duration: pkg.duration,
          services: pkg.services,
          status: pkg.status,
          isPopular: pkg.isPopular,
          categoryId: pkg.categoryId || undefined,
          maxBookings: pkg.maxBookings,
          tags: pkg.tags,
          promotionPrice: (pkg as any).promotionPrice,
          promotionStart: (pkg as any).promotionStart ? dayjs((pkg as any).promotionStart) : undefined,
          promotionEnd: (pkg as any).promotionEnd ? dayjs((pkg as any).promotionEnd) : undefined,
          groupMinCount: (pkg as any).groupMinCount,
          groupPrice: (pkg as any).groupPrice,
          productIds: pkg.packageProducts?.map(pp => pp.productId) || [],
        });

        if (pkg.images) {
          setFileList(
            pkg.images
              .filter((u) => u && !u.includes('/vite.svg'))
              .map((url, index) => ({ uid: `-${index}`, name: `image-${index}`, status: 'done', url }))
          );
        }
      } else {
        form.resetFields();
        setFileList([]);
      }
    }
  }, [visible, pkg, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: any = {
        name: values.name,
        description: values.description || '',
        price: values.price,
        deposit: values.deposit ?? 0,
        durationMinutes: values.duration || 60,
        includes: values.services || [],
        status: values.status === Status.ACTIVE ? 'ACTIVE' : 'INACTIVE',
        categoryId: values.categoryId || null,
        isPopular: values.isPopular || false,
        tags: values.tags || [],
        images: (fileList || []).filter(f => !!(f as any).url).map(f => (f as any).url),
        promotionPrice: values.promotionPrice || null,
        promotionStart: values.promotionStart ? values.promotionStart.toISOString() : null,
        promotionEnd: values.promotionEnd ? values.promotionEnd.toISOString() : null,
        groupMinCount: values.groupMinCount || 0,
        groupPrice: values.groupPrice || null,
        productIds: values.productIds || [],
      };

      // 清理 null 值（后端 DTO 的 @IsOptional 只跳过 undefined，不跳过 null）
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === undefined) delete payload[key];
      });

      if (pkg) {
        await packageService.updatePackage(pkg.id, payload);
      } else {
        await packageService.createPackage(payload);
      }

      message.success(pkg ? '更新套餐成功' : '创建套餐成功');
      onSubmit();
    } catch (error: any) {
      message.error((pkg ? '更新' : '创建') + '套餐失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  const formContent = (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        status: Status.ACTIVE,
        isPopular: false,
        duration: 60,
        maxBookings: 1,
        services: [],
        tags: [],
        productIds: [],
      }}
    >
      <Form.Item
        name="name"
        label="套餐名称"
        rules={[{ required: true, message: '请输入套餐名称' }]}
      >
        <Input placeholder="请输入套餐名称" />
      </Form.Item>

      <Form.Item name="description" label="套餐描述">
        <TextArea rows={3} placeholder="请输入套餐描述" />
      </Form.Item>

      <Form.Item
        name="price"
        label="套餐价格"
        rules={[{ required: true, message: '请输入套餐价格' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
      </Form.Item>

      <Form.Item name="deposit" label="定金">
        <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
      </Form.Item>

      <Form.Item
        name="duration"
        label="服务时长(分钟)"
        rules={[{ required: true, message: '请输入服务时长' }]}
      >
        <InputNumber style={{ width: '100%' }} min={1} />
      </Form.Item>

      <Form.Item name="categoryId" label="套系分类">
        <Select 
          placeholder="请选择套餐分类" 
          allowClear
          loading={loadingCategories}
          notFoundContent={loadingCategories ? <Spin size="small" /> : '暂无分类'}
        >
          {categories.map(cat => (
            <Option key={cat.id} value={cat.id}>
              <span>
                {cat.color && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      marginRight: 8,
                    }}
                  />
                )}
                {cat.name}
              </span>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="services"
        label="服务内容"
        tooltip="可从服务项目中选择，也可直接输入自定义服务项。前往「服务项目」页面可管理所有服务"
      >
        <Select
          mode="tags"
          placeholder="请选择或输入服务内容(可多选)"
          style={{ width: '100%' }}
          maxTagCount="responsive"
        >
          {serviceItems.map(item => (
            <Option key={item.name} value={item.name}>
              {item.name}
              {item.category && <span style={{ color: '#999', marginLeft: 8 }}>({item.category})</span>}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="productIds"
        label="商品内容"
        tooltip="从商品列表中选择本套餐包含的商品，可在「商品管理-商品列表」中管理"
      >
        <Select
          mode="multiple"
          placeholder="请选择关联商品(可多选)"
          style={{ width: '100%' }}
          maxTagCount="responsive"
          filterOption={(input, option) =>
            String(option?.children ?? '').toLowerCase().includes(input.toLowerCase()) ||
            String(option?.['data-spec'] ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {products.map(p => (
            <Option key={p.id} value={p.id} data-spec={p.specification || ''}>
              {p.name}{p.specification ? ` (${p.specification})` : ''} - ¥{p.salePrice}/{p.unit}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="maxBookings" label="最大预订数">
        <InputNumber style={{ width: '100%' }} min={1} max={100} />
      </Form.Item>

      <Form.Item name="status" label="套餐状态">
        <Select>
          <Option value={Status.ACTIVE}>上架</Option>
          <Option value={Status.INACTIVE}>下架</Option>
        </Select>
      </Form.Item>

      <Form.Item name="isPopular" label="热门套餐" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Divider orientation="left"><ThunderboltOutlined /> 促销设置</Divider>
      <Form.Item name="promotionPrice" label="促销价">
        <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
      </Form.Item>
      <Form.Item name="promotionStart" label="促销开始时间">
        <DatePicker showTime style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="promotionEnd" label="促销结束时间">
        <DatePicker showTime style={{ width: '100%' }} />
      </Form.Item>

      <Divider orientation="left"><TeamOutlined /> 团购设置</Divider>
      <Form.Item name="groupMinCount" label="成团人数">
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Form.Item name="groupPrice" label="团购价">
        <InputNumber style={{ width: '100%' }} min={0} precision={2} addonBefore="¥" />
      </Form.Item>

      <Form.Item name="tags" label="套餐标签">
        <Select mode="tags" placeholder="请输入或选择标签" style={{ width: '100%' }}>
          <Option value="热门">热门</Option>
          <Option value="新品">新品</Option>
          <Option value="特价">特价</Option>
        </Select>
      </Form.Item>

      <Form.Item name="images" label="套餐图片">
        <Upload
          listType="picture-card"
          fileList={fileList}
          onRemove={(file) => {
            const uid = (file as any).uid;
            setFileList(prev => prev.filter(f => f.uid !== uid));
          }}
          onChange={({ fileList: newFileList }) => {
            setFileList(prev => {
              const prevMap = new Map((prev || []).map(f => [(f as any).uid, f]));
              return (newFileList || []).map(f => {
                const uid = (f as any).uid;
                const existing = prevMap.get(uid) || {};
                const merged = { ...existing, ...f } as UploadFile;
                if (!merged.url && existing && (existing as any).url) {
                  (merged as any).url = (existing as any).url;
                }
                return merged;
              });
            });
          }}
          beforeUpload={async (file: UploadFile) => {
            const uid = (file as any).uid || `uid-${Date.now()}`;
            setFileList(prev => [
              ...prev,
              { uid, name: file.name || 'image', status: 'uploading' } as UploadFile,
            ]);

            const formData = new FormData();
            formData.append('file', file as unknown as Blob, file.name || 'upload.jpg');
            try {
              const resp = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              const data = resp.data?.data;
              if (data && data.url) {
                setFileList(prev => prev.map(f => (f.uid === uid ? ({ ...f, status: 'done', url: data.url } as UploadFile) : f)));
              } else {
                message.error('图片上传失败');
                setFileList(prev => prev.filter(f => f.uid !== uid));
              }
            } catch (err: any) {
              message.error('图片上传失败: ' + (err.message || ''));
              setFileList(prev => prev.filter(f => f.uid !== uid));
            }

            return false;
          }}
        >
          {fileList.length >= 8 ? null : uploadButton}
        </Upload>
        <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
          建议分辨率 800×600 px 以上，72 DPI 网页分辨率，文件大小 100KB ~ 5MB，支持 JPG/PNG。第一张图将作为封面展示
        </div>
      </Form.Item>
    </Form>
  );

  const isPage = !visible;
  if (isPage) {
    return (
      <div>
        <h2 style={{ marginBottom: 16 }}>{pkg ? '编辑套餐' : '新增套餐'}</h2>
        <div>{formContent}</div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={onCancel}>取消</Button>
          <Button type="primary" loading={loading} onClick={handleSubmit}>保存</Button>
        </div>
      </div>
    );
  }

  return (
    <Modal
      title={pkg ? '编辑套餐' : '新增套餐'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnHidden
      width={800}
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}
    >
      {formContent}
    </Modal>
  );
};

export default PackageForm;
