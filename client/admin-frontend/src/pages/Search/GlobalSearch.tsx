import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Input,
  Card,
  Row,
  Col,
  Tabs,
  List,
  Avatar,
  Tag,
  Button,
  Space,
  Empty,
  Spin,
  Typography,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  GiftOutlined,
  DollarOutlined,
  HistoryOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/user';
import { Order } from '@/types/order';
import { Package } from '@/types/package';
import { Payment } from '@/types/payment';
import { request } from '@/services/api';
import { SEARCH_PAGE_SIZE, SEARCH_CACHE_TTL, SEARCH_CACHE_MAX_ENTRIES, SEARCH_DEFAULT_LIMIT } from '@/config/search';

const { Search } = Input;
const { Text, Title } = Typography;

interface BackendMetaItem { total: number; page: number; limit: number; totalPages: number; }
interface BackendGlobalResult {
  code: number;
  message: string;
  data: {
    users: any[];
    orders: any[];
    packages: any[];
    payments?: any[];
    meta?: {
      users?: BackendMetaItem;
      orders?: BackendMetaItem;
      packages?: BackendMetaItem;
      payments?: BackendMetaItem;
    }
  };
}

interface SearchResults {
  users: User[];
  orders: Order[];
  packages: Package[];
  payments: Payment[]; // 预留
}

interface SearchHistory {
  keyword: string;
  count: number;
  timestamp: string;
}

const PAGE_SIZE = SEARCH_PAGE_SIZE;
// 缓存配置：由全局 config / env 控制
const CACHE_CONFIG = {
  TTL: SEARCH_CACHE_TTL,
  MAX_ENTRIES: SEARCH_CACHE_MAX_ENTRIES,
};
const PERSIST_CACHE_KEY = 'globalSearchCacheV1';

const GlobalSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState<SearchResults>({ users: [], orders: [], packages: [], payments: [] });
  const [meta, setMeta] = useState<{ users?: BackendMetaItem; orders?: BackendMetaItem; packages?: BackendMetaItem; payments?: BackendMetaItem }>({});
  const [userPage, setUserPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [packagePage, setPackagePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  // 内存缓存(key -> { time, data, meta })
  const cacheRef = useRef<Map<string, { time: number; data: SearchResults; meta?: any }>>(new Map());
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [hotKeywords] = useState<string[]>([
    '套餐', '员工', '订单', '支付', '退款', 'VIP'
  ]);

  const navigate = useNavigate();

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history);
  };

  const saveSearchHistory = (keyword: string) => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const existingIndex = history.findIndex((item: SearchHistory) => item.keyword === keyword);
    
    if (existingIndex >= 0) {
      history[existingIndex].count += 1;
      history[existingIndex].timestamp = new Date().toISOString();
    } else {
      history.unshift({
        keyword,
        count: 1,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 只保留最近20条记录
    const limitedHistory = history.slice(0, 20);
    localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
    setSearchHistory(limitedHistory);
  };

  // 并发取消：按 (type||'all') 维度维护 AbortController，新的同类型请求会取消旧的
  const abortControllersRef = useRef<Record<string, AbortController>>({});
  
  // 加载持久化缓存
  const loadPersistCache = (): Record<string, { time: number; data: SearchResults; meta?: any }> => {
    try {
      const raw = localStorage.getItem(PERSIST_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || !parsed) return {};
      // 清理过期
      const now = Date.now();
      let changed = false;
      Object.keys(parsed).forEach(k => {
  if (!parsed[k]?.time || now - parsed[k].time > CACHE_CONFIG.TTL) { delete parsed[k]; changed = true; }
      });
      if (changed) localStorage.setItem(PERSIST_CACHE_KEY, JSON.stringify(parsed));
      return parsed;
    } catch { return {}; }
  };
  const savePersistEntry = (key: string, value: { time: number; data: SearchResults; meta?: any }) => {
    try {
      const store = loadPersistCache();
      store[key] = value;
      // 裁剪：按时间排序保留最新 MAX_ENTRIES
      const keys = Object.keys(store);
      if (keys.length > CACHE_CONFIG.MAX_ENTRIES) {
        keys
          .map(k => ({ key: k, t: store[k].time }))
          .sort((a,b)=> b.t - a.t)
          .slice(CACHE_CONFIG.MAX_ENTRIES)
          .forEach(item => delete store[item.key]);
      }
      localStorage.setItem(PERSIST_CACHE_KEY, JSON.stringify(store));
    } catch {}
  };
  const clearPersistCache = () => { localStorage.removeItem(PERSIST_CACHE_KEY); };

  const buildCacheKey = (kw: string, type: string | undefined, page: number, limit: number) => `kw=${kw.toLowerCase()}|type=${type||'all'}|page=${page}|limit=${limit}`;

  const highlight = (text?: string) => {
    if (!text) return text;
    if (!keyword.trim()) return text;
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const reg = new RegExp(esc, 'gi');
      const parts = text.split(reg);
      const matches = text.match(reg);
      if (!matches) return text;
      const nodes: any[] = [];
      parts.forEach((p, i) => {
        nodes.push(p);
        if (i < parts.length - 1) nodes.push(<mark key={i} style={{ padding: 0 }}>{matches[i]}</mark>);
      });
      return <>{nodes}</>;
    } catch { return text; }
  };

  // 统一转换后端数据
  const transform = (backend: { users: any[]; orders: any[]; packages: any[]; payments?: any[]; meta?: any }): { data: SearchResults; meta?: BackendGlobalResult['data']['meta'] } => {
    const users: User[] = (backend.users || []).map(u => {
      const orderCount = u._count?.orders || 0;
      const isVip = typeof u.isVip === 'boolean' ? u.isVip : orderCount >= 10; // 优先后端字段
      const vipLevel = u.vipLevel ?? (orderCount >= 30 ? 3 : orderCount >= 20 ? 2 : orderCount >= 10 ? 1 : undefined);
      return {
        id: u.openid,
        phone: u.phone || '',
        nickname: u.nickname || '',
        avatar: u.avatar || undefined,
        status: (u.status || 'active').toLowerCase(),
        isVip,
        vipLevel,
        orderCount,
        totalAmount: 0,
        createdAt: u.createdAt,
        updatedAt: u.createdAt,
      } as User;
    });
    const orders: Order[] = (backend.orders || []).map(o => ({
      id: o.id?.toString() ?? '',
      orderNo: o.orderNo ?? '',
      userId: o.userId ?? o.user?.id ?? 0,
      packageId: o.packageId ?? o.package?.id ?? 0,
      timeSlotId: o.timeSlotId ?? o.timeSlot?.id ?? 0,
      appointmentDate: o.appointmentDate ?? o.timeSlot?.date ?? '',
      totalAmount: o.totalAmount ?? 0,
      depositAmount: o.depositAmount ?? 0,
      paidAmount: o.paidAmount ?? 0,
      paymentStatus: o.paymentStatus ?? '',
      orderStatus: o.orderStatus ?? '',
      notes: o.notes ?? '',
      childrenCount: o.childrenCount ?? 0,
      user: {
        id: o.user?.id ?? 0,
        openid: o.user?.openid ?? '',
        nickname: o.user?.nickname ?? '',
        phone: o.user?.phone ?? '',
        avatar: o.user?.avatar ?? '',
        status: o.user?.status ?? '',
      },
      package: {
        id: o.package?.id ?? 0,
        name: o.package?.name ?? '',
        description: o.package?.description ?? '',
        price: o.package?.price ?? 0,
        deposit: o.package?.deposit ?? 0,
        durationMinutes: o.package?.durationMinutes ?? 0,
        includes: o.package?.includes ?? [],
        images: o.package?.images ?? [],
        category: o.package?.category ?? '',
        tags: o.package?.tags ?? [],
        status: o.package?.status ?? '',
        isPopular: o.package?.isPopular ?? false,
      },
      timeSlot: o.timeSlot ?? {
        id: 0,
        date: '',
        startTime: '',
        endTime: '',
        capacity: 0,
        bookedCount: 0,
        availableCount: 0,
        status: '',
        isHoliday: false,
        priceMultiplier: 1,
        notes: '',
        isBooked: false,
      },
      payments: o.payments ?? [],
      createdAt: o.createdAt ?? '',
      updatedAt: o.updatedAt ?? '',
    }));
    const packages: Package[] = (backend.packages || []).map(p => ({
      id: p.id?.toString() ?? '',
      name: p.name ?? '',
      description: p.description ?? '',
      price: Number(p.price ?? 0),
      deposit: Number(p.deposit ?? 0),
      originalPrice: Number(p.originalPrice ?? 0),
      duration: Number(p.durationMinutes ?? 0),
      services: p.includes ?? [],
      images: p.images ?? [],
      status: p.status ?? 'active',
      isPopular: p.isPopular ?? false,
      orderCount: p.orderCount ?? 0,
      rating: p.rating ?? 0,
      tags: p.tags ?? [],
      category: p.category ?? '',
      maxBookings: p.maxBookings ?? 0,
      createdAt: p.createdAt ?? '',
      updatedAt: p.updatedAt ?? '',
    }));
    const payments: Payment[] = (backend.payments || []).map(p => ({
      id: p.id,
      paymentNo: p.id,
      orderId: p.orderId || p.order_id || p.order?.id,
      userId: p.order?.user?.openid,
      amount: Number(p.amount),
      actualAmount: Number(p.amount),
      method: (p.paymentType || p.payment_type || 'wechat').toLowerCase(),
      status: (p.status || 'created').toLowerCase(),
      refundAmount: 0,
      platformFee: 0,
      netAmount: Number(p.amount),
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    }) as Payment);
    return { data: { users, orders, packages, payments }, meta: backend.meta };
  };

  const fetchSearch = async (kw: string, type?: 'user'|'order'|'package'|'payment', page = 1, force = false) => {
    const limit = SEARCH_DEFAULT_LIMIT || PAGE_SIZE;
    const cacheKey = buildCacheKey(kw, type, page, limit);
    if (!force) {
      const mem = cacheRef.current.get(cacheKey);
  if (mem && Date.now() - mem.time < CACHE_CONFIG.TTL) {
        setResults(r => ({ ...r, ...mem.data }));
        if (mem.meta) setMeta(m => ({ ...m, ...mem.meta }));
        return mem;
      }
      const store = loadPersistCache();
      const persist = store[cacheKey];
  if (persist && Date.now() - persist.time < CACHE_CONFIG.TTL) {
        cacheRef.current.set(cacheKey, persist); // promote
        setResults(r => ({ ...r, ...persist.data }));
        if (persist.meta) setMeta(m => ({ ...m, ...persist.meta }));
        return persist;
      }
    }
    const key = type || 'all';
    // 取消同类型上一次请求
    if (abortControllersRef.current[key]) {
      abortControllersRef.current[key].abort();
    }
    const controller = new AbortController();
    abortControllersRef.current[key] = controller;
    try {
      setLoading(true);
  // debug: log outgoing search request
  // eslint-disable-next-line no-console
  console.debug('[GlobalSearch] fetchSearch start', { kw, type, page, cacheKey });
  const resp = await request.get<any>(`/api/v1/search/global`, {
        params: { keyword: kw, limit, page, type },
        signal: controller.signal as any,
      });
      // 后端当前返回结构: { code, message, data: { users, orders, packages, meta }} 或者拦截器包装 { success, data }
      const body = resp.data as any;
      const backend = (body?.data?.users || body?.data?.orders || body?.data?.packages)
        ? body.data
        : body; // 容忍不同包装
      const normalized = {
        users: backend.users || [],
        orders: backend.orders || [],
  packages: backend.packages || [],
  payments: backend.payments || [],
        meta: backend.meta,
      };
      const { data, meta } = transform(normalized);
      // 内存缓存裁剪（简单 LRU by time）
      if (cacheRef.current.size >= CACHE_CONFIG.MAX_ENTRIES) {
        let oldestKey: string | null = null; let oldestTime = Infinity;
        cacheRef.current.forEach((v,k)=>{ if (v.time < oldestTime) { oldestTime = v.time; oldestKey = k; } });
        if (oldestKey) cacheRef.current.delete(oldestKey);
      }
      cacheRef.current.set(cacheKey, { time: Date.now(), data, meta });
      savePersistEntry(cacheKey, { time: Date.now(), data, meta });
      // 合并数据: 仅覆盖相应类型
      setResults(prev => ({
        users: type && type !== 'user' ? prev.users : data.users,
        orders: type && type !== 'order' ? prev.orders : data.orders,
        packages: type && type !== 'package' ? prev.packages : data.packages,
        payments: type && type !== 'payment' ? prev.payments : data.payments,
      }));
      if (meta) setMeta(old => ({ ...old, ...meta }));
      return { data, meta };
    } catch (e: any) {
  if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      console.error('搜索失败', e);
      (await import('antd')).message.error('搜索失败，请稍后重试');
    } finally {
  // 请求结束后移除本次的控制器条目，避免一直保留导致 loading 无法关闭
  try { delete abortControllersRef.current[key]; } catch (err) { /* ignore */ }
  // 仅当没有仍在进行的请求时才关闭 loading
  const stillRunning = Object.values(abortControllersRef.current).some(c => c && !c.signal.aborted);
  if (!stillRunning) setLoading(false);
    }
  };

  const handleSearch = async (searchKeyword: string, force = false) => {
    if (!searchKeyword.trim()) return;
  // debug: indicate search triggered
  // eslint-disable-next-line no-console
  console.debug('[GlobalSearch] handleSearch', searchKeyword, { force });
  setKeyword(searchKeyword);
  setUserPage(1); setOrderPage(1); setPackagePage(1); setPaymentPage(1); setActiveTab('all');
    await fetchSearch(searchKeyword.trim(), undefined, 1, force);
    saveSearchHistory(searchKeyword);
  };

  // 防抖
  const debounceRef = useRef<number | null>(null);
  const onChangeDebounced = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults({ users: [], orders: [], packages: [], payments: [] });
      setUserPage(1); setOrderPage(1); setPackagePage(1);
      return;
    }
  debounceRef.current = window.setTimeout(() => { handleSearch(value.trim()); }, 400);
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const getTotalCount = () => {
    if (meta.users || meta.orders || meta.packages) {
  return (meta.users?.total || 0) + (meta.orders?.total || 0) + (meta.packages?.total || 0) + (meta.payments?.total || results.payments.length);
    }
    return results.users.length + results.orders.length + results.packages.length + results.payments.length;
  };

  const renderUserItem = (user: User) => (
    <List.Item
      actions={[
        <Button type="link" onClick={() => navigate(`/users/${user.id}`)}>
          查看详情
        </Button>
      ]}
    >
      <List.Item.Meta
        avatar={<Avatar src={user.avatar} icon={<UserOutlined />} />}
        title={
          <Space>
            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
              <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', backgroundColor: user.status==='active'? '#52c41a':'#ff4d4f' }} />
              {highlight(user.nickname || '未设置')}
            </span>
            {user.isVip && <Tag color="gold">VIP{user.vipLevel}</Tag>}
          </Space>
        }
        description={
          <div>
            <Text type="secondary">{highlight(user.phone)}</Text>
            {user.wechatId && <Text type="secondary"> | {user.wechatId}</Text>}
            <br />
            <Text type="secondary">
              订单: {user.orderCount}次 | 消费: ¥{user.totalAmount}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  const renderOrderItem = (order: Order) => (
    <List.Item
      actions={[
        <Button type="link" onClick={() => navigate(`/orders/${order.id}`)}>
          查看详情
        </Button>
      ]}
    >
      <List.Item.Meta
        avatar={<Avatar icon={<ShoppingCartOutlined />} />}
        title={
          <Space>
            {highlight(order.orderNo)}
            <Tag color="blue">订单</Tag>
          </Space>
        }
        description={
          <div>
            <Text type="secondary">金额: ¥{order.totalAmount}</Text>
            <br />
            <Text type="secondary">
              {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  const renderPackageItem = (pkg: Package) => (
    <List.Item
      actions={[
        <Button type="link" onClick={() => navigate(`/packages/${pkg.id}`)}>
          查看详情
        </Button>
      ]}
    >
      <List.Item.Meta
        avatar={<Avatar icon={<GiftOutlined />} />}
        title={
          <Space>
            {highlight(pkg.name)}
            {pkg.isPopular && <Tag color="red" icon={<StarOutlined />}>热门</Tag>}
          </Space>
        }
        description={
          <div>
            <Text type="secondary">¥{pkg.price} | {pkg.duration}分钟</Text>
            <br />
            <Text type="secondary">预订: {pkg.orderCount}次</Text>
          </div>
        }
      />
    </List.Item>
  );

  const renderAllResults = () => (
    <div>
      {results.users.length > 0 && (
        <>
          <Title level={4}>用户 ({results.users.length})</Title>
          <List
            dataSource={results.users.slice(0, 3)}
            renderItem={renderUserItem}
            size="small"
          />
          {results.users.length > 3 && (
            <Button type="link" onClick={() => setActiveTab('users')}>
              查看全部用户结果
            </Button>
          )}
          <Divider />
        </>
      )}

      {results.orders.length > 0 && (
        <>
          <Title level={4}>订单 ({results.orders.length})</Title>
          <List
            dataSource={results.orders.slice(0, 3)}
            renderItem={renderOrderItem}
            size="small"
          />
          {results.orders.length > 3 && (
            <Button type="link" onClick={() => setActiveTab('orders')}>
              查看全部订单结果
            </Button>
          )}
          <Divider />
        </>
      )}

      {results.packages.length > 0 && (
        <>
          <Title level={4}>套餐 ({results.packages.length})</Title>
          <List
            dataSource={results.packages.slice(0, 3)}
            renderItem={renderPackageItem}
            size="small"
          />
          {results.packages.length > 3 && (
            <Button type="link" onClick={() => setActiveTab('packages')}>
              查看全部套餐结果
            </Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div>
      <Card>
        <Row gutter={24}>
          <Col span={16}>
      <Search
              placeholder="搜索用户、订单、套餐..."
              size="large"
              enterButton={<SearchOutlined />}
              onSearch={(v) => handleSearch(v)}
              onChange={onChangeDebounced}
              value={keyword}
              disabled={!keyword.trim() && !loading && false}
              style={{ marginBottom: 24 }}
              allowClear
            />
            {keyword && (
              <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={() => handleSearch(keyword, true)} disabled={loading}>刷新</Button>
        <Button size="small" onClick={() => { cacheRef.current.clear(); clearPersistCache(); handleSearch(keyword, true); }} disabled={loading}>清缓存并重新搜索</Button>
              </Space>
            )}
          </Col>
        </Row>

        {!keyword && (
          <Row gutter={16}>
            <Col span={12}>
              <Card title="搜索历史" size="small">
                {searchHistory.length > 0 ? (
                  <Space wrap>
                    {searchHistory.slice(0, 10).map((item, index) => (
                      <Button
                        key={index}
                        type="link"
                        icon={<HistoryOutlined />}
                        onClick={() => handleSearch(item.keyword)}
                      >
                        {item.keyword} ({item.count})
                      </Button>
                    ))}
                  </Space>
                ) : (
                  <Empty description="暂无搜索历史" />
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="热门搜索" size="small">
                <Space wrap>
                  {hotKeywords.map((word, index) => (
                    <Tag
                      key={index}
                      color="blue"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSearch(word)}
                    >
                      {word}
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {keyword && (
          <Spin spinning={loading}>
            <div style={{ marginBottom: 16 }}>
              <Space size="large" wrap>
                <Text type="secondary">搜索"{keyword}"，共 {getTotalCount()} 条</Text>
                <Tag>用户 {meta.users?.total ?? results.users.length}</Tag>
                <Tag color="blue">订单 {meta.orders?.total ?? results.orders.length}</Tag>
                <Tag color="purple">套餐 {meta.packages?.total ?? results.packages.length}</Tag>
                <Tag color="gold">支付 {meta.payments?.total ?? results.payments.length}</Tag>
              </Space>
            </div>

            {getTotalCount() === 0 && !loading ? (
              <Empty description="没有找到相关结果" />
            ) : (
              <Tabs
                activeKey={activeTab}
                onChange={(k) => {
                  handleTabChange(k);
                  if (k === 'users' && results.users.length === 0) fetchSearch(keyword, 'user', userPage);
                  if (k === 'orders' && results.orders.length === 0) fetchSearch(keyword, 'order', orderPage);
                  if (k === 'packages' && results.packages.length === 0) fetchSearch(keyword, 'package', packagePage);
                  if (k === 'payments' && results.payments.length === 0) fetchSearch(keyword, 'payment', paymentPage);
                  if (k === 'all') fetchSearch(keyword, undefined, 1);
                }}
                items={[
                  {
                    key: 'all',
                    label: `全部 (${getTotalCount()})`,
                    children: renderAllResults()
                  },
                  {
                    key: 'users',
                    label: `用户 (${meta.users?.total ?? results.users.length})`,
                    children: (
                      <List
                        dataSource={results.users}
                        renderItem={renderUserItem}
                        pagination={meta.users && meta.users.total > PAGE_SIZE ? {
                          current: userPage,
                          total: meta.users.total,
                          pageSize: PAGE_SIZE,
                          onChange: (p) => { setUserPage(p); fetchSearch(keyword, 'user', p); },
                          size: 'small'
                        } : false}
                      />
                    )
                  },
                  {
                    key: 'orders',
                    label: `订单 (${meta.orders?.total ?? results.orders.length})`,
                    children: (
                      <List
                        dataSource={results.orders}
                        renderItem={renderOrderItem}
                        pagination={meta.orders && meta.orders.total > PAGE_SIZE ? {
                          current: orderPage,
                          total: meta.orders.total,
                          pageSize: PAGE_SIZE,
                          onChange: (p) => { setOrderPage(p); fetchSearch(keyword, 'order', p); },
                          size: 'small'
                        } : false}
                      />
                    )
                  },
                  {
                    key: 'packages',
                    label: `套餐 (${meta.packages?.total ?? results.packages.length})`,
                    children: (
                      <List
                        dataSource={results.packages}
                        renderItem={renderPackageItem}
                        pagination={meta.packages && meta.packages.total > PAGE_SIZE ? {
                          current: packagePage,
                          total: meta.packages.total,
                          pageSize: PAGE_SIZE,
                          onChange: (p) => { setPackagePage(p); fetchSearch(keyword, 'package', p); },
                          size: 'small'
                        } : false}
                      />
                    )
                  },
                  {
                    key: 'payments',
                    label: `支付 (${meta.payments?.total ?? results.payments.length})`,
                    children: (
                      <List
                        dataSource={results.payments}
                        renderItem={(payment) => {
                          const status = (payment.status || '').toLowerCase();
                          const method = (payment.method || '').toLowerCase();
                          const statusColor = status.includes('success') || status.includes('paid') ? 'green' : status.includes('fail') ? 'red' : status.includes('refund') ? 'orange' : 'blue';
                          const methodColor = method === 'wechat' ? 'green' : method === 'alipay' ? 'blue' : method === 'cash' ? 'gold' : 'purple';
                          return (
                            <List.Item
                              actions={[
                                <Button type="link" onClick={() => navigate(`/orders/${payment.orderId}`)}>订单</Button>
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<Avatar icon={<DollarOutlined />} />}
                                title={<Space>{highlight(payment.paymentNo)}<Tag color={statusColor}>{status || '状态'}</Tag></Space>}
                                description={
                                  <Space size={8} wrap>
                                    <Text type="secondary">金额: ¥{payment.amount}</Text>
                                    <Tag color={methodColor}>{method || '方式'}</Tag>
                                    <Text type="secondary">{new Date(payment.createdAt).toLocaleString()}</Text>
                                  </Space>
                                }
                              />
                            </List.Item>
                          );
                        }}
                        pagination={meta.payments && meta.payments.total > PAGE_SIZE ? {
                          current: paymentPage,
                          total: meta.payments.total,
                          pageSize: PAGE_SIZE,
                          onChange: (p) => { setPaymentPage(p); fetchSearch(keyword, 'payment', p); },
                          size: 'small'
                        } : false}
                      />
                    )
                  }
                ]}
              />
            )}
          </Spin>
        )}
      </Card>
    </div>
  );
};

export default GlobalSearch;
