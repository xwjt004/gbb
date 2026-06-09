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

  // 路径 -> 权限 映射，不在 Menu item 上添加自定义字段以避免类型冲突
  // 注意：在途商品已从权限控制中移除，改为与采购订单、入库管理一致，所有用户可见
  const pathPermissionMap: Record<string, string> = {
    // '/in-transit': PERMISSIONS.IN_TRANSIT_VIEW,  // 已移除权限限制
  };

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
      key: 'users-menu',
      icon: <UserOutlined />,
      label: '用户管理',
      children: [
        { key: '/users', label: '用户列表' },
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
        { key: 'customer-orders', label: '客户订单' },
      ],
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
    },
    {
      key: '/packages',
      icon: <GiftOutlined />,
      label: '套系管理',
      children: [
        {
          key: '/packages/list',
          label: '套系列表',
        },
        {
          key: '/packages/categories',
          label: '套系分类',
        },
      ],
    },
    {
      key: 'products-menu',
      icon: <ShopOutlined />,
      label: '商品管理',
      children: [
        {
          key: '/products',
          label: '商品列表',
        },
        {
          key: '/products/categories',
          label: '商品分类',
        },
      ],
    },
    {
      key: '/service-items',
      icon: <TagsOutlined />,
      label: '服务项目',
    },
    {
      key: 'diy-packages-menu',
      icon: <BuildOutlined />,
      label: 'DIY套系',
      children: [
        {
          key: '/diy-packages/list',
          label: 'DIY套系列表',
        },
        {
          key: '/diy-packages/builder',
          label: 'DIY套系构建器',
        },
        {
          key: '/diy-packages/discount-rules',
          label: 'DIY折扣规则',
        },
      ],
    },
    {
      key: 'payments-menu',
      icon: <CreditCardOutlined />,
      label: '支付管理',
      children: [
        {
          key: '/payments',
          label: '支付列表',
        },
        {
          key: '/payments/suspicious',
          label: '可疑支付检测',
        },
      ],
    },
    {
      key: '/reconciliation',
      icon: <ReconciliationOutlined />,
      label: '对账管理',
    },
    {
      key: '/refunds',
      icon: <RollbackOutlined />,
      label: '退款管理',
      children: [
        {
          key: '/refunds/approval',
          label: '退款审批',
        },
        {
          key: '/refunds/records',
          label: '退款记录',
        },
      ],
    },
    {
      key: '/time-slots',
      icon: <ClockCircleOutlined />,
      label: '时间槽管理',
    },
    {
      key: '/schedule-board',
      icon: <CalendarOutlined />,
      label: '拍摄日程',
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: '查找功能',
    },
    {
      key: 'marketing-menu',
      icon: <FundOutlined />,
      label: '营销管理',
      children: [
        { key: '/marketing/coupons', label: '优惠券管理' },
        { key: '/marketing/segments', label: '客户分群' },
        { key: '/marketing/campaigns', label: '营销活动' },
      ],
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: 'purchase-menu',
      icon: <ShopOutlined />,
      label: '采购管理',
      children: [
        { key: '/suppliers', label: '供应商列表' },
        { key: '/suppliers/blacklist', label: '黑名单供应商' },
        { key: '/purchase-orders', label: '采购订单' },
            { key: '/purchase-orders/approvals', label: '采购审批' },
        { key: '/in-transit', label: '在途商品' },
        { key: '/inbound', label: '入库管理' },
        { key: '/stock/auto-purchase', label: '自动采购建议' },
      ],
    },
    {
      key: 'inventory-intelligence-menu',
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
  ];

  const userMenuItems: MenuProps['items'] = [
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
    const routeMap: Record<string, string> = {
      'customer-orders': '/orders',
    };
    navigate(routeMap[key] || key);
    if (isMobile) setMobileMenuOpen(false);
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'logout':
        dispatch(logout());
        navigate('/login');
        break;
      case 'profile':
        setProfileModalVisible(true);
        break;
      case 'settings':
        navigate('/system/settings');
        break;
    }
  };

  // 顶部快捷下拉菜单配置（功能 / 导出 / 通知 / 系统）
  const featuresMenu: MenuProps['items'] = [
    { key: '/orders', label: '订单管理' },
    { key: '/packages', label: '套系管理' },
    { key: '/time-slots', label: '时间槽管理' },
    { key: '/payments', label: '支付管理' },
    { key: '/reconciliation', label: '对账管理' },
    { key: '/users', label: '用户管理' },
  ];

  const exportMenu: MenuProps['items'] = [
    { key: '/export/orders', label: '订单导出' },
    { key: '/export/users', label: '用户导出' },
    { key: '/export/finance', label: '财务导出' },
    { key: '/export/all', label: '全部导出' },
  ];

  const notifyMenu: MenuProps['items'] = [
    { key: '/notify/push', label: '消息推送' },
    { key: '/notify/email', label: '邮件发送' },
    { key: '/notify/system', label: '系统通知' },
    { key: '/notify/stock', label: '库存报警' },
    { key: '/notify/templates', label: '通知模板' },
  ];

  const systemMenu: MenuProps['items'] = [
    { key: '/system/status', label: '系统状态' },
    { key: '/system/operation-logs', label: '操作日志' },
    { key: '/system/roles', label: '角色管理' },
    { key: '/system/settings', label: '系统设置' },
    { key: '/settings/shop-info', label: '店铺信息设置' },
    { key: '/settings/print-settings', label: '打印设置' },
    { key: '/settings/automation-rules', label: '自动化规则' },
    { key: '/system/theme', label: '更改主题', icon: <BgColorsOutlined /> },
    { key: 'calculator', label: '计算器', icon: <CalculatorOutlined /> },
    { key: '/system/backup', label: '数据库备份' },
    { key: '/system/restore', label: '数据库恢复' },
  ];

  const handleTopMenuClick = ({ key }: { key: string }) => {
    // 如果是计算器，显示计算器
    if (key === 'calculator') {
      setCalculatorVisible(true);
      return;
    }
    // 其他路由跳转
    navigate(key);
  };

  const getTitleFromPath = (pathname: string) => {
    if (!pathname) return '管理后台';
    if (pathname === '/' || pathname.startsWith('/dashboard')) {
      if (pathname.startsWith('/dashboard/data')) return '数据看板';
      return '仪表盘';
    }
    if (pathname.startsWith('/users')) return '用户管理';
    if (pathname.startsWith('/wx-users')) return '客户管理';
    if (pathname.startsWith('/orders')) return '订单管理';
    if (pathname.startsWith('/packages')) return '套系管理';
    if (pathname.startsWith('/products')) return '商品管理';
    if (pathname.startsWith('/service-items')) return '服务项目';
    if (pathname.startsWith('/payments')) return '支付管理';
    if (pathname.startsWith('/reconciliation')) return '对账管理';
    if (pathname.startsWith('/time-slots')) return '时间槽管理';
    if (pathname.startsWith('/schedule-board')) return '拍摄日程';
    if (pathname.startsWith('/search')) return '查找功能';
    if (pathname.startsWith('/export')) return '导出';
    if (pathname.startsWith('/notify')) return '通知';
    if (pathname.startsWith('/system')) return '系统';
    if (pathname.startsWith('/suppliers')) return '供应商管理';
    if (pathname.startsWith('/purchase-orders')) return '采购订单管理';
    if (pathname.startsWith('/in-transit')) return '在途商品管理';
    if (pathname.startsWith('/inbound')) return '入库管理';
    if (pathname.startsWith('/stock/prediction')) return '销量预测';
    if (pathname.startsWith('/stock/safety-stock')) return '安全库存';
    if (pathname.startsWith('/stock/restock-suggestions')) return '补货建议';
    if (pathname.startsWith('/stock/slow-moving')) return '呆滞预警';
    if (pathname.startsWith('/stock/turnover-analysis')) return '库存周转分析';
    if (pathname.startsWith('/marketing/segments')) return '客户分群';
    if (pathname.startsWith('/marketing/campaigns')) return '营销活动';
    if (pathname.startsWith('/marketing')) return '营销管理';
    if (pathname.startsWith('/analytics')) return '数据分析';
    return '管理后台';
  };

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
          <Menu
            style={{
              background: 'transparent',
              color: theme.siderTextColor,
              fontSize: 18,
              paddingBottom: 48,
            }}
            className="custom-menu"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems
              .map((mi) => {
                if (!mi) return null;
                const children = (mi as any).children as MenuProps['items'] | undefined;
                if (children && Array.isArray(children)) {
                  const filteredChildren = children.filter((child: any) => {
                    const perm = pathPermissionMap[String(child?.key)] || null;
                    if (!perm) return true;
                    if (user?.isAdmin) return true;
                    const perms: string[] = (user as any)?.permissions || [];
                    return perms.includes(perm);
                  });
                  if (filteredChildren.length === 0) return null;
                  return { ...mi, children: filteredChildren } as any;
                }
                const perm = pathPermissionMap[String((mi as any).key)] || null;
                if (!perm) return mi;
                if (user?.isAdmin) return mi;
                const perms: string[] = (user as any)?.permissions || [];
                return perms.includes(perm) ? mi : null;
              })
              .filter(Boolean) as MenuProps['items']}
            onClick={handleMenuClick}
            theme={theme.siderBg.includes('#fff') || theme.siderBg.includes('#fafafa') || theme.siderBg.includes('gradient(180deg, #d1fae5') ? 'light' : 'dark'}
          />
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
        <Menu
          style={{
            background: 'transparent',
            color: theme.siderTextColor,
            fontSize: 18,
            paddingBottom: 48,
          }}
          className="custom-menu"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems
            .map((mi) => {
              if (!mi) return null;
              const children = (mi as any).children as MenuProps['items'] | undefined;
              if (children && Array.isArray(children)) {
                const filteredChildren = children.filter((child: any) => {
                  const perm = pathPermissionMap[String(child?.key)] || null;
                  if (!perm) return true;
                  if (user?.isAdmin) return true;
                  const perms: string[] = (user as any)?.permissions || [];
                  return perms.includes(perm);
                });
                if (filteredChildren.length === 0) return null;
                return { ...mi, children: filteredChildren } as any;
              }
              const perm = pathPermissionMap[String((mi as any).key)] || null;
              if (!perm) return mi;
              if (user?.isAdmin) return mi;
              const perms: string[] = (user as any)?.permissions || [];
              return perms.includes(perm) ? mi : null;
            })
            .filter(Boolean) as MenuProps['items']}
          onClick={handleMenuClick}
          theme={theme.siderBg.includes('#fff') || theme.siderBg.includes('#fafafa') || theme.siderBg.includes('gradient(180deg, #d1fae5') ? 'light' : 'dark'}
        />
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
                <Dropdown menu={{ items: featuresMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>功能</Button>
                </Dropdown>
                <Dropdown menu={{ items: exportMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>导出</Button>
                </Dropdown>
                <Dropdown menu={{ items: notifyMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>通知</Button>
                </Dropdown>
                <Dropdown menu={{ items: systemMenu, onClick: handleTopMenuClick }} placement="bottomRight">
                  <Button type="text" style={{ color: theme.headerTextColor }}>系统</Button>
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
          <Descriptions.Item label="用户ID">{user?.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user?.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="OpenID">{user?.openid || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            {user?.isAdmin ? <Tag color="red">管理员</Tag> : <Tag color="blue">普通用户</Tag>}
          </Descriptions.Item>
        </Descriptions>
      </Modal>
    </AntLayout>
  );
};

export default Layout;
