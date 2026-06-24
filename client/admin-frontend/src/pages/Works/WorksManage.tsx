import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Modal, Form, Input, Select, message, Popconfirm,
  Image, Upload, Space, Tag, Tooltip, Empty,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { photoAlbumService, PhotoAlbum } from '@/services/photoAlbum';
import { workCategoryService, WorkCategory } from '@/services/workCategories';
import { photographerService, Photographer } from '@/services/photographers';
import { simple } from '@/services/api';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';

const WorksManage: React.FC = () => {
  const [works, setWorks] = useState<PhotoAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<WorkCategory[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [filterCategory, setFilterCategory] = useState<number | undefined>();
  const [filterPhotographer, setFilterPhotographer] = useState<number | undefined>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState<PhotoAlbum | null>(null);
  const [form] = Form.useForm();

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const params: any = { albumType: 'PORTFOLIO', page, limit: 20 };
      if (filterCategory) params.categoryId = filterCategory;
      if (filterPhotographer) params.photographerId = filterPhotographer;
      const res = await photoAlbumService.getList(params);
      setWorks(res.items || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      message.error('获取作品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [cats, photogs] = await Promise.all([
        workCategoryService.getAll(),
        photographerService.getAll(),
      ]);
      setCategories(cats);
      setPhotographers(photogs);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchWorks(); }, [page, filterCategory, filterPhotographer]);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setFileList([]);
    setModalOpen(true);
  };

  const openEdit = (item: PhotoAlbum) => {
    setEditingId(item.id);
    form.setFieldsValue({
      title: item.title,
      description: item.description,
      categoryId: item.categoryId,
      photographerId: item.photographerId,
      isPublic: item.isPublic !== false,
    });
    setFileList([]);
    setModalOpen(true);
  };

  const handleSave = async (notify = false) => {
    const values = await form.validateFields();
    try {
      // 从上传组件收集图片 URL
      const photoUrls = fileList
        .filter(f => f.status === 'done' && f.response?.data?.url)
        .map(f => f.response.data.url);

      const data = {
        ...values,
        albumType: 'PORTFOLIO',
        photoUrls: JSON.stringify(photoUrls),
        coverUrl: photoUrls[0] || undefined,
      };

      if (editingId) {
        await photoAlbumService.update(editingId, data);
        message.success('更新成功');
      } else {
        await photoAlbumService.create(data);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchWorks();

      if (notify) {
        simple.post('/wx-official-account/notify', {
          type: 'work',
          name: values.title,
          page: 'pages/works/works',
        }).catch(() => {});
      }
    } catch (e) {
      // validation error handled by antd
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await photoAlbumService.remove(id);
      message.success('删除成功');
      fetchWorks();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const showDetail = async (id: string) => {
    try {
      const data = await photoAlbumService.getDetail(id);
      setDetailData(data);
      setDetailVisible(true);
    } catch (e) {
      message.error('获取详情失败');
    }
  };

  const uploadAction = `${(window as any).__BASE_URL__ || ''}/api/v1/files/upload`;

  return (
    <div>
      <Card
        title="作品管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>上传作品</Button>}
      >
        {/* Filter */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 160 }}
              value={filterCategory}
              onChange={v => { setFilterCategory(v); setPage(1); }}
            >
              {categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Col>
          <Col>
            <Select
              placeholder="选择摄影师"
              allowClear
              style={{ width: 160 }}
              value={filterPhotographer}
              onChange={v => { setFilterPhotographer(v); setPage(1); }}
            >
              {photographers.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Col>
        </Row>

        {/* Grid */}
        <Row gutter={[16, 16]}>
          {works.map(item => (
            <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
              <Card
                hoverable
                cover={
                  <Image
                    alt={item.title}
                    src={item.coverUrl || '/placeholder.png'}
                    style={{ height: 180, objectFit: 'cover' }}
                    preview={false}
                  />
                }
                actions={[
                  <Tooltip title="查看" key="view"><EyeOutlined onClick={() => showDetail(item.id)} /></Tooltip>,
                  <Tooltip title="编辑" key="edit"><EditOutlined onClick={() => openEdit(item)} /></Tooltip>,
                  <Tooltip title="删除" key="del">
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(item.id)}>
                      <DeleteOutlined />
                    </Popconfirm>
                  </Tooltip>,
                ]}
              >
                <Card.Meta
                  title={<div style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>}
                  description={
                    <div>
                      {item.category && <Tag color="pink">{item.category.name}</Tag>}
                      {item.photographer && <Tag color="blue">{item.photographer.name}</Tag>}
                      <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                        {dayjs(item.createdAt).format('YYYY-MM-DD')}
                      </div>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>

        {works.length === 0 && !loading && <Empty style={{ marginTop: 40 }} description="暂无作品" />}

        {/* Pagination */}
        {total > 20 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>上一页</Button>
            <span style={{ margin: '0 16px' }}>{page} / {Math.ceil(total / 20)}</span>
            <Button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}>下一页</Button>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingId ? '编辑作品' : '上传作品'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width={640}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={() => handleSave(false)}>保存</Button>
            <Button type="primary" onClick={() => handleSave(true)}>保存并通知</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="作品名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入作品名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select placeholder="选择分类" allowClear>
              {categories.map(c => <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="photographerId" label="摄影师">
            <Select placeholder="选择摄影师" allowClear>
              {photographers.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="上传图片">
            <Upload
              action={uploadAction}
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              multiple
            >
              {fileList.length < 9 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="作品详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {detailData && (
          <div>
            <h3>{detailData.title}</h3>
            {detailData.description && <p style={{ color: '#666' }}>{detailData.description}</p>}
            <Space style={{ marginBottom: 16 }}>
              {detailData.category && <Tag color="pink">{detailData.category.name}</Tag>}
              {detailData.photographer && <Tag color="blue">摄影师: {detailData.photographer.name}</Tag>}
            </Space>
            <Image.PreviewGroup>
              <Row gutter={[8, 8]}>
                {(() => {
                  try {
                    return JSON.parse(detailData.photoUrls || '[]').map((url: string, i: number) => (
                      <Col key={i} span={8}>
                        <Image src={url} style={{ width: '100%', borderRadius: 4 }} />
                      </Col>
                    ));
                  } catch {
                    return null;
                  }
                })()}
              </Row>
            </Image.PreviewGroup>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorksManage;
