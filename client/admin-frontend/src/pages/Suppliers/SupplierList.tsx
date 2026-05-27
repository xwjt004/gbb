import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Form, Input, Select, Button, Space, Table, Tag, Popconfirm, Drawer, Descriptions, Statistic, Row, Col, Rate, Timeline, Divider, DatePicker, App } from 'antd';
import dayjs from 'dayjs';
import { supplierService, Supplier, SupplierStatus, SupplierType, QuerySupplierParams } from '@/services/supplierService';
import SupplierFormModal from '@/components/SupplierFormModal';

const { Option } = Select;

const SupplierList: React.FC = () => {
  const { message } = App.useApp();
  const [queryForm] = Form.useForm<QuerySupplierParams>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [detail, setDetail] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [ratingHistory, setRatingHistory] = useState<any[]>([]);
  const [ratingPagination, setRatingPagination] = useState<{ page: number; pageSize: number; total: number; totalPages: number }>({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [blacklistMode, setBlacklistMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [ratingDateRange, setRatingDateRange] = useState<[string, string] | null>(null); // 日期范围 (YYYY-MM-DD)
  const [ratingInfiniteLoading, setRatingInfiniteLoading] = useState(false);
  const [ratingHasMore, setRatingHasMore] = useState(true);
  const ratingScrollRef = React.useRef<HTMLDivElement | null>(null);
  const ratingSentinelRef = React.useRef<HTMLDivElement | null>(null);
  // 简易防抖
  const debounceRef = React.useRef<number | undefined>();

  const loadData = async (page?: number, pageSize?: number, overrideBlacklistMode?: boolean) => {
    try {
      setLoading(true);
      const rawValues: any = queryForm.getFieldsValue();
      const values: any = { ...rawValues };
      // 日期范围转换（不修改类型定义，运行时拼接）
      const dateRange: any = rawValues.dateRange;
      if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
        values.startDate = dateRange[0]?.startOf('day').format('YYYY-MM-DD');
        values.endDate = dateRange[1]?.startOf('day').format('YYYY-MM-DD');
      }
      delete values.dateRange;
      const effectiveBlacklist = overrideBlacklistMode !== undefined ? overrideBlacklistMode : blacklistMode;
      const params: QuerySupplierParams = {
        ...values,
        page: page || pagination.page,
        pageSize: pageSize || pagination.pageSize,
        status: effectiveBlacklist ? 'BLACKLIST' : values.status,
        sortBy: values.sortBy || 'createdAt',
        sortOrder: values.sortOrder || 'desc',
      };
      const res = await supplierService.getList(params);
      // 普通模式且未明确筛选 BLACKLIST 时前端隐藏黑名单
      const filtered = (!effectiveBlacklist && !values.status)
        ? res.list.filter(item => item.status !== 'BLACKLIST')
        : res.list;
      setData(filtered);
      setPagination(res.pagination);
    } catch (e: any) {
      message.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await supplierService.getStatistics();
      setStats(s);
    } catch {}
  };

  const location = useLocation();
  useEffect(() => {
    const isBL = location.pathname.includes('/suppliers/blacklist');
    setBlacklistMode(isBL);
    // 路由切换重置查询条件并加载对应列表
    queryForm.resetFields();
    loadData(1, pagination.pageSize, isBL);
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleSearch = () => {
    loadData(1, pagination.pageSize);
  };

  const handleReset = () => {
    queryForm.resetFields();
    loadData(1, pagination.pageSize);
  };

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (record: Supplier) => {
    setEditing(record);
    setShowForm(true);
  };

  const handleRemove = async (record: Supplier) => {
    try {
      await supplierService.remove(record.id);
      message.success('删除成功');
      loadData();
      loadStats();
    } catch (e: any) {
      message.error(e?.message || '删除失败');
    }
  };

  const handleToggleStatus = async (record: Supplier) => {
    try {
      const updated = await supplierService.toggleStatus(record.id);
      message.success('状态已切换');
      setData(prev => prev.map(item => item.id === updated.id ? updated : item));
      loadStats();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    }
  };

  const handleRate = async (record: Supplier, value: number) => {
    try {
      setRateLoading(true);
      const updated = await supplierService.rateSupplier({ supplierId: record.id, rating: value, remark: record.remark });
      message.success('评分成功');
      setData(prev => prev.map(item => item.id === updated.id ? updated : item));
      if (detail && detail.id === record.id) {
        setDetail(updated);
        // 重新加载历史
        loadRatingHistory(record.id);
      }
    } catch (e: any) {
      message.error(e?.message || '评分失败');
    } finally {
      setRateLoading(false);
    }
  };

  const loadRatingHistory = async (supplierId: string, page?: number, pageSize?: number, append?: boolean) => {
    try {
      const targetPage = page || ratingPagination.page;
      const params: any = { page: targetPage, pageSize: pageSize || ratingPagination.pageSize };
      if (ratingDateRange) {
        params.startDate = ratingDateRange[0];
        params.endDate = ratingDateRange[1];
      }
      if (append) setRatingInfiniteLoading(true);
      const res = await supplierService.getRatingHistory(supplierId, params);
      setRatingPagination(res.pagination);
      setRatingHasMore(res.pagination.page < res.pagination.totalPages);
      if (append) {
        setRatingHistory(prev => [...prev, ...res.list]);
      } else {
        setRatingHistory(res.list);
      }
    } catch {
      if (!append) setRatingHistory([]);
      setRatingHasMore(false);
    } finally {
      if (append) setRatingInfiniteLoading(false);
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'supplierNo', width: 150 },
    { title: '名称', dataIndex: 'name', width: 180, render: (_: any, r: Supplier) => <a onClick={() => setDetail(r)}>{r.name}</a> },
    { title: '联系人', dataIndex: 'contactPerson', width: 120 },
    { title: '电话', dataIndex: 'contactPhone', width: 120 },
    { title: '类型', dataIndex: 'supplierType', width: 90, render: (t: SupplierType) => supplierService.getTypeText(t) },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: SupplierStatus) => <Tag color={supplierService.getStatusColor(s)}>{supplierService.getStatusText(s)}</Tag> },
    { title: '信用', dataIndex: 'creditLevel', width: 80 },
    { title: '评分', dataIndex: 'rating', width: 120, render: (_: any, r: Supplier) => <Rate allowHalf value={r.rating || 5} onChange={(v) => handleRate(r, v)} disabled={rateLoading} /> },
    { title: '采购订单数', dataIndex: 'totalOrders', width: 110 },
    { title: '总采购金额', dataIndex: 'totalAmount', width: 120 },
  { title: '操作', fixed: 'right', width: 220, render: (_: any, r: Supplier) => (
      <Space size="small">
        <Button size="small" type="link" onClick={() => handleEdit(r)}>编辑</Button>
        <Button size="small" type="link" onClick={() => handleToggleStatus(r)}>{r.status === 'ACTIVE' ? '停用' : '启用'}</Button>
        <Popconfirm title="确认删除?" onConfirm={() => handleRemove(r)} disabled={r._count?.purchaseOrders! > 0}>
          <Button size="small" type="link" danger disabled={r._count?.purchaseOrders! > 0}>删除</Button>
        </Popconfirm>
    {r.status !== 'BLACKLIST' && <Button size="small" type="link" onClick={async () => { await supplierService.updateStatus(r.id, 'BLACKLIST'); message.success('已加入黑名单'); loadData(); loadStats(); }}>黑名单</Button>}
    {r.status === 'BLACKLIST' && <Button size="small" type="link" onClick={async () => { await supplierService.updateStatus(r.id, 'INACTIVE'); message.success('移出黑名单'); loadData(); loadStats(); }}>移出</Button>}
      </Space>
    ) },
  ];

  return (
    <div>
  <Card title="供应商查询" size="small" style={{ marginBottom: 16 }} extra={<Space><Button type="primary" onClick={handleCreate}>新增供应商</Button><Button onClick={handleSearch}>查询</Button><Button onClick={handleReset}>重置</Button><Button type={blacklistMode ? 'primary' : 'default'} onClick={() => { const next = !blacklistMode; setBlacklistMode(next); loadData(1, pagination.pageSize, next); }}>{blacklistMode ? '查看全部' : '仅黑名单'}</Button></Space>}>
        <Form form={queryForm} layout="inline" onValuesChange={() => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            loadData(1, pagination.pageSize);
          }, 300);
        }}>
          <Form.Item name="supplierNo" label="编号">
            <Input allowClear style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="name" label="名称">
            <Input allowClear placeholder="模糊" />
          </Form.Item>
          <Form.Item name="contactPerson" label="联系人">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="contactPhone" label="电话">
            <Input allowClear />
          </Form.Item>
          <Form.Item name="supplierType" label="类型">
            <Select allowClear style={{ width: 110 }}>
              <Option value="PRODUCT">商品</Option>
              <Option value="SERVICE">服务</Option>
              <Option value="BOTH">综合</Option>
            </Select>
          </Form.Item>
          <Form.Item name="category" label="类别">
            <Input allowClear style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select allowClear style={{ width: 110 }}>
              <Option value="ACTIVE">启用</Option>
              <Option value="INACTIVE">停用</Option>
              <Option value="BLACKLIST">黑名单</Option>
            </Select>
          </Form.Item>
          <Form.Item name="creditLevel" label="信用">
            <Select allowClear style={{ width: 100 }}>
              <Option value="A+">A+</Option>
              <Option value="A">A</Option>
              <Option value="B">B</Option>
              <Option value="C">C</Option>
              <Option value="D">D</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="创建日期">
            <DatePicker.RangePicker allowEmpty={[true,true]} />
          </Form.Item>
          <Form.Item name="sortBy" label="排序字段">
            <Select allowClear style={{ width: 130 }} placeholder="默认创建时间">
              <Option value="createdAt">创建时间</Option>
              <Option value="name">名称</Option>
              <Option value="rating">评分</Option>
              <Option value="totalAmount">采购金额</Option>
              <Option value="totalOrders">订单数</Option>
            </Select>
          </Form.Item>
          <Form.Item name="sortOrder" label="方向">
            <Select allowClear style={{ width: 90 }} placeholder="desc">
              <Option value="asc">升序</Option>
              <Option value="desc">降序</Option>
            </Select>
          </Form.Item>
        </Form>
      </Card>

      {stats && (
        <Card title="统计" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}><Statistic title="供应商总数" value={stats.total} /></Col>
            <Col span={6}><Statistic title="启用" value={stats.byStatus?.active} /></Col>
            <Col span={6}><Statistic title="停用" value={stats.byStatus?.inactive} /></Col>
            <Col span={6}><Statistic title="黑名单" value={stats.byStatus?.blacklist} /></Col>
          </Row>
        </Card>
      )}

      <Card size="small" title="供应商列表" extra={blacklistMode ? <Button onClick={() => {
        // 简易 CSV 导出
        const headers = ['编号','名称','联系人','电话','类型','信用','状态'];
        const rows = data.map(d => [d.supplierNo, d.name, d.contactPerson, d.contactPhone, supplierService.getTypeText(d.supplierType), d.creditLevel || '', supplierService.getStatusText(d.status)]);
        const csv = [headers.join(','), ...rows.map(r => r.map(v => String(v).replace(/,/g,' ')).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'blacklist-suppliers.csv'; a.click();
        URL.revokeObjectURL(url);
      }}>导出CSV</Button> : undefined}>
        {selectedRowKeys.length > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
            <Space>
              <span style={{ color: '#666' }}>已选 {selectedRowKeys.length} 项</span>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>取消</Button>
              <Popconfirm
                title={`确定删除选中的 ${selectedRowKeys.length} 个供应商？`}
                onConfirm={async () => {
                  try {
                    for (const id of selectedRowKeys) {
                      await supplierService.remove(String(id));
                    }
                    message.success('批量删除成功');
                    setSelectedRowKeys([]);
                    loadData();
                    loadStats();
                  } catch { message.error('批量删除失败'); }
                }}
              >
                <Button size="small" danger>批量删除</Button>
              </Popconfirm>
            </Space>
          </div>
        )}
        <Table
          rowKey="id"
          loading={loading}
          size="small"
          columns={columns as any}
          dataSource={data}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ x: 1300, y: 'calc(100vh - 420px)' }}
          sticky={{ offsetHeader: 0 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, ps) => loadData(p, ps),
          }}
        />
      </Card>

      <SupplierFormModal
        open={showForm}
        editingSupplier={editing}
        onClose={() => setShowForm(false)}
  onSuccess={() => {
          setShowForm(false);
          message.success(editing ? '保存成功' : '创建成功');
          loadData();
          loadStats();
        }}
      />

      <Drawer
        open={!!detail}
        width={600}
  title={detail ? `供应商详情 - ${detail.name}` : ''}
        onClose={() => setDetail(null)}
      >
  {detail && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="编号">{detail.supplierNo}</Descriptions.Item>
            <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="联系人">{detail.contactPerson}</Descriptions.Item>
            <Descriptions.Item label="电话">{detail.contactPhone}</Descriptions.Item>
            <Descriptions.Item label="类型">{supplierService.getTypeText(detail.supplierType)}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={supplierService.getStatusColor(detail.status)}>{supplierService.getStatusText(detail.status)}</Tag></Descriptions.Item>
            <Descriptions.Item label="信用">{detail.creditLevel}</Descriptions.Item>
            <Descriptions.Item label="评分"><Rate allowHalf value={detail.rating || 5} onChange={(v) => handleRate(detail, v)} disabled={rateLoading} /></Descriptions.Item>
            {detail.category && <Descriptions.Item label="类别">{detail.category}</Descriptions.Item>}
            {detail.businessScope && <Descriptions.Item label="经营项目" span={2}>{detail.businessScope}</Descriptions.Item>}
            {detail.address && <Descriptions.Item label="地址" span={2}>{detail.address}</Descriptions.Item>}
            {detail.contactEmail && <Descriptions.Item label="邮箱" span={2}>{detail.contactEmail}</Descriptions.Item>}
            {detail.wechatId && <Descriptions.Item label="微信号">{detail.wechatId}</Descriptions.Item>}
            {detail.douyinId && <Descriptions.Item label="抖音号">{detail.douyinId}</Descriptions.Item>}
            {detail.kuaishouId && <Descriptions.Item label="快手号">{detail.kuaishouId}</Descriptions.Item>}
            {detail.xiaohongshuId && <Descriptions.Item label="小红书号">{detail.xiaohongshuId}</Descriptions.Item>}
            {detail.businessLicense && <Descriptions.Item label="营业执照">{detail.businessLicense}</Descriptions.Item>}
            {detail.taxId && <Descriptions.Item label="税号">{detail.taxId}</Descriptions.Item>}
            {detail.bankAccount && <Descriptions.Item label="银行账号">{detail.bankAccount}</Descriptions.Item>}
            {detail.bankName && <Descriptions.Item label="开户银行">{detail.bankName}</Descriptions.Item>}
            {detail.paymentTerms && <Descriptions.Item label="付款条件" span={2}>{detail.paymentTerms}</Descriptions.Item>}
            {detail.deliveryDays !== undefined && <Descriptions.Item label="交货天数">{detail.deliveryDays}</Descriptions.Item>}
            {detail.minOrderAmount !== undefined && <Descriptions.Item label="最小订货金额">{detail.minOrderAmount}</Descriptions.Item>}
            {detail.remark && <Descriptions.Item label="备注" span={2}>{detail.remark}</Descriptions.Item>}
          </Descriptions>
        )}
    {detail && (
          <>
            <Divider orientation="left">评分历史</Divider>
            <Space style={{ marginBottom: 8 }}>
              <DatePicker.RangePicker
                value={ratingDateRange ? [dayjs(ratingDateRange[0]), dayjs(ratingDateRange[1])] : undefined}
                onChange={(vals) => {
                  if (!vals || vals.length < 2) {
                    setRatingDateRange(null);
                  } else {
                    setRatingDateRange([vals[0]!.format('YYYY-MM-DD'), vals[1]!.format('YYYY-MM-DD')]);
                  }
                  if (detail) {
                    setRatingPagination(p => ({ ...p, page: 1 }));
                    loadRatingHistory(detail.id, 1, ratingPagination.pageSize);
                  }
                }}
                allowEmpty={[true, true]}
              />
              {ratingDateRange && (
                <Button size="small" onClick={() => {
                  setRatingDateRange(null);
                  if (detail) {
                    setRatingPagination(p => ({ ...p, page: 1 }));
                    loadRatingHistory(detail.id, 1, ratingPagination.pageSize);
                  }
                }}>清除</Button>
              )}
            </Space>
          <div style={{ maxHeight: 300, overflowY: 'auto' }} ref={ratingScrollRef}>
            <Timeline items={ratingHistory.map(h => ({
              color: 'blue',
              children: (
                <div>
                  <strong>{h.rating}★</strong> <span style={{ color: '#999' }}>{new Date(h.createdAt).toLocaleString()}</span>
                  {h.remark && <div style={{ fontSize: 12 }}>{h.remark}</div>}
                </div>
              )
          }))} />
          </div>
          <div ref={ratingSentinelRef} style={{ textAlign: 'center', padding: 8 }}>
            {ratingInfiniteLoading && <span style={{ fontSize: 12, color: '#999' }}>加载中...</span>}
            {!ratingHasMore && <span style={{ fontSize: 12, color: '#999' }}>已到底部</span>}
          </div>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default SupplierList;
