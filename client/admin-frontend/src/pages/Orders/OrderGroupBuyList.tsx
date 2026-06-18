import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Tag,
  Card,
  Button,
  Space,
  message,
  Modal,
  Descriptions,
  Image,
  Statistic,
  Row,
  Col,
  Select,
  InputNumber,
  DatePicker,
  Divider,
  Input,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  DeleteOutlined,
  UndoOutlined,
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { groupBuyService, type GroupBuyActivity, type GroupBuyQuery } from '@/services/groupBuy';
import { simple } from '@/services/api';
import PageContainer from '@/components/PageContainer';
import { useExcelExport } from '@/hooks/useExcelExport';

const { Option } = Select;

/** 格式化图片 URL */
const formatImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = (window as any).__BASE_URL__ || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const OrderGroupBuyList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<GroupBuyActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [keyword, setKeyword] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<GroupBuyActivity | null>(null);

  // 新建团购弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  interface WxUserOption { id: string; nickname: string; phone: string; }
  interface PackageOption { id: number; name: string; price: number; }
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [users, setUsers] = useState<WxUserOption[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [minCount, setMinCount] = useState(3);
  const [maxCount, setMaxCount] = useState<number | undefined>();

  // 编辑团购弹窗
  const [editOpen, setEditOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<GroupBuyActivity | null>(null);
  const [editMinCount, setEditMinCount] = useState(3);
  const [editMaxCount, setEditMaxCount] = useState<number | undefined>();
  const [editGroupPrice, setEditGroupPrice] = useState(0);
  const [editExpiredAt, setEditExpiredAt] = useState('');

  const { exportExcel } = useExcelExport();

  const buildQuery = useCallback((): GroupBuyQuery => {
    const q: GroupBuyQuery = { page, limit: pageSize, status: statusFilter };
    if (dateRange[0]) q.startDate = dateRange[0].format('YYYY-MM-DD');
    if (dateRange[1]) q.endDate = dateRange[1].format('YYYY-MM-DD');
    if (keyword.trim()) q.keyword = keyword.trim();
    return q;
  }, [page, pageSize, statusFilter, dateRange, keyword]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await groupBuyService.getList(buildQuery());
      setList(result.items || []);
      setTotal(result.pagination?.total || 0);
    } catch (err) {
      console.error('获取团购订单失败', err);
      message.error('获取团购订单失败');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleViewDetail = (activity: GroupBuyActivity) => {
    setSelectedActivity(activity);
    setDetailVisible(true);
  };

  const handleCancel = (activity: GroupBuyActivity) => {
    Modal.confirm({
      title: '确定要撤销该团购吗？',
      content: '撤销后该团购活动将标记为已失败，参与者将无法继续参团。',
      okText: '确认撤销',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await groupBuyService.cancel(activity.id);
          message.success('已撤销');
          fetchList();
        } catch (err: any) {
          message.error('撤销失败: ' + (err.message || ''));
        }
      },
    });
  };

  const handleDelete = (activity: GroupBuyActivity) => {
    Modal.confirm({
      title: '确定要删除该团购吗？',
      content: `删除后将同时清除所有参团记录，不可恢复。${activity.status === 'ACTIVE' ? '\n建议先撤销再删除。' : ''}`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await groupBuyService.delete(activity.id);
          message.success('已删除');
          fetchList();
        } catch (err: any) {
          message.error('删除失败: ' + (err.message || ''));
        }
      },
    });
  };

  const handleRestore = (activity: GroupBuyActivity) => {
    Modal.confirm({
      title: '确定要恢复该团购吗？',
      content: '恢复后将标记为进行中状态。',
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        try {
          await groupBuyService.restore(activity.id);
          message.success('已恢复');
          fetchList();
        } catch (err: any) {
          message.error('恢复失败: ' + (err.message || ''));
        }
      },
    });
  };

  // 套餐搜索
  const searchPackages = async (keyword: string = '') => {
    try {
      const res: any = await simple.get('/packages', {
        params: { page: 1, limit: 50, keyword, status: 'ACTIVE' },
      });
      const data = res?.data?.items || res?.data || [];
      setPackages(data.map((p: any) => ({ id: p.id, name: p.name, price: p.price })));
    } catch { /* ignore */ }
  };

  // 用户搜索
  const searchUsers = async (keyword: string = '') => {
    try {
      const res: any = await simple.get('/wx-users', {
        params: { page: 1, limit: 50, keyword },
      });
      const data = res?.data?.items || res?.data || [];
      setUsers(data.map((u: any) => ({ id: u.id, nickname: u.nickname || '未知', phone: u.phone || '' })));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!selectedPkg || !selectedUser) {
      message.warning('请选择套餐和开团人');
      return;
    }
    setCreateLoading(true);
    try {
      await groupBuyService.create({ packageId: selectedPkg, creatorUserId: selectedUser, minCount, maxCount });
      message.success('创建成功');
      setCreateOpen(false);
      setSelectedPkg(null);
      setSelectedUser(null);
      setMinCount(3);
      setMaxCount(undefined);
      fetchList();
    } catch {
      message.error('创建失败');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editRecord) return;
    try {
      await groupBuyService.update(editRecord.id, {
        minCount: editMinCount,
        maxCount: editMaxCount,
        expiredAt: editExpiredAt || undefined,
      });
      message.success('已更新');
      setEditOpen(false);
      fetchList();
    } catch {
      message.error('更新失败');
    }
  };

  const handleExport = () => {
    exportExcel({
      filename: `团购订单_${dayjs().format('YYYYMMDD_HHmmss')}`,
      sheetName: '团购订单',
      columns: [
        { header: '团购编号', key: 'id', width: 20 },
        { header: '套餐名称', key: 'packageName', width: 30 },
        { header: '原价', key: 'originalPrice', width: 12 },
        { header: '团购价', key: 'groupPrice', width: 12 },
        { header: '团长昵称', key: 'creatorNickname', width: 16 },
        { header: '团长手机', key: 'creatorPhone', width: 16 },
        { header: '入团人数', key: 'joinedCount', width: 12 },
        { header: '需成团人数', key: 'minCount', width: 12 },
        { header: '参团上限', key: 'maxCount', width: 12 },
        { header: '已付款', key: 'paidCount', width: 10 },
        { header: '未付款', key: 'unpaidCount', width: 10 },
        { header: '状态', key: 'status', width: 12, format: (v: string) => statusConfig[v]?.text || v },
        { header: '创建时间', key: 'createdAt', width: 20 },
        { header: '过期时间', key: 'expiredAt', width: 20 },
      ],
      data: list.map((item) => ({
        id: item.id,
        packageName: item.package?.name || item.product?.name || '-',
        originalPrice: Number(item.package?.price || item.product?.salePrice || 0).toFixed(2),
        groupPrice: Number(item.package?.groupPrice || item.package?.price || item.product?.salePrice || 0).toFixed(2),
        creatorNickname: item.creator?.nickname || '未知',
        creatorPhone: item.creator?.phone || '-',
        joinedCount: item._count?.participants || 0,
        minCount: item.minCount,
        maxCount: item.maxCount || '-',
        paidCount: item.paidCount || 0,
        unpaidCount: item.unpaidCount ?? (item._count?.participants || 0) - (item.paidCount || 0),
        status: item.status,
        createdAt: item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '-',
        expiredAt: item.expiredAt ? dayjs(item.expiredAt).format('YYYY-MM-DD HH:mm') : '-',
      })),
      autoFilter: true,
      freeze: { row: 1 },
    });
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
    ACTIVE: { color: 'processing', icon: <ClockCircleOutlined />, text: '进行中' },
    SUCCESS: { color: 'success', icon: <CheckCircleOutlined />, text: '已成团' },
    FAILED: { color: 'error', icon: <CloseCircleOutlined />, text: '已失败' },
  };

  const columns: ColumnsType<GroupBuyActivity> = [
    {
      title: '团购编号',
      key: 'id',
      width: 100,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {record.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      title: '商品信息',
      key: 'package',
      width: 220,
      render: (_, record) => {
        const isPackage = !!record.package;
        const item = isPackage ? record.package : record.product;
        const imageUrl = item?.images?.[0];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {imageUrl && (
              <Image
                src={formatImageUrl(typeof imageUrl === 'string' ? imageUrl : '')}
                width={48}
                height={48}
                style={{ borderRadius: 6, objectFit: 'cover' }}
                preview={false}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item?.name || '-'}</div>
              <Tag color={isPackage ? 'blue' : 'green'} style={{ fontSize: 11 }}>
                {isPackage ? '套餐' : '商品'}
              </Tag>
              {record.package?.groupPrice && (
                <div style={{ color: '#f50', fontSize: 13 }}>
                  团购价 ¥{Number(record.package.groupPrice).toFixed(2)}
                  <span style={{ color: '#999', textDecoration: 'line-through', marginLeft: 6, fontSize: 12 }}>
                    ¥{Number(record.package.price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: '团长',
      key: 'creator',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.creator?.nickname || '未知'}</div>
          {record.creator?.phone && (
            <div style={{ color: '#999', fontSize: 12 }}>{record.creator.phone}</div>
          )}
        </div>
      ),
    },
    {
      title: '团购价',
      key: 'groupPrice',
      width: 100,
      render: (_, record) => {
        const price = record.package?.groupPrice || record.package?.price || record.product?.salePrice || 0;
        return (
          <span style={{ color: '#f50', fontWeight: 600, fontSize: 14 }}>
            ¥{Number(price).toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '入团人数',
      key: 'joinedCount',
      width: 90,
      render: (_, record) => (
        <div>
          <TeamOutlined style={{ marginRight: 4 }} />
          <span style={{ fontWeight: 600 }}>{record._count?.participants || 0}</span>
          <span style={{ color: '#999' }}> / {record.minCount}</span>
          {record.maxCount && (
            <span style={{ color: '#999', fontSize: 12, marginLeft: 4 }}>(上限 {record.maxCount})</span>
          )}
        </div>
      ),
    },
    {
      title: '已付款',
      key: 'paidCount',
      width: 80,
      render: (_, record) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>{record.paidCount || 0}</span>
      ),
    },
    {
      title: '未付款',
      key: 'unpaidCount',
      width: 80,
      render: (_, record) => {
        const unpaid = record.unpaidCount != null ? record.unpaidCount : (record._count?.participants || 0);
        return (
          <span style={{ color: unpaid > 0 ? '#fa8c16' : '#999', fontWeight: unpaid > 0 ? 600 : 400 }}>
            {unpaid}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (status: string) => {
        const config = statusConfig[status];
        return config ? (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        ) : (
          <Tag>{status}</Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => (
        <span style={{ fontSize: 13 }}>{val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'}</span>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiredAt',
      width: 160,
      render: (val: string, record) => {
        const expired = dayjs(val);
        const isExpired = expired.isBefore(dayjs());
        return (
          <span style={{ fontSize: 13, color: isExpired && record.status === 'ACTIVE' ? '#f50' : '#999' }}>
            {val ? expired.format('YYYY-MM-DD HH:mm') : '-'}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => {
            setEditRecord(record);
            setEditMinCount(record.minCount);
            setEditMaxCount(record.maxCount);
            setEditGroupPrice(Number(record.package?.groupPrice ?? record.package?.price ?? record.product?.salePrice) || 0);
            setEditExpiredAt(record.expiredAt);
            setEditOpen(true);
          }}>
            编辑
          </Button>
          {record.status === 'ACTIVE' && (
            <Button type="link" danger icon={<MinusCircleOutlined />} onClick={() => handleCancel(record)}>
              撤团
            </Button>
          )}
          {record.status === 'FAILED' && (
            <Button type="link" icon={<UndoOutlined />} onClick={() => handleRestore(record)}>
              恢复
            </Button>
          )}
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            删团
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总团购数"
              value={total}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="进行中"
              value={list.filter((i) => i.status === 'ACTIVE').length}
              valueStyle={{ color: '#1677ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已成团（已付款）"
              value={list.filter((i) => i.status === 'SUCCESS').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已失败"
              value={list.filter((i) => i.status === 'FAILED').length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="团购订单"
        extra={
          <Space wrap>
            <Input
              placeholder="搜索套餐名称"
              allowClear
              style={{ width: 160 }}
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => { setPage(1); fetchList(); }}
            />
            <DatePicker.RangePicker
              value={dateRange as any}
              onChange={(dates) => setDateRange(dates || [null, null])}
              style={{ width: 220 }}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <Option value="ACTIVE">进行中</Option>
              <Option value="SUCCESS">已成团（已付款）</Option>
              <Option value="FAILED">已失败</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={() => { setPage(1); fetchList(); }}>刷新</Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleExport()}>
              导出
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setSelectedPkg(null);
              setSelectedUser(null);
              setMinCount(3);
              setMaxCount(undefined);
              setCreateOpen(true);
              searchPackages();
              searchUsers();
            }}>
              新建团购
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={list}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              if (ps) setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 团购详情弹窗 */}
      <Modal
        title="团购详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={640}
      >
        {selectedActivity && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="商品名称" span={2}>
              <Space>
                {(() => {
                  const img = selectedActivity.package?.images?.[0] || (typeof selectedActivity.product?.images === 'string' ? selectedActivity.product?.images : selectedActivity.product?.images?.[0]);
                  const name = selectedActivity.package?.name || selectedActivity.product?.name || '-';
                  return (
                    <>
                      {img && (
                        <Image
                          src={formatImageUrl(typeof img === 'string' ? img : '')}
                          width={40}
                          height={40}
                          style={{ borderRadius: 4, objectFit: 'cover' }}
                          preview={false}
                        />
                      )}
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <Tag color={selectedActivity.package ? 'blue' : 'green'}>
                        {selectedActivity.package ? '套餐' : '商品'}
                      </Tag>
                    </>
                  );
                })()}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="原价">
              ¥{Number(selectedActivity.package?.price || selectedActivity.product?.salePrice || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="团购价" span={1}>
              <span style={{ color: '#f50', fontWeight: 'bold' }}>
                ¥{Number(selectedActivity.package?.groupPrice || selectedActivity.package?.price || selectedActivity.product?.salePrice || 0).toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="团长">
              {selectedActivity.creator?.nickname || '未知'}
            </Descriptions.Item>
            <Descriptions.Item label="团长手机">
              {selectedActivity.creator?.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态" span={1}>
              <Tag color={statusConfig[selectedActivity.status]?.color}>
                {statusConfig[selectedActivity.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="入团人数">
              {selectedActivity._count?.participants || 0} / {selectedActivity.minCount} 人
              {selectedActivity.maxCount && <span style={{ color: '#999', marginLeft: 4 }}>（上限 {selectedActivity.maxCount} 人）</span>}
            </Descriptions.Item>
            <Descriptions.Item label="已付款人数">
              <span style={{ color: '#52c41a', fontWeight: 600 }}>{selectedActivity.paidCount || 0}</span>
            </Descriptions.Item>
            <Descriptions.Item label="未付款人数">
              <span style={{ color: selectedActivity.unpaidCount > 0 ? '#fa8c16' : '#999' }}>
                {selectedActivity.unpaidCount || 0}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedActivity.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="过期时间" span={1}>
              {dayjs(selectedActivity.expiredAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 新建团购弹窗 */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>新建团购</span>}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={createLoading}
        okText="创建"
        width={520}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>选择套餐</div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="搜索并选择套餐"
              filterOption={false}
              value={selectedPkg}
              onChange={(val) => setSelectedPkg(val)}
              onSearch={searchPackages}
              onFocus={() => searchPackages()}
              options={packages.map((p) => ({ value: p.id, label: `${p.name} ¥${p.price}` }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>开团人</div>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="搜索并选择用户"
              filterOption={false}
              value={selectedUser}
              onChange={(val) => setSelectedUser(val)}
              onSearch={searchUsers}
              onFocus={() => searchUsers()}
              options={users.map((u) => ({ value: u.id, label: `${u.nickname}${u.phone ? ` (${u.phone})` : ''}` }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>成团人数</div>
            <InputNumber min={2} max={100} value={minCount} onChange={(v) => setMinCount(v || 3)} style={{ width: '100%' }} addonAfter="人" />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: '#666', fontWeight: 500, fontSize: 13 }}>参团人数上限 <span style={{ color: '#999', fontWeight: 400 }}>（选填）</span></div>
            <InputNumber min={2} max={1000} value={maxCount} onChange={(v) => setMaxCount(v || undefined)} style={{ width: '100%' }} addonAfter="人" placeholder="不填则不限制" />
          </div>
        </Space>
      </Modal>

      {/* 编辑团购弹窗 */}
      <Modal
        title={<span style={{ fontSize: 18, fontWeight: 600 }}>编辑团购</span>}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
        okText="保存"
        width={640}
        destroyOnClose
      >
        {editRecord && (
          <>
            <Descriptions
              column={2}
              bordered
              size="small"
              style={{ marginBottom: 24 }}
              labelStyle={{ width: 100, fontWeight: 500, color: '#666' }}
            >
              <Descriptions.Item label="商品名称" span={2}>
                <span style={{ fontWeight: 600, color: '#333' }}>
                  {editRecord.package?.name || editRecord.product?.name || '-'}
                </span>
                <Tag color={editRecord.package ? 'blue' : 'green'} style={{ marginLeft: 8 }}>
                  {editRecord.package ? '套餐' : '商品'}
                </Tag>
                <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                  ¥{editRecord.package?.price || editRecord.product?.salePrice || 0}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="开团人">
                {editRecord.creator?.nickname || '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="当前进度">
                <Tag color="blue">
                  {editRecord._count?.participants || 0} / {editMinCount || editRecord.minCount}
                </Tag>
                <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>人</span>
              </Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>
                <Tag color={statusConfig[editRecord.status]?.color}>
                  {statusConfig[editRecord.status]?.text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain style={{ fontSize: 13, color: '#999', margin: '16px 0' }}>
              编辑设置
            </Divider>

            <Row gutter={24}>
              <Col span={6}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>成团人数</div>
                <InputNumber
                  min={2}
                  max={100}
                  value={editMinCount}
                  onChange={(v) => setEditMinCount(v || 3)}
                  style={{ width: '100%' }}
                  addonAfter="人"
                />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>参团上限 <span style={{ color: '#999', fontWeight: 400 }}>（选填）</span></div>
                <InputNumber
                  min={2}
                  max={1000}
                  value={editMaxCount}
                  onChange={(v) => setEditMaxCount(v || undefined)}
                  style={{ width: '100%' }}
                  addonAfter="人"
                  placeholder="不填不限制"
                />
              </Col>
              <Col span={6}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>团购价</div>
                <div style={{
                  padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6,
                  background: '#f5f5f5', color: '#ee0a24', fontWeight: 700, fontSize: 18, lineHeight: '30px',
                }}>
                  ¥{editGroupPrice}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                  {editRecord?.package ? '在套餐编辑中修改团购价' : '商品原价即为团购价'}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ marginBottom: 6, color: '#666', fontSize: 13 }}>过期时间</div>
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  value={editExpiredAt ? dayjs(editExpiredAt) : null}
                  onChange={(d) => setEditExpiredAt(d?.toISOString() || '')}
                />
              </Col>
            </Row>
          </>
        )}
      </Modal>
    </PageContainer>
  );
};

export default OrderGroupBuyList;
