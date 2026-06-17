import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Space, Modal, Form, Select, Input, InputNumber, DatePicker, message, Spin, Divider, Image, Tabs, Upload, Popconfirm, Typography } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UploadOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { WxUser } from '@/types/wxUser';
import { wxUserService } from '@/services/wxUser';
import { crmService } from '@/services/crmService';
import { photoAlbumService, PhotoAlbum } from '@/services/photoAlbum';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { UploadFile } from 'antd/es/upload/interface';

const { Paragraph } = Typography;

const levelColors = ['green', 'geekblue', 'gold', 'orange', 'red'];

const churnStatusMap: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '活跃', color: 'green' },
  AT_RISK: { text: '有流失风险', color: 'orange' },
  CHURNED: { text: '已流失', color: 'red' },
};

const statusMap: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: '正常', color: 'green' },
  INACTIVE: { text: '未激活', color: 'default' },
  BANNED: { text: '禁用', color: 'red' },
};

const zodiacOptions = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const constellationOptions = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];

const WxUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<WxUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  // 相册管理
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [memberLevels, setMemberLevels] = useState<{ level: number; name: string }[]>([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<string[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadAlbumType, setUploadAlbumType] = useState<'SAMPLE' | 'ALBUM'>('SAMPLE');
  const [uploadForm] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<File[]>([]);

  // 成长里程碑
  const [milestones, setMilestones] = useState<any[]>([]);
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [milestoneForm] = Form.useForm();

  // 收货地址
  const [addresses, setAddresses] = useState<any[]>([]);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await wxUserService.getById(id);
      setUser(data);
    } catch {
      message.error('获取客户详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    if (id) {
      fetchMilestones();
      fetchAddresses();
    }
  }, [id]);

  useEffect(() => {
    crmService.getMemberLevels().then((res: any) => {
      const d = res?.data || res || [];
      setMemberLevels(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  // 加载相册列表
  const fetchAlbums = async () => {
    if (!id) return;
    setAlbumLoading(true);
    try {
      // SAMPLE 为公共样片（无 wxUserId），ALBUM 为当前客户的电子相册
      const [sampleRes, albumRes] = await Promise.all([
        photoAlbumService.getList({ albumType: 'SAMPLE', page: 1, limit: 50 }),
        photoAlbumService.getList({ albumType: 'ALBUM', wxUserId: id, page: 1, limit: 50 }),
      ]);
      setAlbums([...(sampleRes.items || []), ...(albumRes.items || [])]);
    } catch {
      // ignore
    } finally {
      setAlbumLoading(false);
    }
  };

  useEffect(() => { if (id) fetchAlbums(); }, [id]);

  // 打开上传弹窗
  const openUploadModal = (type: 'SAMPLE' | 'ALBUM') => {
    setUploadAlbumType(type);
    setFileList([]);
    fileRef.current = [];
    uploadForm.resetFields();
    setUploadModalVisible(true);
  };

  // 上传文件到服务器
  const handleUpload = async () => {
    try {
      const values = await uploadForm.validateFields();
      setUploading(true);

      // 先上传图片文件
      const photoUrls: string[] = [];
      const token = localStorage.getItem('admin_token');

      const rawFiles = fileRef.current;
      for (let i = 0; i < rawFiles.length; i++) {
        const rawFile = rawFiles[i];
        if (!rawFile) continue;
        // Upload the file to server
        try {
          const formData = new FormData();
          formData.append('file', rawFile);
          const uploadRes: any = await fetch('/api/v1/files/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }).then(r => r.json());
          const url = uploadRes.url || uploadRes.data?.url || '';
          if (url) photoUrls.push(url);
        } catch (e) {
          console.error('[Upload] 文件上传失败:', rawFile.name, e);
        }
      }

      await photoAlbumService.create({
        wxUserId: uploadAlbumType === 'ALBUM' ? id : undefined,
        albumType: uploadAlbumType,
        title: values.title,
        description: values.description,
        photoUrls: JSON.stringify(photoUrls),
        coverUrl: photoUrls[0] || undefined,
      });

      message.success('上传成功');
      setUploadModalVisible(false);
      fetchAlbums();
    } catch {
      // validation failed or upload error
    } finally {
      setUploading(false);
    }
  };

  // 删除相册
  const handleDeleteAlbum = async (albumId: string) => {
    try {
      await photoAlbumService.remove(albumId);
      message.success('删除成功');
      fetchAlbums();
    } catch {
      message.error('删除失败');
    }
  };

  // 删除单张照片
  const handleDeletePhoto = async (albumId: string, photoUrl: string) => {
    try {
      await photoAlbumService.removePhoto(albumId, photoUrl);
      message.success('照片已删除');
      fetchAlbums();
    } catch {
      message.error('删除失败');
    }
  };

  // 批量删除相册
  const handleBatchDelete = async (ids: string[], type: 'SAMPLE' | 'ALBUM') => {
    if (ids.length === 0) return;
    Modal.confirm({
      title: `确定删除选中的 ${ids.length} 个${type === 'SAMPLE' ? '样片' : '电子相册'}吗？`,
      content: '删除后不可恢复',
      onOk: async () => {
        let success = 0;
        for (const albumId of ids) {
          try {
            await photoAlbumService.remove(albumId);
            success++;
          } catch { /* ignore single failure */ }
        }
        message.success(`已删除 ${success} 个`);
        if (type === 'SAMPLE') setSelectedSampleIds([]);
        else setSelectedAlbumIds([]);
        fetchAlbums();
      },
    });
  };

  const sampleAlbums = albums.filter(a => a.albumType === 'SAMPLE');
  const customerAlbums = albums.filter(a => a.albumType === 'ALBUM');

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const payload: any = { ...values };
      // 日期字段转换
      if (values.birthday) payload.birthday = values.birthday.toISOString();
      if (values.hundredDaysDate) payload.hundredDaysDate = values.hundredDaysDate.toISOString();
      if (values.firstBirthdayDate) payload.firstBirthdayDate = values.firstBirthdayDate.toISOString();
      // 数字字段
      if (values.height !== undefined && values.height !== null) payload.height = Number(values.height);
      if (values.weight !== undefined && values.weight !== null) payload.weight = Number(values.weight);

      await wxUserService.update(id!, payload);
      message.success('更新成功');
      setEditModalVisible(false);
      fetchDetail();
    } catch {
      // validation failed
    }
  };

  const openEditModal = () => {
    if (user) {
      editForm.setFieldsValue({
        ...user,
        birthday: user.birthday ? dayjs(user.birthday) : null,
        hundredDaysDate: user.hundredDaysDate ? dayjs(user.hundredDaysDate) : null,
        firstBirthdayDate: user.firstBirthdayDate ? dayjs(user.firstBirthdayDate) : null,
      });
      setEditModalVisible(true);
    }
  };

  // ==================== 成长里程碑 ====================
  const fetchMilestones = async () => {
    if (!id) return;
    try {
      const res: any = await wxUserService.getMilestones(id);
      setMilestones(res?.data || []);
    } catch { /* ignore */ }
  };

  const handleCreateMilestone = () => {
    setEditingMilestone(null);
    milestoneForm.resetFields();
    setMilestoneModalVisible(true);
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestone(milestone);
    milestoneForm.setFieldsValue({
      ...milestone,
      recordDate: milestone.recordDate ? dayjs(milestone.recordDate) : null,
    });
    setMilestoneModalVisible(true);
  };

  const handleSaveMilestone = () => {
    if (savingMilestone) return;
    setSavingMilestone(true);

    milestoneForm.validateFields()
      .then(async (values) => {
        const payload: any = { ...values };
        if (values.recordDate) payload.recordDate = values.recordDate.toISOString();

        if (editingMilestone) {
          await wxUserService.updateMilestone(id!, editingMilestone.id, payload);
        } else {
          await wxUserService.createMilestone(id!, payload);
        }
        milestoneForm.resetFields();
        fetchMilestones();
        setMilestoneModalVisible(false);
        setSavingMilestone(false);
        setTimeout(() => message.success(editingMilestone ? '更新成功' : '创建成功'), 50);
      })
      .catch(() => {
        setSavingMilestone(false);
      });
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    Modal.confirm({
      title: '确定删除这条成长记录？',
      onOk: async () => {
        try {
          await wxUserService.deleteMilestone(id!, milestoneId);
          message.success('删除成功');
          fetchMilestones();
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  // ==================== 收货地址 ====================
  const fetchAddresses = async () => {
    if (!id) return;
    try {
      const data = await wxUserService.getAddresses(id);
      setAddresses(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  };

  const milestoneTypeOptions = [
    '出生', '百天', '周岁', '二周岁', '三周岁', '四周岁', '五周岁',
    '幼儿园', '小学', '初中', '高中', '大学', '硕士', '博士', '其他',
  ];

  const orderColumns: ColumnsType<any> = [
    { title: '订单号', dataIndex: 'orderNo', width: 180 },
    { title: '套餐', dataIndex: ['package', 'name'], width: 140 },
    {
      title: '预约时间', width: 160,
      render: (_, r) => {
        if (!r.timeSlot) return '-';
        return `${r.timeSlot.date?.slice(0, 10) || ''} ${r.timeSlot.startTime?.slice(11, 16) || ''}-${r.timeSlot.endTime?.slice(11, 16) || ''}`;
      },
    },
    { title: '金额', dataIndex: 'totalAmount', width: 100, render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
    { title: '状态', dataIndex: 'orderStatus', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (v: string) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ];

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('zh-CN');
  };

  const isVideoUrl = (url: string) => /\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i.test(url);

  const parsePhotoUrls = (json: string): string[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return json ? [json] : []; }
  };

  const renderMedia = (url: string, albumId: string) => {
    if (isVideoUrl(url)) {
      return (
        <div
          style={{ width: 60, height: 60, background: '#1a1a2e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
          onClick={() => window.open(url, '_blank')}
        >
          <span style={{ color: '#fff', fontSize: 24, opacity: 0.8 }}>▶</span>
          <span style={{ position: 'absolute', bottom: 2, right: 4, color: '#fff', fontSize: 9, opacity: 0.7 }}>视频</span>
        </div>
      );
    }
    return <Image width={60} src={url} style={{ display: 'block' }} />;
  };

  const photoPreviewRender = (albumId: string, photoUrls: string) => {
    const urls = parsePhotoUrls(photoUrls);
    if (urls.length === 0) return '-';
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {urls.map((u, i) => (
          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
            {renderMedia(u, albumId)}
            <Popconfirm
              title="删除这张照片？"
              onConfirm={() => handleDeletePhoto(albumId, u)}
            >
              <div
                style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 18, height: 18,
                  background: 'rgba(255,77,79,0.85)',
                  color: '#fff', fontSize: 12, lineHeight: '18px',
                  textAlign: 'center', cursor: 'pointer',
                  borderTopRightRadius: 6,
                }}
              >✕</div>
            </Popconfirm>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />;
  if (!user) return <div style={{ padding: 24 }}>客户不存在</div>;

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/wx-users')} style={{ marginBottom: 16 }}>
        返回客户列表
      </Button>

      <Tabs
        defaultActiveKey="basic"
        tabBarExtraContent={
          <Button type="primary" icon={<EditOutlined />} onClick={openEditModal}>编辑资料</Button>
        }
        items={[
          {
            key: 'basic',
            label: '基本信息',
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="账户信息">
                    <Descriptions.Item label="微信昵称">{user.nickname || '-'}</Descriptions.Item>
                    <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
                    <Descriptions.Item label="OpenID">{user.openid}</Descriptions.Item>
                    <Descriptions.Item label="性别">
                      {user.gender === 1 ? '男' : user.gender === 2 ? '女' : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="真实姓名">{user.realName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={statusMap[user.status]?.color}>{statusMap[user.status]?.text || user.status}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="注册时间">{formatDate(user.createdAt)}</Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="收货地址" style={{ marginBottom: 16 }}>
                  {addresses.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无收货地址</div>
                  ) : (
                    <Table
                      dataSource={addresses}
                      rowKey="id"
                      pagination={false}
                      columns={[
                        { title: '收件人', dataIndex: 'receiverName', width: 100 },
                        { title: '电话', dataIndex: 'phone', width: 130 },
                        {
                          title: '地址',
                          render: (_, r) => `${r.province || ''} ${r.city || ''} ${r.district || ''} ${r.detail || ''}`,
                        },
                        {
                          title: '默认', dataIndex: 'isDefault', width: 60,
                          render: (v: boolean) => v ? <Tag color="blue">默认</Tag> : '-',
                        },
                      ]}
                    />
                  )}
                </Card>
              </>
            ),
          },
          {
            key: 'baby',
            label: '宝宝信息',
            children: (
              <>
                <Card style={{ marginBottom: 16 }}>
                  <Descriptions column={2} title="宝宝资料">
                    <Descriptions.Item label="宝宝姓名">{user.realName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="身高">{user.height ? `${user.height} cm` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="体重">{user.weight ? `${user.weight} kg` : '-'}</Descriptions.Item>
                    <Descriptions.Item label="生肖">{user.zodiac || '-'}</Descriptions.Item>
                    <Descriptions.Item label="星座">{user.constellation || '-'}</Descriptions.Item>
                    <Descriptions.Item label="学校/幼儿园">{user.schoolName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="兴趣/特长">{user.talent || '-'}</Descriptions.Item>
                    <Descriptions.Item label="出生日期">{user.birthday ? new Date(user.birthday).toLocaleDateString('zh-CN') : '-'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </>
            ),
          },
          {
            key: 'member',
            label: '会员信息',
            children: (
              <Card>
                <Descriptions column={3}>
                  <Descriptions.Item label="会员等级">
                    <Tag color={(() => { const i = memberLevels.findIndex(l => l.name === user.memberLevel); return i >= 0 ? levelColors[i] || 'default' : 'default'; })()}>{user.memberLevel || '普通会员'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="活跃状态">
                    <Tag color={churnStatusMap[user.churnStatus]?.color}>{churnStatusMap[user.churnStatus]?.text || user.churnStatus}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="成长值">{user.growthPoints}</Descriptions.Item>
                  <Descriptions.Item label="积分余额">{user.pointsBalance ?? 0}</Descriptions.Item>
                  <Descriptions.Item label="总订单数">{user.totalOrders}</Descriptions.Item>
                  <Descriptions.Item label="总消费">¥{Number(user.totalAmount || 0).toFixed(2)}</Descriptions.Item>
                  <Descriptions.Item label="最后下单">
                    {user.lastOrderAt ? new Date(user.lastOrderAt).toLocaleString('zh-CN') : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ),
          },
          {
            key: 'service',
            label: `客户服务`,
            children: (
              <>
                <Card title="关联订单" style={{ marginBottom: 16 }}>
                  <Table
                    columns={orderColumns}
                    dataSource={user.orders || []}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 800 }}
                  />
                </Card>

                <Card
                  title="宝宝幸福空间"
                  style={{ marginBottom: 16 }}
                  extra={
                    <Button type="primary" icon={<EditOutlined />} onClick={handleCreateMilestone}>
                      新增记录
                    </Button>
                  }
                >
                  {milestones.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无成长记录</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {milestones.map((m) => (
                        <Card
                          key={m.id}
                          size="small"
                          type="inner"
                          title={<Tag color="blue">{m.type}</Tag>}
                          extra={
                            <Space>
                              <Button type="link" size="small" onClick={() => handleEditMilestone(m)}>编辑</Button>
                              <Button type="link" size="small" danger onClick={() => handleDeleteMilestone(m.id)}>删除</Button>
                            </Space>
                          }
                        >
                          <Descriptions column={3} size="small">
                            {m.recordDate && <Descriptions.Item label="日期">{new Date(m.recordDate).toLocaleDateString('zh-CN')}</Descriptions.Item>}
                            {m.height != null && <Descriptions.Item label="身高">{m.height} cm</Descriptions.Item>}
                            {m.weight != null && <Descriptions.Item label="体重">{m.weight} kg</Descriptions.Item>}
                            {m.hobby && <Descriptions.Item label="爱好">{m.hobby}</Descriptions.Item>}
                            {m.photo && (
                              <Descriptions.Item label="照片/视频" span={3}>
                                {parsePhotoUrls(m.photo).filter(u => !isVideoUrl(u)).length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                                    {parsePhotoUrls(m.photo).filter(u => !isVideoUrl(u)).map((u, i) => (
                                      <Image key={i} width={80} src={u} style={{ borderRadius: 4 }} />
                                    ))}
                                  </div>
                                )}
                                {parsePhotoUrls(m.photo).filter(u => isVideoUrl(u)).map((u, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 20 }}>▶</span>
                                    <a href={u} target="_blank" rel="noopener noreferrer">查看视频</a>
                                  </div>
                                ))}
                              </Descriptions.Item>
                            )}
                            {m.momBlessing && <Descriptions.Item label="妈妈寄语">{m.momBlessing}</Descriptions.Item>}
                            {m.dadBlessing && <Descriptions.Item label="爸爸寄语">{m.dadBlessing}</Descriptions.Item>}
                            {m.elderBlessing && <Descriptions.Item label="长辈寄语">{m.elderBlessing}</Descriptions.Item>}
                          </Descriptions>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>

                <Card
                  title="样片管理"
                  extra={
                    <Space>
                      {selectedSampleIds.length > 0 && (
                        <Button danger icon={<DeleteOutlined />} onClick={() => handleBatchDelete(selectedSampleIds, 'SAMPLE')}>
                          批量删除 ({selectedSampleIds.length})
                        </Button>
                      )}
                      <Button icon={<UploadOutlined />} onClick={() => openUploadModal('SAMPLE')}>
                        上传样片
                      </Button>
                    </Space>
                  }
                  style={{ marginBottom: 16 }}
                >
                  {sampleAlbums.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无样片</div>
                  ) : (
                    <Table
                      dataSource={sampleAlbums}
                      rowKey="id"
                      pagination={false}
                      rowSelection={{
                        selectedRowKeys: selectedSampleIds,
                        onChange: (keys: any[]) => setSelectedSampleIds(keys.map(String)),
                      }}
                      columns={[
                        { title: '标题', dataIndex: 'title', width: 200 },
                        {
                          title: '预览', width: 260,
                          render: (_, r) => photoPreviewRender(r.id, r.photoUrls),
                        },
                        { title: '描述', dataIndex: 'description', ellipsis: true },
                        {
                          title: '创建时间', dataIndex: 'createdAt', width: 160,
                          render: (v: string) => formatDate(v),
                        },
                        {
                          title: '操作', width: 80,
                          render: (_, r) => (
                            <Popconfirm title="确定删除？" onConfirm={() => handleDeleteAlbum(r.id)}>
                              <Button type="link" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                      loading={albumLoading}
                    />
                  )}
                </Card>

                <Card
                  title="电子相册"
                  extra={
                    <Space>
                      {selectedAlbumIds.length > 0 && (
                        <Button danger icon={<DeleteOutlined />} onClick={() => handleBatchDelete(selectedAlbumIds, 'ALBUM')}>
                          批量删除 ({selectedAlbumIds.length})
                        </Button>
                      )}
                      <Button icon={<UploadOutlined />} onClick={() => openUploadModal('ALBUM')}>
                        上传视频
                      </Button>
                    </Space>
                  }
                >
                  {customerAlbums.length === 0 ? (
                    <div style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无电子相册</div>
                  ) : (
                    <Table
                      dataSource={customerAlbums}
                      rowKey="id"
                      pagination={false}
                      rowSelection={{
                        selectedRowKeys: selectedAlbumIds,
                        onChange: (keys: any[]) => setSelectedAlbumIds(keys.map(String)),
                      }}
                      columns={[
                        { title: '标题', dataIndex: 'title', width: 200 },
                        {
                          title: '预览', width: 260,
                          render: (_, r) => photoPreviewRender(r.id, r.photoUrls),
                        },
                        { title: '描述', dataIndex: 'description', ellipsis: true },
                        {
                          title: '创建时间', dataIndex: 'createdAt', width: 160,
                          render: (v: string) => formatDate(v),
                        },
                        {
                          title: '操作', width: 80,
                          render: (_, r) => (
                            <Popconfirm title="确定删除？" onConfirm={() => handleDeleteAlbum(r.id)}>
                              <Button type="link" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          ),
                        },
                      ]}
                      loading={albumLoading}
                    />
                  )}
                </Card>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={uploadAlbumType === 'SAMPLE' ? '上传样片' : '上传视频'}
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => setUploadModalVisible(false)}
        confirmLoading={uploading}
        okText="上传"
        width={560}
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
          <Form.Item label="选择文件（支持图片和视频，单个最大 200MB）">
            <Upload
              accept="image/*,video/*"
              listType="picture-card"
              fileList={fileList}
              multiple
              beforeUpload={(file) => {
                const rawFile = (file as any).originFileObj || file;
                const thumbUrl = URL.createObjectURL(rawFile);
                setFileList(prev => [...prev, { ...file, thumbUrl }]);
                fileRef.current.push(rawFile);
                return false;
              }}
              onRemove={(file) => {
                setFileList(prev => prev.filter(f => f.uid !== file.uid));
                // 从 ref 中移除对应的原始文件
                const raw = file as any;
                const rawFile = raw.originFileObj || raw;
                const idx = fileRef.current.findIndex(f => f.name === rawFile.name && f.size === rawFile.size);
                if (idx !== -1) fileRef.current.splice(idx, 1);
              }}
            >
              {fileList.length >= 9 ? null : (
                <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingMilestone ? '编辑记录' : '新增记录'}
        open={milestoneModalVisible}
        onOk={handleSaveMilestone}
        onCancel={() => setMilestoneModalVisible(false)}
        destroyOnHidden
        confirmLoading={savingMilestone}
        width={640}
      >
        <Form form={milestoneForm} layout="vertical">
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Input placeholder="例如：出生、百天、周岁、幼儿园、小学、中学、高中、大学、硕士、博士" />
          </Form.Item>
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <span style={{ lineHeight: '22px', marginRight: 4, color: '#888', fontSize: 12 }}>快捷选择:</span>
            {milestoneTypeOptions.filter(t => t !== '其他').map(t => (
              <Tag key={t} color="blue" style={{ cursor: 'pointer' }}
                onClick={() => milestoneForm.setFieldsValue({ type: t })}
              >{t}</Tag>
            ))}
          </div>
          <Form.Item name="recordDate" label="日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="height" label="身高(cm)">
              <InputNumber min={0} max={250} step={0.1} />
            </Form.Item>
            <Form.Item name="weight" label="体重(kg)">
              <InputNumber min={0} max={200} step={0.1} />
            </Form.Item>
          </Space>
          <Form.Item name="hobby" label="爱好">
            <Input placeholder="宝宝的兴趣爱好" />
          </Form.Item>
          <Form.Item name="photo" label="照片/视频 URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="momBlessing" label="妈妈寄语">
            <Input.TextArea rows={2} placeholder="妈妈对宝宝的祝福" />
          </Form.Item>
          <Form.Item name="dadBlessing" label="爸爸寄语">
            <Input.TextArea rows={2} placeholder="爸爸对宝宝的祝福" />
          </Form.Item>
          <Form.Item name="elderBlessing" label="长辈寄语">
            <Input.TextArea rows={2} placeholder="长辈对宝宝的祝福" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑客户资料"
        open={editModalVisible}
        onOk={handleEdit}
        onCancel={() => setEditModalVisible(false)}
        width={720}
      >
        <Form form={editForm} layout="vertical" style={{ maxHeight: 500, overflow: 'auto' }}>
          <Divider orientation="left" plain>基本信息</Divider>
          <Form.Item name="realName" label="真实姓名">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="家庭住址">
            <Input />
          </Form.Item>

          <Divider orientation="left" plain>宝宝信息</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="height" label="身高(cm)">
              <InputNumber min={0} max={200} step={0.1} />
            </Form.Item>
            <Form.Item name="weight" label="体重(kg)">
              <InputNumber min={0} max={100} step={0.1} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="zodiac" label="生肖">
              <Select style={{ width: 130 }}>
                {zodiacOptions.map(z => <Select.Option key={z} value={z}>{z}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="constellation" label="星座">
              <Select style={{ width: 130 }}>
                {constellationOptions.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="schoolName" label="学校名称">
            <Input />
          </Form.Item>
          <Form.Item name="talent" label="宝宝特长">
            <Input />
          </Form.Item>

          <Divider orientation="left" plain>重要日期</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="birthday" label="出生日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="hundredDaysDate" label="百天日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="firstBirthdayDate" label="周岁日期">
              <DatePicker />
            </Form.Item>
          </Space>

          <Divider orientation="left" plain>会员设置</Divider>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="memberLevel" label="会员等级" rules={[{ required: true }]}>
              <Select style={{ width: 130 }}>
                {memberLevels.map(l => (
                  <Select.Option key={l.name} value={l.name}>{l.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select style={{ width: 120 }}>
                <Select.Option value="ACTIVE">正常</Select.Option>
                <Select.Option value="INACTIVE">未激活</Select.Option>
                <Select.Option value="BANNED">禁用</Select.Option>
              </Select>
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default WxUserDetail;
