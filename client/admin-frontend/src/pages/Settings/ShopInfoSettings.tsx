import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Upload,
  Space,
  Divider,
  Row,
  Col,
  Image,
  Spin,
  Modal,
  App,
} from 'antd';
import {
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  WechatOutlined,
  CameraOutlined,
  PictureOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import { getShopInfo, updateShopInfo, uploadShopImage } from '@/services/shopInfoService';
import type { BannerItem } from '@/services/shopInfoService';

const { TextArea } = Input;

// 获取完整的图片 URL
// 说明：后端现已将静态资源映射为 '/uploads'，上传接口返回 '/uploads/xxx' 形式。
// 为避免硬编码 localhost:3000，这里复用与服务端通信同一基址（VITE_API_URL 或默认 http://localhost:3000/api/v1 去掉末尾 /api/v1）。
const resolveBackendOrigin = () => {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api/v1';
  // 若 raw 是 '/api/v1' 相对路径 => 使用当前页面 origin（nginx 反向代理）
  if (!raw.startsWith('http')) {
    return window.location.origin;
  }
  // 若已是绝对地址 如 'http://localhost:3000/api/v1' 去掉末尾 '/api/v1'
  return raw.replace(/\/api\/v1$/,'');
};
const getImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url; // 已是完整 URL
  const origin = resolveBackendOrigin();
  // 如果后端已经返回 '/uploads/xxx' 则直接拼接 origin
  if (url.startsWith('/uploads/')) return origin + url;
  // 兼容旧格式（如果曾返回没有前导斜杠的）
  if (!url.startsWith('/')) return origin + '/uploads/' + url;
  return origin + url; // 兜底
};

const ShopInfoSettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shopPhoto, setShopPhoto] = useState<string | undefined>();
  const [locationMap, setLocationMap] = useState<string | undefined>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannerInterval, setBannerInterval] = useState<number>(4000);

  // 加载店铺信息
  useEffect(() => {
    loadShopInfo();
  }, []);

  const loadShopInfo = async () => {
    try {
      setLoading(true);
      const data = await getShopInfo();
      form.setFieldsValue(data);
      setShopPhoto(data.shopPhoto);
      setLocationMap(data.locationMap);
      setBanners(data.banners || []);
      setBannerInterval(data.bannerInterval ?? 4000);
    } catch (error: any) {
      message.error(error.message || '加载店铺信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      await updateShopInfo({
        ...values,
        banners,
        bannerInterval,
      });
      message.success('保存成功');
      loadShopInfo(); // 重新加载数据
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 上传图片配置
  const buildFileList = (url?: string): UploadFile[] =>
    url
      ? [
          {
            uid: '1',
            name: 'image',
            status: 'done',
            url: getImageUrl(url),
            thumbUrl: getImageUrl(url),
          },
        ]
      : [];

  const handlePreview = async (file: UploadFile) => {
    setPreviewImage(file.url || '');
    setPreviewVisible(true);
    setPreviewTitle(file.name || '预览');
  };

  const uploadProps = (fieldName: 'shopPhoto' | 'locationMap'): UploadProps => ({
  name: 'file',
  listType: 'picture-card',
  maxCount: 1,
    fileList: buildFileList(fieldName === 'shopPhoto' ? shopPhoto : locationMap),
    onPreview: handlePreview,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return Upload.LIST_IGNORE;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过 5MB!');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const result = await uploadShopImage(fieldName, file as File);
        if (fieldName === 'shopPhoto') {
          setShopPhoto(result.url);
        } else {
          setLocationMap(result.url);
        }
        message.success('上传成功');
        onSuccess?.(result, file as any);
      } catch (error: any) {
        message.error(error.message || '上传失败');
        onError?.(error as any);
      }
    },
    onRemove: () => {
      if (fieldName === 'shopPhoto') setShopPhoto(undefined);
      else setLocationMap(undefined);
      return true;
    },
  });

  // ===== 轮播图管理 =====

  const handleBannerUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    try {
      const result = await uploadShopImage('banner', file as File);
      setBanners(prev => [...prev, { image: result.url, title: '', link: '' }]);
      message.success('上传成功');
      onSuccess?.(result, file as any);
    } catch (error: any) {
      message.error(error.message || '上传失败');
      onError?.(error as any);
    }
  };

  const updateBannerField = (index: number, field: 'title' | 'link', value: string) => {
    setBanners(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const removeBanner = (index: number) => {
    setBanners(prev => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    form.resetFields();
    loadShopInfo();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <ShopOutlined />
            <span>店铺信息设置</span>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          {/* 基本信息 */}
          <Divider orientation="left">基本信息</Divider>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="店铺名称"
                name="shopName"
                rules={[{ required: true, message: '请输入店铺名称' }]}
              >
                <Input
                  prefix={<ShopOutlined />}
                  placeholder="请输入店铺名称"
                  maxLength={200}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="手机号码"
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号码' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="请输入手机号码"
                  maxLength={11}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="固定电话"
                name="telephone"
                rules={[
                  { pattern: /^\d{3,4}-?\d{7,8}$/, message: '请输入正确的固定电话' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="如: 010-12345678"
                  maxLength={20}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="营业时间" name="businessHours">
                <Input
                  placeholder="如: 周一至周日 9:00-18:00"
                  maxLength={100}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="店铺地址"
            name="address"
            rules={[{ required: true, message: '请输入店铺地址' }]}
          >
            <Input
              prefix={<EnvironmentOutlined />}
              placeholder="请输入店铺地址"
              maxLength={500}
            />
          </Form.Item>

          {/* 店铺坐标 */}
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="纬度"
                name="latitude"
                rules={[
                  {
                    type: 'number',
                    min: -90,
                    max: 90,
                    message: '纬度范围为 -90 到 90',
                  },
                ]}
              >
                <InputNumber
                  placeholder="如: 41.6888"
                  style={{ width: '100%' }}
                  step={0.0001}
                  precision={7}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="经度"
                name="longitude"
                rules={[
                  {
                    type: 'number',
                    min: -180,
                    max: 180,
                    message: '经度范围为 -180 到 180',
                  },
                ]}
              >
                <InputNumber
                  placeholder="如: 122.1123"
                  style={{ width: '100%' }}
                  step={0.0001}
                  precision={7}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="经营项目" name="businessScope">
            <TextArea
              placeholder="如: 儿童摄影、亲子照、全家福、百天照、周岁照"
              rows={2}
              maxLength={500}
            />
          </Form.Item>

          <Form.Item label="店铺描述" name="description">
            <TextArea
              placeholder="请输入店铺描述信息"
              rows={3}
              maxLength={1000}
            />
          </Form.Item>

          {/* 社交媒体 */}
          <Divider orientation="left">社交媒体账号</Divider>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="微信号" name="wechatId">
                <Input
                  prefix={<WechatOutlined />}
                  placeholder="请输入微信号"
                  maxLength={100}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="抖音号" name="douyinId">
                <Input placeholder="请输入抖音号" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="快手号" name="kuaishouId">
                <Input placeholder="请输入快手号" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="小红书号" name="xiaohongshuId">
                <Input placeholder="请输入小红书号" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          {/* 图片上传 */}
          <Divider orientation="left">店铺图片</Divider>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="店铺照片">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload {...uploadProps('shopPhoto')}>
                    {(!shopPhoto) && (
                      <div>
                        <CameraOutlined />
                        <div style={{ marginTop: 8 }}>上传店铺照片</div>
                      </div>
                    )}
                  </Upload>
                  <div style={{ color: '#999', fontSize: 12 }}>建议尺寸: 800x600, 支持 JPG/PNG/GIF, 不超过 5MB</div>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="位置地图">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload {...uploadProps('locationMap')}>
                    {(!locationMap) && (
                      <div>
                        <PictureOutlined />
                        <div style={{ marginTop: 8 }}>上传位置地图</div>
                      </div>
                    )}
                  </Upload>
                  <div style={{ color: '#999', fontSize: 12 }}>建议尺寸: 800x600, 支持 JPG/PNG/GIF, 不超过 5MB</div>
                </Space>
              </Form.Item>
            </Col>
          </Row>

          {/* 轮播图设置 */}
          <Divider orientation="left">轮播图设置</Divider>

          <Form.Item label="轮播播放间隔">
            <InputNumber
              min={1000}
              max={15000}
              step={500}
              value={bannerInterval}
              onChange={(val) => setBannerInterval(val ?? 4000)}
              addonAfter="毫秒"
              style={{ width: 200 }}
            />
            <span style={{ marginLeft: 12, color: '#999', fontSize: 12 }}>建议 3000-5000 毫秒</span>
          </Form.Item>

          <Form.Item label="轮播图片（最多5张）">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {banners.map((banner, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    background: '#fafafa',
                  }}
                >
                  <Image
                    src={getImageUrl(banner.image)}
                    width={100}
                    height={70}
                    style={{ objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Input
                      placeholder="标题（可选，显示在轮播图上）"
                      value={banner.title}
                      onChange={(e) => updateBannerField(index, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="跳转链接（可选，如 /packages）"
                      value={banner.link}
                      onChange={(e) => updateBannerField(index, 'link', e.target.value)}
                    />
                  </div>
                  <Button danger onClick={() => removeBanner(index)} style={{ flexShrink: 0 }}>
                    删除
                  </Button>
                </div>
              ))}
              {banners.length < 5 && (
                <Upload
                  name="file"
                  listType="picture-card"
                  showUploadList={false}
                  accept="image/jpeg,image/png,image/gif"
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      message.error('只能上传图片文件!');
                      return Upload.LIST_IGNORE;
                    }
                    const isLt5M = file.size / 1024 / 1024 < 5;
                    if (!isLt5M) {
                      message.error('图片大小不能超过 5MB!');
                      return Upload.LIST_IGNORE;
                    }
                    return true;
                  }}
                  customRequest={handleBannerUpload}
                >
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传轮播图</div>
                  </div>
                </Upload>
              )}
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
              建议分辨率 1920×600 px（宽屏适配最佳），72 DPI 网页标准分辨率。文件大小 100KB ~ 5MB，支持 JPG/PNG/GIF。第一张图为首页默认展示
            </div>
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item style={{ marginTop: 32 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                size="large"
              >
                保存设置
              </Button>
              <Button onClick={handleReset} size="large">
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
        <Modal
          open={previewVisible}
          title={previewTitle}
          footer={null}
          onCancel={() => setPreviewVisible(false)}
        >
          <Image src={previewImage} alt={previewTitle} style={{ width: '100%' }} />
        </Modal>
      </Card>
    </div>
  );
};

export default ShopInfoSettings;
