import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Menu, Avatar, Dropdown, Space, Badge, Button, Modal, Descriptions, Tag, Drawer } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  GiftOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  SearchOutlined,
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  ReconciliationOutlined,
  RollbackOutlined,
  BgColorsOutlined,
  CalculatorOutlined,
  ShopOutlined,
  TagsOutlined,
  BuildOutlined,
  FundOutlined,
  LineChartOutlined,
  MenuOutlined,
  BarChartOutlined,
  TeamOutlined,
  LockOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import { useTheme } from '@/contexts/ThemeContext';
import Calculator from '@/components/Calculator';
import type { MenuProps } from 'antd';
import './index.css';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

// 递归过滤菜单项（基于权限），无权限配置时原样通过
const filterMenuItems = (items: MenuProps['items'], pathPermissionMap: Record<string, string>, user: any): MenuProps['items'] => {
  return items?.map((item) => {
    if (!item) return null;
    const itemAny = item as any;
    if (itemAny.children && Array.isArray(itemAny.children)) {
      const filteredChildren = filterMenuItems(itemAny.children, pathPermissionMap, user);
      if (!filteredChildren || filteredChildren.length === 0) return null;
      return { ...item, children: filteredChildren } as any;
    }
    const perm = pathPermissionMap[String(itemAny.key)] || null;
    if (!perm) return item;
    if (user?.isAdmin) return item;
    const perms: string[] = user?.permissions || [];
    return perms.includes(perm) ? item : null;
  }).filter(Boolean) as MenuProps['items'];
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { theme } = useTheme();

  // 监听窗口尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 路径 -> 权限 映射（保留扩展用，当前无实际权限限制）
  const pathPermissionMap: Record<string, string> = {};

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard-group',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      children: [
        { key: '/dashboard', label: '概览' },
        { key: '/dashboard/data', label: '数据看板' },
      ],
    },
    {
      key: 'products-center',
      icon: <GiftOutlined />,
      label: '产品中心',
      children: [
        { key: '/packages/list', label: '套系列表' },
        { key: '/packages/categories', label: '套系分类' },
        {
          key: 'diy-sub',
          label: 'DIY套系',
          children: [
            { key: '/diy-packages/list', label: 'DIY套系列表' },
            { key: '/diy-packages/builder', label: 'DIY套系构建器' },
            { key: '/diy-packages/discount-rules', label: 'DIY折扣规则' },
          ],
        },
        { key: '/products', label: '商品列表' },
        { key: '/products/categories', label: '商品分类' },
        { key: '/service-items', label: '服务项目' },
      ],
    },
    {
      key: 'orders-group',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
      children: [
        { key: '/orders', label: '订单列表' },
        { key: '/marketing/group-buy', label: '团购订单' },
      ],
    },
    {
      key: 'customers-menu',
      icon: <TeamOutlined />,
      label: '客户管理',
      children: [
        { key: '/wx-users', label: '客户信息' },
        { key: '/crm/member-levels', label: '会员等级' },
        { key: '/crm/complaints', label: '客诉管理' },
      ],
    },
    {
      key: 'shooting-menu',
      icon: <CalendarOutlined />,
      label: '拍摄管理',
      children: [
        { key: '/time-slots', label: '时间槽管理' },
        { key: '/schedule-board', label: '拍摄日程' },
      ],
    },
    {
      key: 'finance-menu',
      icon: <CreditCardOutlined />,
      label: '财务管理',
      children: [
        { key: '/payments', label: '支付列表' },
        { key: '/payments/suspicious', label: '可疑支付检测' },
        { key: '/reconciliation', label: '对账管理' },
        { key: '/refunds/approval', label: '退款审批' },
        { key: '/refunds/records', label: '退款记录' },
      ],
    },
    {
      key: 'marketing-menu',
      icon: <FundOutlined />,
      label: '营销管理',
      children: [
        { key: '/marketing/coupons', label: '优惠券管理' },
        { key: '/marketing/points-config', label: '积分配置' },
        { key: '/marketing/points-transactions', label: '积分明细' },
        { key: '/marketing/segments', label: '客户分群' },
        { key: '/marketing/campaigns', label: '营销活动' },
        { key: '/analytics', label: '数据分析' },
      ],
    },
    {
      key: 'supply-chain',
      icon: <ShopOutlined />,
      label: '供应链管理',
      children: [
        { key: '/suppliers', label: '供应商列表' },
        { key: '/suppliers/blacklist', label: '黑名单供应商' },
        { key: '/purchase-orders', label: '采购订单' },
        { key: '/purchase-orders/approvals', label: '采购审批' },
        { key: '/in-transit', label: '在途商品' },
        { key: '/inbound', label: '入库管理' },
        {
          key: 'inventory-sub',
          icon: <LineChartOutlined />,
          label: '库存智能',
          children: [
            { key: '/stock/prediction', label: '销量预测' },
            { key: '/stock/safety-stock', label: '安全库存' },
            { key: '/stock/restock-suggestions', label: '补货建议' },
            { key: '/stock/slow-moving', label: '呆滞预警' },
            { key: '/stock/turnover-analysis', label: '周转分析' },
          ],
        },
      ],
    },
    {
      key: 'system-menu',
      icon: <SettingOutlined />,
      label: '系统管理',
      children: [
        { key: '/users', label: '员工列表' },
        { key: '/system/roles', label: '角色管理' },
        { key: '/system/settings', label: '系统设置' },
        { key: '/settings/shop-info', label: '店铺信息' },
        { key: '/settings/print-settings', label: '打印设置' },
        { key: '/settings/automation-rules', label: '自动化规则' },
        { key: '/system/operation-logs', label: '操作日志' },
        { key: '/system/status', label: '系统状态' },
        { key: '/system/backup', label: '数据库备份' },
        { key: '/system/restore', label: '数据库恢复' },
        { key: '/system/theme', label: '更改主题', icon: <BgColorsOutlined /> },
      ],
    },
    {
      key: 'export-menu',
      icon: <ExportOutlined />,
      label: '导出中心',
      children: [
        { key: '/export/all', label: '综合导出' },
      ],
    },
    {
      key: 'tools-menu',
      icon: <SearchOutlined />,
      label: '工具',
      children: [
        { key: '/search', label: '全局搜索' },
        {
          key: 'notify-sub',
          label: '通知管理',
          children: [
            { key: '/notify/push', label: '消息推送' },
            { key: '/notify/email', label: '邮件发送' },
            { key: '/notify/system', label: '系统通知' },
            { key: '/notify/stock', label: '库存报警' },
            { key: '/notify/templates', label: '通知模板' },
          ],
        },
      ],
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: '修改密码',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) setMobileMenuOpen(false);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'logout':
        dispatch(logout());
        navigate('/login');
        break;
      case 'change-password':
        navigate('/system/change-password');
        break;
      case 'profile':
        setProfileModalVisible(true);
        break;
      case 'settings':
        navigate('/system/settings');
        break;
    }
  };

  // 顶部快捷下拉菜单
  const quickMenu: MenuProps['items'] = [
    { key: '/orders', label: '订单列表' },
    { key: '/wx-users', label: '客户信息' },
    { key: '/schedule-board', label: '拍摄日程' },
    { key: '/packages/list', label: '套系列表' },
    { key: '/marketing/group-buy', label: '新建团购' },
  ];

  const toolsMenu: MenuProps['items'] = [
    {
      key: 'notify-group',
      label: '通知管理',
      children: [
        { key: '/notify/push', label: '消息推送' },
        { key: '/notify/email', label: '邮件发送' },
        { key: '/notify/system', label: '系统通知' },
        { key: '/notify/stock', label: '库存报警' },
        { key: '/notify/templates', label: '通知模板' },
      ],
    },
    { key: '/search', label: '全局搜索' },
    { key: 'calculator', label: '计算器', icon: <CalculatorOutlined /> },
  ];

  const handleTopMenuClick = ({ key }: { key: string }) => {
    if (key === 'calculator') {
      setCalculatorVisible(true);
      return;
    }
    navigate(key);
  };

  const getTitleFromPath = (pathname: string) => {
    if (!pathname) return '管理后台';
    if (pathname === '/' || pathname.startsWith('/dashboard')) {
      if (pathname.startsWith('/dashboard/data')) return '数据看板';
      return '仪表盘';
    }
    if (pathname.startsWith('/packages') || pathname.startsWith('/products') || pathname.startsWith('/service-items') || pathname.startsWith('/diy-packages')) return '产品中心';
    if (pathname.startsWith('/orders')) return '订单管理';
    if (pathname.startsWith('/wx-users') || pathname.startsWith('/crm')) return '客户管理';
    if (pathname.startsWith('/time-slots') || pathname.startsWith('/schedule-board')) return '拍摄管理';
    if (pathname.startsWith('/payments') || pathname.startsWith('/reconciliation') || pathname.startsWith('/refunds')) return '财务管理';
    if (pathname.startsWith('/marketing') || pathname.startsWith('/analytics')) return '营销管理';
    if (pathname.startsWith('/suppliers') || pathname.startsWith('/purchase-orders') || pathname.startsWith('/in-transit') || pathname.startsWith('/inbound') || pathname.startsWith('/stock')) return '供应链管理';
    if (pathname.startsWith('/users') || pathname.startsWith('/system') || pathname.startsWith('/settings')) return '系统管理';
    if (pathname.startsWith('/export')) return '导出中心';
    if (pathname.startsWith('/search') || pathname.startsWith('/notify')) return '工具';
    return '管理后台';
  };

  // 处理菜单选中态：将部分非菜单路径映射到对应菜单项
  const menuKeyMap: Record<string, string> = {
    '/packages': '/packages/list',
  };
  const selectedKey = menuKeyMap[location.pathname] || location.pathname;

  const renderMenu = (items: MenuProps['items']) => (
    <Menu
      style={{
        background: 'transparent',
        color: theme.siderTextColor,
        fontSize: 18,
        paddingBottom: 48,
      }}
      className="custom-menu"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={filterMenuItems(items, pathPermissionMap, user)}
      onClick={handleMenuClick}
      theme={theme.siderBg.includes('#fff') || theme.siderBg.includes('#fafafa') || theme.siderBg.includes('gradient(180deg, #d1fae5') ? 'light' : 'dark'}
    />
  );

  return (
    <AntLayout style={{ height: '100vh', overflow: 'hidden' }}>
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: theme.siderBg,
            overflow: 'auto',
            height: '100vh',
          }}
          width={256}
        >
          <div
            style={{
              height: 64,
              margin: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.siderTextColor,
              fontWeight: 'bold',
              fontSize: collapsed ? 16 : 18,
            }}
          >
            {collapsed ? theme.systemTitleShort : theme.systemTitle}
          </div>
          {renderMenu(menuItems)}
        </Sider>
      )}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setMobileMenuOpen(false)}
        open={isMobile ? mobileMenuOpen : false}
        styles={{ body: { padding: 0, background: theme.siderBg } }}
        width={256}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.siderTextColor,
            fontWeight: 'bold',
            fontSize: 18,
            background: 'rgba(255, 255, 255, 0.2)',
            margin: 16,
            borderRadius: 6,
          }}
        >
          {theme.systemTitle}
        </div>
        {renderMenu(menuItems)}
      </Drawer>

      <AntLayout style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Header
          style={{
            padding: '0 24px',
            background: theme.headerBg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            flexShrink: 0,
          }}
        >
          <Space>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                style={{ color: theme.headerTextColor, fontSize: 18 }}
              />
            )}
            <div style={{ fontSize: 18, fontWeight: 500, color: theme.headerTextColor }}>
              {getTitleFromPath(location.pathname)}
            </div>
          </Space>

          <Space size="middle">
            {!isMobile && (
              <>
                <Dropdown menu={{ items: quickMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>快捷</Button>
                </Dropdown>
                <Dropdown menu={{ items: toolsMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>工具</Button>
                </Dropdown>
              </>
            )}

            <Badge count={5}>
              <BellOutlined style={{ fontSize: 18, color: theme.headerTextColor }} />
            </Badge>

            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleUserMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ color: theme.headerTextColor }}>{user?.nickname}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: 0,
            padding: 0,
            background: location.pathname.startsWith('/dashboard')
              ? '#070b1a'
              : theme.contentBg,
            overflow: 'auto',
            flex: 1,
          }}
        >
          {children}
        </Content>

        {/* 工信部备案号展示 */}
        <div
          style={{
            textAlign: 'center',
            padding: '8px 16px',
            fontSize: 12,
            color: '#999',
            borderTop: '1px solid #f0f0f0',
            background: theme.contentBg,
            flexShrink: 0,
          }}
        >
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#999', textDecoration: 'none' }}
          >
            辽ICP备2026010503号-1
          </a>
        </div>
      </AntLayout>

      {/* 浮动计算器 */}
      <Calculator visible={calculatorVisible} onClose={() => setCalculatorVisible(false)} />

      {/* 个人资料弹窗 */}
      <Modal
        title="个人资料"
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        footer={<Button onClick={() => setProfileModalVisible(false)}>关闭</Button>}
      >
        <Descriptions column={1} size="middle" style={{ marginTop: 16 }}>
          <Descriptions.Item label="员工ID">{user?.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="OpenID">{user?.openid || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.isAdmin ? <Tag color="red">管理员</Tag> : <Tag color="blue">普通员工</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </AntLayout>
  );
};

export default Layout;
