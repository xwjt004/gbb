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
  Table,
  Space,
  Image,
} from 'antd';
import { PlusOutlined, ThunderboltOutlined, TeamOutlined, PictureOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import type { UploadFile } from 'antd/es/upload/interface';
import { Package } from '@/types/package';
import { Status } from '@/types/common';
import { packageService } from '@/services/packages';
import packageCategoryService, { type PackageCategory } from '@/services/packageCategoryService';
import productService from '@/services/products';
import type { Product, ServiceItem } from '@/types/product';
import serviceItemService from '@/services/serviceItems';
import api, { simple } from '@/services/api';

const { TextArea } = Input;
const { Option } = Select;

// 可拖拽调整宽度的表格列头
const ResizableTitle = (props: Record<string, any>) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  const ResizableAny = Resizable as any;
  return (
    <ResizableAny
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
      axis="x"
      minConstraints={[60, 0]}
    >
      <th {...restProps} />
    </ResizableAny>
  );
};

interface PackageFormProps {
  visible?: boolean; // undefined -> page mode, true -> modal mode
  package?: Package;
  onCancel: () => void;
  onSubmit: () => void;
}

interface CustomProductRow {
  tempId: string;
  productId: number | null;
  productNo: string;       // 商品编号
  productName: string;
  imageUrl: string;        // 商品图片URL
  quantity: number;
  salePrice: number;       // 销售价（从商品带出）
}

interface CustomServiceRow {
  tempId: string;
  serviceId: number | null;
  serviceNo: string;
  serviceName: string;
  imageUrl: string;
  quantity: number;
  salePrice: number;
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
  const [posterFileList, setPosterFileList] = useState<UploadFile[]>([]);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);

  // 阶梯团购价
  interface GroupBuyTierItem { id?: number; minCount: number; price: number; }
  const [tiers, setTiers] = useState<GroupBuyTierItem[]>([]);
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [newTierMinCount, setNewTierMinCount] = useState(3);
  const [newTierPrice, setNewTierPrice] = useState(0);

  // 已选的商品行（可编辑）
  const [customProductRows, setCustomProductRows] = useState<CustomProductRow[]>([]);
  // 已选的服务行（可编辑）
  const [serviceRows, setServiceRows] = useState<CustomServiceRow[]>([]);

  // 表格列宽状态（可拖拽调整）
  const [productColWidths, setProductColWidths] = useState<Record<string, number>>({});
  const [serviceColWidths, setServiceColWidths] = useState<Record<string, number>>({});

  // 创建可拖拽列头的 Table components 配置
  const resizableComponents = {
    header: {
      cell: ResizableTitle,
    },
  };

  // 生成列宽调整 handler
  const genResizeHandler = (
    setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    colKey: string,
  ) => {
    return (_: React.SyntheticEvent, { size }: { size: { width: number } }) => {
      setter(prev => ({ ...prev, [colKey]: size.width }));
    };
  };

  // 加载分类列表
  useEffect(() => {
    loadCategories();
  }, []);

  // 加载商品列表
  useEffect(() => {
    loadProducts();
  }, []);

  // 加载服务项目列表
  useEffect(() => {
    loadServiceItems();
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

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts({ pageSize: 500 });
      setProducts(data.list || []);
    } catch (error: any) {
      console.error('加载商品列表失败:', error);
    }
  };

  const loadServiceItems = async () => {
    try {
      const data = await serviceItemService.getServiceItems({ pageSize: 500 });
      setServiceItems(data.list || []);
    } catch (error: any) {
      console.error('加载服务项目列表失败:', error);
    }
  };

  // ==================== 阶梯团购价管理 ====================

  const loadTiers = async (packageId: number | string) => {
    try {
      const res: any = await simple.get(`/group-buy/admin/tiers/package/${packageId}`);
      const data = res?.data || res || [];
      setTiers(Array.isArray(data) ? data : []);
    } catch {
      setTiers([]);
    }
  };

  const addTier = async () => {
    if (!pkg?.id) return;
    try {
      await simple.post(`/group-buy/admin/tiers/package/${pkg.id}`, {
        minCount: newTierMinCount,
        price: newTierPrice,
      });
      setTierModalOpen(false);
      loadTiers(Number(pkg.id));
    } catch (err: any) {
      message.error('添加失败: ' + (err.message || ''));
    }
  };

  const deleteTier = async (tierId: number) => {
    if (!pkg?.id) return;
    try {
      await simple.delete(`/group-buy/admin/tiers/${tierId}`);
      loadTiers(Number(pkg.id));
    } catch (err: any) {
      message.error('删除失败: ' + (err.message || ''));
    }
  };

  useEffect(() => {
    if (visible || pkg) {
      if (pkg) {
        // 解析已保存的商品关联
        const pp = pkg.packageProducts || [];
        const initProductRows: CustomProductRow[] = pp.map((item: any, idx: number) => {
          const productImg = item.product?.images;
          const imgUrl = Array.isArray(productImg) ? productImg[0] : (typeof productImg === 'string' ? productImg : '');
          return {
            tempId: `prod-${idx}`,
            productId: item.productId,
            productNo: item.product?.productNo || '',
            productName: item.product?.name || `商品#${item.productId}`,
            imageUrl: imgUrl || '',
            quantity: item.quantity || 1,
            salePrice: Number(item.product?.salePrice) || 0,
          };
        });

        // 解析已保存的服务关联
        const ps = (pkg as any).packageServices || [];
        const initServiceRows: CustomServiceRow[] = ps.map((item: any, idx: number) => {
          const svcImages = item.service?.images;
          const imgUrl = Array.isArray(svcImages) ? svcImages[0] : (typeof svcImages === 'string' ? svcImages : '');
          return {
            tempId: `svc-${idx}`,
            serviceId: item.serviceId,
            serviceNo: item.service?.serviceNo || '',
            serviceName: item.service?.name || `服务#${item.serviceId}`,
            imageUrl: imgUrl || '',
            quantity: item.quantity || 1,
            salePrice: Number(item.service?.basePrice) || 0,
          };
        });

        setCustomProductRows(initProductRows);
        setServiceRows(initServiceRows);

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
          groupBuyDescription: (pkg as any).groupBuyDescription,
          posterTitle: (pkg as any).posterTitle,
          posterContent: (pkg as any).posterContent,
          posterBackground: (pkg as any).posterBackground,
        });

        if (pkg.images) {
          setFileList(
            pkg.images
              .filter((u) => u && !u.includes('/vite.svg'))
              .map((url, index) => ({ uid: `-${index}`, name: `image-${index}`, status: 'done', url }))
          );
        }

        const posterImgs = (pkg as any).posterImages || [];
        if (posterImgs.length > 0) {
          setPosterFileList(
            posterImgs
              .filter((u) => u)
              .map((url: string, index: number) => ({ uid: `poster-${index}`, name: `poster-${index}`, status: 'done', url }))
          );
        }
        // 加载阶梯价格
        if (pkg.id) loadTiers(Number(pkg.id));
      } else {
        form.resetFields();
        setFileList([]);
        setPosterFileList([]);
        setCustomProductRows([]);
        setServiceRows([]);
        setTiers([]);
      }
    }
  }, [visible, pkg, form]);

  // 添加商品行
  const addCustomProductRow = () => {
    setCustomProductRows([...customProductRows, {
      tempId: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: null,
      productNo: '',
      productName: '',
      imageUrl: '',
      quantity: 1,
      salePrice: 0,
    }]);
  };

  // 删除商品行
  const removeCustomProductRow = (tempId: string) => {
    setCustomProductRows(customProductRows.filter(r => r.tempId !== tempId));
  };

  // 更新商品行字段
  const updateCustomProductRow = (tempId: string, field: string, value: any) => {
    setCustomProductRows(prev => prev.map(r =>
      r.tempId === tempId ? { ...r, [field]: value } : r
    ));
  };

  // 添加服务行
  const addServiceRow = () => {
    const newRow: CustomServiceRow = {
      tempId: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      serviceId: null,
      serviceNo: '',
      serviceName: '',
      imageUrl: '',
      quantity: 1,
      salePrice: 0,
    };
    setServiceRows(prev => [...prev, newRow]);
  };

  // 删除服务行
  const removeServiceRow = (tempId: string) => {
    setServiceRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // 更新服务行字段
  const updateServiceRow = (tempId: string, field: string, value: any) => {
    setServiceRows(prev => prev.map(r =>
      r.tempId === tempId ? { ...r, [field]: value } : r
    ));
  };

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
        groupBuyDescription: values.groupBuyDescription || '',
        posterTitle: values.posterTitle || '',
        posterContent: values.posterContent || '',
        posterBackground: values.posterBackground || '',
        posterImages: (posterFileList || []).filter(f => !!(f as any).url).map(f => (f as any).url),
        // 商品关联（含数量）
        products: customProductRows
          .filter(r => r.productId) // 只提交已选商品的行
          .map(r => ({
            productId: r.productId,
            quantity: r.quantity,
          })),
        // 服务项目关联（含数量）
        services: serviceRows
          .filter(r => r.serviceId) // 只提交已选服务的行
          .map(r => ({
            serviceId: r.serviceId,
            quantity: r.quantity,
          })),
      };

      // 清理 null 值
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

  // 商品表格列（按钮驱动，每行含编号 + 图片 + 名称 + 下拉选择 + 数量 + 删除）
  const customProductColumns = [
    {
      title: '商品编号',
      dataIndex: 'productNo',
      key: 'productNo',
      width: productColWidths.productNo || 140,
      onHeaderCell: () => ({
        width: productColWidths.productNo || 140,
        onResize: genResizeHandler(setProductColWidths, 'productNo'),
      }),
      render: (no: string) => <span style={{ color: '#666', fontSize: 12 }}>{no || '-'}</span>,
    },
    {
      title: '商品图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: productColWidths.imageUrl || 90,
      onHeaderCell: () => ({
        width: productColWidths.imageUrl || 90,
        onResize: genResizeHandler(setProductColWidths, 'imageUrl'),
      }),
      render: (url: string) => url
        ? <Image src={url} style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} fallback="data:image/png;base64,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" />
        : <span style={{ color: '#ccc' }}>无</span>,
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string) => <span>{name || <span style={{ color: '#ccc' }}>未选择</span>}</span>,
    },
    {
      title: '选择商品',
      key: 'selectProduct',
      width: productColWidths.selectProduct || 220,
      onHeaderCell: () => ({
        width: productColWidths.selectProduct || 220,
        onResize: genResizeHandler(setProductColWidths, 'selectProduct'),
      }),
      render: (_: any, record: CustomProductRow) => {
        // 同一行不排除自身，排除其他行已选商品
        const selectedIds = customProductRows
          .filter(r => r.tempId !== record.tempId && r.productId)
          .map(r => r.productId);
        const availableForRow = products.filter(p => !selectedIds.includes(p.id));
        return (
          <Select
            style={{ width: '100%' }}
            value={record.productId}
            placeholder="选择商品"
            onChange={(val) => {
              const product = products.find(p => p.id === val);
              if (!product) return;
              const productImg = product.images;
              const imgUrl = Array.isArray(productImg) ? productImg[0] : (typeof productImg === 'string' ? productImg : '');
              setCustomProductRows(prev => prev.map(r =>
                r.tempId === record.tempId
                  ? { ...r, productId: val, productNo: product.productNo || '', productName: product.name || '', imageUrl: imgUrl || '', salePrice: Number(product.salePrice) || 0 }
                  : r
              ));
            }}
            showSearch
            filterOption={(input, option) =>
              String(option?.title ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {availableForRow.map(p => (
              <Option key={p.id} value={p.id} title={`${p.name}${p.specification ? ` (${p.specification})` : ''}`}>
                {p.name}{p.specification ? ` (${p.specification})` : ''} - ¥{p.salePrice}/{p.unit}
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: productColWidths.quantity || 100,
      onHeaderCell: () => ({
        width: productColWidths.quantity || 100,
        onResize: genResizeHandler(setProductColWidths, 'quantity'),
      }),
      render: (qty: number, record: CustomProductRow) => (
        <InputNumber
          min={1}
          max={999}
          value={qty}
          onChange={(val) => updateCustomProductRow(record.tempId, 'quantity', val || 1)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: '销售价',
      dataIndex: 'salePrice',
      key: 'salePrice',
      width: productColWidths.salePrice || 100,
      onHeaderCell: () => ({
        width: productColWidths.salePrice || 100,
        onResize: genResizeHandler(setProductColWidths, 'salePrice'),
      }),
      render: (price: number) => (
        <span>¥{Number(price || 0).toFixed(2)}</span>
      ),
    },
    {
      title: '合计',
      key: 'totalPrice',
      width: productColWidths.totalPrice || 120,
      onHeaderCell: () => ({
        width: productColWidths.totalPrice || 120,
        onResize: genResizeHandler(setProductColWidths, 'totalPrice'),
      }),
      render: (_: any, record: CustomProductRow) => {
        const total = (Number(record.salePrice) || 0) * (record.quantity || 0);
        return <span style={{ fontWeight: 500, color: '#cf1322' }}>¥{total.toFixed(2)}</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: productColWidths.action || 60,
      onHeaderCell: () => ({
        width: productColWidths.action || 60,
        onResize: genResizeHandler(setProductColWidths, 'action'),
      }),
      render: (_: any, record: CustomProductRow) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeCustomProductRow(record.tempId)}
        />
      ),
    },
  ];

  // 服务表格列（按钮驱动，每行含编号 + 图片 + 名称 + 下拉选择 + 数量 + 销售价 + 合计 + 删除）
  const serviceColumns = [
    {
      title: '服务编号',
      dataIndex: 'serviceNo',
      key: 'serviceNo',
      width: serviceColWidths.serviceNo || 140,
      onHeaderCell: () => ({
        width: serviceColWidths.serviceNo || 140,
        onResize: genResizeHandler(setServiceColWidths, 'serviceNo'),
      }),
      render: (no: string) => <span style={{ color: '#666', fontSize: 12 }}>{no || '-'}</span>,
    },
    {
      title: '服务图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: serviceColWidths.imageUrl || 90,
      onHeaderCell: () => ({
        width: serviceColWidths.imageUrl || 90,
        onResize: genResizeHandler(setServiceColWidths, 'imageUrl'),
      }),
      render: (url: string) => url
        ? <Image src={url} style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} fallback="data:image/png;base64,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" />
        : <span style={{ color: '#ccc' }}>无</span>,
    },
    {
      title: '服务名称',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: serviceColWidths.serviceName || 150,
      onHeaderCell: () => ({
        width: serviceColWidths.serviceName || 150,
        onResize: genResizeHandler(setServiceColWidths, 'serviceName'),
      }),
      render: (name: string) => <span>{name || <span style={{ color: '#ccc' }}>未选择</span>}</span>,
    },
    {
      title: '选择服务',
      key: 'selectService',
      width: serviceColWidths.selectService || 220,
      onHeaderCell: () => ({
        width: serviceColWidths.selectService || 220,
        onResize: genResizeHandler(setServiceColWidths, 'selectService'),
      }),
      render: (_: any, record: CustomServiceRow) => {
        const selectedIds = serviceRows
          .filter(r => r.tempId !== record.tempId && r.serviceId)
          .map(r => r.serviceId);
        const availableForRow = serviceItems.filter(s => !selectedIds.includes(s.id));
        return (
          <Select
            style={{ width: '100%' }}
            value={record.serviceId}
            placeholder="选择服务"
            onChange={(val) => {
              const service = serviceItems.find(s => s.id === val);
              if (!service) return;
              const svcImages = service.images;
              const imgUrl = Array.isArray(svcImages) ? svcImages[0] : (typeof svcImages === 'string' ? svcImages : '');
              setServiceRows(prev => prev.map(r =>
                r.tempId === record.tempId
                  ? { ...r, serviceId: val, serviceNo: service.serviceNo || '', serviceName: service.name || '', imageUrl: imgUrl || '', salePrice: Number(service.basePrice) || 0 }
                  : r
              ));
            }}
            showSearch
            filterOption={(input, option) =>
              String(option?.title ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {availableForRow.map(s => (
              <Option key={s.id} value={s.id} title={`${s.name}${s.serviceNo ? ` (${s.serviceNo})` : ''}`}>
                {s.name}{s.serviceNo ? ` (${s.serviceNo})` : ''} - ¥{s.basePrice}/{s.unit}
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: serviceColWidths.quantity || 100,
      onHeaderCell: () => ({
        width: serviceColWidths.quantity || 100,
        onResize: genResizeHandler(setServiceColWidths, 'quantity'),
      }),
      render: (qty: number, record: CustomServiceRow) => (
        <InputNumber
          min={1}
          max={999}
          value={qty}
          onChange={(val) => updateServiceRow(record.tempId, 'quantity', val || 1)}
          style={{ width: 80 }}
        />
      ),
    },
    {
      title: '销售价',
      dataIndex: 'salePrice',
      key: 'salePrice',
      width: serviceColWidths.salePrice || 100,
      onHeaderCell: () => ({
        width: serviceColWidths.salePrice || 100,
        onResize: genResizeHandler(setServiceColWidths, 'salePrice'),
      }),
      render: (price: number) => (
        <span>¥{Number(price || 0).toFixed(2)}</span>
      ),
    },
    {
      title: '合计',
      key: 'totalPrice',
      width: serviceColWidths.totalPrice || 120,
      onHeaderCell: () => ({
        width: serviceColWidths.totalPrice || 120,
        onResize: genResizeHandler(setServiceColWidths, 'totalPrice'),
      }),
      render: (_: any, record: CustomServiceRow) => {
        const total = (Number(record.salePrice) || 0) * (record.quantity || 0);
        return <span style={{ fontWeight: 500, color: '#cf1322' }}>¥{total.toFixed(2)}</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: serviceColWidths.action || 60,
      onHeaderCell: () => ({
        width: serviceColWidths.action || 60,
        onResize: genResizeHandler(setServiceColWidths, 'action'),
      }),
      render: (_: any, record: CustomServiceRow) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeServiceRow(record.tempId)}
        />
      ),
    },
  ];

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

      {/* 服务内容（按钮驱动：每行含下拉选择 + 数量 + 销售价 + 合计 + 删除） */}
      <Form.Item label="服务内容" tooltip={'点击"增加服务"按钮添加服务项目。从下拉列表选择已有服务并设置数量'}>
        <div style={{ marginBottom: 8 }}>
          <Button type="dashed" onClick={addServiceRow} icon={<PlusOutlined />} block>
            增加服务
          </Button>
        </div>
        {serviceRows.length > 0 ? (
          <Table
            dataSource={serviceRows}
            columns={serviceColumns}
            rowKey="tempId"
            pagination={false}
            size="small"
            bordered
            components={resizableComponents}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <span style={{ color: '#999', fontSize: 13 }}>尚未添加服务项目，点击上方按钮添加</span>
        )}
      </Form.Item>

      {/* 商品内容（按钮驱动：每行含下拉选择 + 数量 + 删除） */}
      <Form.Item label="商品内容" tooltip={'点击"增加商品"按钮添加商品项目。从下拉列表选择已有商品并设置数量'}>
        <div style={{ marginBottom: 8 }}>
          <Button type="dashed" onClick={addCustomProductRow} icon={<PlusOutlined />} block>
            增加商品
          </Button>
        </div>
        {customProductRows.length > 0 ? (
          <Table
            dataSource={customProductRows}
            columns={customProductColumns}
            rowKey="tempId"
            pagination={false}
            size="small"
            bordered
            components={resizableComponents}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <span style={{ color: '#999', fontSize: 13 }}>尚未添加商品项目，点击上方按钮添加</span>
        )}
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
      <Form.Item name="groupBuyDescription" label="团购说明">
        <TextArea rows={3} placeholder="例：3人成团享8折优惠，2人成团赠送精修照片5张" maxLength={500} showCount />
      </Form.Item>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>阶梯团购价</span>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => { setNewTierMinCount(3); setNewTierPrice(0); setTierModalOpen(true); }}>
            添加阶梯
          </Button>
        </Space>
        {tiers.length > 0 ? (
          <Table
            dataSource={tiers}
            rowKey={(r) => r.id ?? String(r.minCount)}
            pagination={false}
            size="small"
            style={{ marginTop: 8 }}
            columns={[
              { title: '成团人数', dataIndex: 'minCount', width: 120, render: (v: number) => `${v} 人` },
              { title: '阶梯价格', dataIndex: 'price', width: 150, render: (v: number) => `¥${Number(v).toFixed(2)}` },
              {
                title: '操作', width: 80,
                render: (_: any, record: any) => (
                  <Button type="link" danger icon={<MinusCircleOutlined />} onClick={() => record.id != null && deleteTier(Number(record.id))} />
                ),
              },
            ]}
          />
        ) : (
          <div style={{ color: '#999', fontSize: 13, marginTop: 8 }}>暂未设置阶梯价格，将使用上方团购价</div>
        )}
      </div>

      {/* 添加阶梯弹窗 */}
      <Modal
        title="添加阶梯价格"
        open={tierModalOpen}
        onOk={addTier}
        onCancel={() => setTierModalOpen(false)}
        okText="添加"
        width={360}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>成团人数</div>
            <InputNumber min={2} max={100} value={newTierMinCount} onChange={(v) => setNewTierMinCount(v || 3)} style={{ width: '100%' }} addonAfter="人" />
          </div>
          <div>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>阶梯价格</div>
            <InputNumber min={0} precision={2} value={newTierPrice} onChange={(v) => setNewTierPrice(v || 0)} style={{ width: '100%' }} addonBefore="¥" />
          </div>
        </Space>
      </Modal>

      <Divider orientation="left"><PictureOutlined /> 团购海报设置</Divider>
      <Form.Item name="posterTitle" label="海报标题">
        <Input placeholder="默认使用套餐名称，可自定义" maxLength={200} showCount />
      </Form.Item>
      <Form.Item name="posterContent" label="海报描述">
        <TextArea rows={2} placeholder="海报上展示的宣传语" maxLength={1000} showCount />
      </Form.Item>
      <Form.Item name="posterBackground" label="海报背景">
        <Input placeholder="颜色代码如 #fce4ec，或背景图片URL" maxLength={500} />
      </Form.Item>
      <Form.Item name="posterImages" label="宣传照片">
        <Upload
          listType="picture-card"
          fileList={posterFileList}
          onRemove={(file) => {
            const uid = (file as any).uid;
            setPosterFileList(prev => prev.filter(f => f.uid !== uid));
          }}
          onChange={({ fileList: newFileList }) => {
            setPosterFileList(prev => {
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
            setPosterFileList(prev => [
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
                setPosterFileList(prev => prev.map(f => (f.uid === uid ? ({ ...f, status: 'done', url: data.url } as UploadFile) : f)));
              } else {
                message.error('图片上传失败');
                setPosterFileList(prev => prev.filter(f => f.uid !== uid));
              }
            } catch (err: any) {
              message.error('图片上传失败: ' + (err.message || ''));
              setPosterFileList(prev => prev.filter(f => f.uid !== uid));
            }

            return false;
          }}
        >
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>上传照片</div>
        </Upload>
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
      <div style={{ maxWidth: 1400, margin: '0 auto', resize: 'both', overflow: 'auto', minWidth: 800, minHeight: 400, padding: 4, border: '1px dashed #d9d9d9', borderRadius: 4 }}>
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
      width={1200}
      styles={{ body: { maxHeight: '65vh', overflow: 'auto', resize: 'both', minWidth: 600, minHeight: 300 } }}
    >
      {formContent}
    </Modal>
  );
};

export default PackageForm;
