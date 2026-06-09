import React, { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { useAppDispatch, useAppSelector } from '@/store';
import { setOffline, setOnline } from '@/store/networkSlice';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Provider } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { store } from '@/store';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Auth/Login';
import Dashboard from '@/pages/Dashboard';

const UserList = React.lazy(() => import('@/pages/Users/UserList'));
const OrderList = React.lazy(() => import('@/pages/Orders/OrderList'));
const OrderDetailPage = React.lazy(() => import('@/pages/Orders/OrderDetailPage'));
const OrderEditPage = React.lazy(() => import('@/pages/Orders/OrderEditPage'));
const PackageList = React.lazy(() => import('@/pages/Packages/PackageList'));
const PackageCategoryManage = React.lazy(() => import('@/pages/Packages/PackageCategoryManage'));
const PackageDetailPage = React.lazy(() => import('@/pages/Packages/PackageDetailPage'));
const PackageEditPage = React.lazy(() => import('@/pages/Packages/PackageEditPage'));
const PaymentList = React.lazy(() => import('@/pages/Payments/PaymentList'));
const SuspiciousPayments = React.lazy(() => import('@/pages/Payments/SuspiciousPayments'));
const Reconciliation = React.lazy(() => import('@/pages/Dashboard/EnhancedReconciliation'));
const ReconciliationManagement = React.lazy(() => import('@/pages/Reconciliation/ReconciliationManagement'));
const TimeSlots = React.lazy(() => import('@/pages/TimeSlots'));
const BusinessDashboard = React.lazy(() => import('@/pages/Dashboard/BusinessDashboard'));
const ScheduleBoard = React.lazy(() => import('@/pages/Schedule/ScheduleBoard'));
const GlobalSearch = React.lazy(() => import('@/pages/Search/GlobalSearch'));
const ExportOrders = React.lazy(() => import('@/pages/Export/Orders'));
const ExportUsers = React.lazy(() => import('@/pages/Export/Users'));
const ExportFinance = React.lazy(() => import('@/pages/Export/Finance'));
const ExportAll = React.lazy(() => import('@/pages/Export/All'));
const NotifyPush = React.lazy(() => import('@/pages/Notify/Push'));
const NotifyEmail = React.lazy(() => import('@/pages/Notify/Email'));
const NotifySystem = React.lazy(() => import('@/pages/Notify/System'));
const NotifyStock = React.lazy(() => import('@/pages/Notify/Stock'));
const NotificationTemplates = React.lazy(() => import('@/pages/Notify/Templates'));
const SystemStatus = React.lazy(() => import('@/pages/System/Status'));
const SystemSettings = React.lazy(() => import('@/pages/System/Settings'));
const OperationLogs = React.lazy(() => import('@/pages/System/OperationLogs'));
const Roles = React.lazy(() => import('@/pages/System/Roles'));
const CustomerProfile = React.lazy(() => import('@/pages/CRM/CustomerProfile'));
const ComplaintList = React.lazy(() => import('@/pages/CRM/ComplaintList'));
const MemberLevels = React.lazy(() => import('@/pages/CRM/MemberLevels'));
const SystemBackup = React.lazy(() => import('@/pages/System/Backup'));
const SystemRestore = React.lazy(() => import('@/pages/System/Restore'));
const ThemeSettings = React.lazy(() => import('@/pages/System/ThemeSettings'));
const ShopInfoSettings = React.lazy(() => import('@/pages/Settings/ShopInfoSettings'));
const PrintSettingsPage = React.lazy(() => import('@/pages/Settings/PrintSettingsPage'));
const AutomationRules = React.lazy(() => import('@/pages/Settings/AutomationRules'));
const AutomationRuleForm = React.lazy(() => import('@/pages/Settings/AutomationRuleForm'));
const SalesPrediction = React.lazy(() => import('@/pages/Stock/SalesPrediction'));
const SafetyStockConfig = React.lazy(() => import('@/pages/Stock/SafetyStockConfig'));
const RestockSuggestions = React.lazy(() => import('@/pages/Stock/RestockSuggestions'));
const SlowMovingAlerts = React.lazy(() => import('@/pages/Stock/SlowMovingAlerts'));
const TurnoverAnalysis = React.lazy(() => import('@/pages/Stock/TurnoverAnalysis'));
const RefundApproval = React.lazy(() => import('@/pages/Refunds/RefundApproval'));
const RefundRecords = React.lazy(() => import('@/pages/Refunds/RefundRecords'));
const ProductCategoryList = React.lazy(() => import('@/pages/ProductCategories/ProductCategoryList'));
const ProductList = React.lazy(() => import('@/pages/Products/ProductList'));
const ServiceItemList = React.lazy(() => import('@/pages/ServiceItems/ServiceItemList'));
const DiscountRulesList = React.lazy(() => import('@/pages/DiyPackages/DiscountRulesList'));
const DiyPackageBuilder = React.lazy(() => import('@/pages/DiyPackages/DiyPackageBuilder'));
const DiyPackageList = React.lazy(() => import('@/pages/DiyPackages/DiyPackageList'));
const CouponList = React.lazy(() => import('@/pages/Marketing/CouponList'));
const CouponForm = React.lazy(() => import('@/pages/Marketing/CouponForm'));
const SegmentList = React.lazy(() => import('@/pages/Marketing/SegmentList'));
const SegmentForm = React.lazy(() => import('@/pages/Marketing/SegmentForm'));
const SegmentDetail = React.lazy(() => import('@/pages/Marketing/SegmentDetail'));
const CampaignList = React.lazy(() => import('@/pages/Marketing/CampaignList'));
const CampaignForm = React.lazy(() => import('@/pages/Marketing/CampaignForm'));
const CampaignFunnel = React.lazy(() => import('@/pages/Marketing/CampaignFunnel'));
const AnalyticsCenter = React.lazy(() => import('@/pages/Analytics'));
const SupplierList = React.lazy(() => import('@/pages/Suppliers/SupplierList'));
const PurchaseOrderList = React.lazy(() => import('@/pages/PurchaseOrders/PurchaseOrderList'));
const PurchaseOrderForm = React.lazy(() => import('@/pages/PurchaseOrders/PurchaseOrderForm'));
const PurchaseOrderDetail = React.lazy(() => import('@/pages/PurchaseOrders/PurchaseOrderDetail'));
const PurchaseOrderApproval = React.lazy(() => import('@/pages/PurchaseOrders/PurchaseOrderApproval'));
const PurchaseOrderApprovalList = React.lazy(() => import('@/pages/PurchaseOrders/PurchaseOrderApprovalList'));
const InboundList = React.lazy(() => import('@/pages/Inbound/InboundList'));
const InboundDetail = React.lazy(() => import('@/pages/Inbound/InboundDetail'));
const InTransitList = React.lazy(() => import('@/pages/InTransit/InTransitList'));
const InTransitDetail = React.lazy(() => import('@/pages/InTransit/InTransitDetail'));
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
const WxUserList = React.lazy(() => import('@/pages/WxUsers/WxUserList'));
const WxUserDetail = React.lazy(() => import('@/pages/WxUsers/WxUserDetail'));
import '@/styles/global.css';

dayjs.locale('zh-cn');

// 网络状态监听组件
const NetworkMonitor: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOffline = useAppSelector((s) => s.network.isOffline);
  const { notification } = AntdApp.useApp();

  useEffect(() => {
    const onError = (e: any) => {
      const { message: msg, status } = e.detail || {};
      // 仅在从在线变为离线时通知一次
      if (!isOffline) {
        dispatch(setOffline(msg || `请求失败${status || ''}`));
        notification.error({
          message: '网络/服务器错误',
          description: msg || `请求失败${status ? `（状态码 ${status}）` : ''}`,
          duration: 6,
        });
      }
    };

    const onSuccess = () => {
      // 仅在之前离线时显示恢复通知
      if (isOffline) {
        dispatch(setOnline());
        notification.success({
          message: '已恢复',
          description: '与后端的连接已恢复',
          duration: 4,
        });
      }
    };

    window.addEventListener('api:error', onError as EventListener);
    window.addEventListener('api:success', onSuccess as EventListener);
    return () => {
      window.removeEventListener('api:error', onError as EventListener);
      window.removeEventListener('api:success', onSuccess as EventListener);
    };
  }, [dispatch, isOffline, notification]);

  return null;
};

const ThemedApp: React.FC = () => {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      locale={zhCN}
      componentSize="middle"
      theme={{
        token: {
          colorPrimary: theme.primaryColor,
          fontSize: 14,
          controlHeight: 36,
          borderRadius: 8,
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
          colorBgLayout: '#f8fafc',
        },
      }}
    >
      <AntdApp>
        <NetworkMonitor />
        <ErrorBoundary>
        <Router basename="/admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <React.Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}>加载中...</div>}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/dashboard/data" element={<BusinessDashboard />} />
                      <Route path="/users" element={<UserList />} />
                      <Route path="/users/profile/:wxUserId" element={<CustomerProfile />} />
                      <Route path="/crm/complaints" element={<ComplaintList />} />
                      <Route path="/crm/member-levels" element={<MemberLevels />} />
                      <Route path="/orders" element={<OrderList />} />
                      <Route path="/orders/create" element={<Navigate to="/orders" replace />} />
                      <Route path="/orders/edit/:id" element={<OrderEditPage />} />
                      <Route path="/orders/:id" element={<OrderDetailPage />} />
                      <Route path="/packages" element={<PackageList />} />
                      <Route path="/packages/list" element={<PackageList />} />
                      <Route path="/packages/categories" element={<PackageCategoryManage />} />
                      <Route path="/packages/:id" element={<PackageDetailPage />} />
                      <Route path="/packages/edit/:id" element={<PackageEditPage />} />
                      <Route path="/products/categories" element={<ProductCategoryList />} />
                      <Route path="/products" element={<ProductList />} />
                      <Route path="/service-items" element={<ServiceItemList />} />
                      <Route path="/diy-packages/list" element={<DiyPackageList />} />
                      <Route path="/diy-packages/discount-rules" element={<DiscountRulesList />} />
                      <Route path="/diy-packages/builder" element={<DiyPackageBuilder />} />
                      <Route path="/payments" element={<PaymentList />} />
                      <Route path="/payments/suspicious" element={<SuspiciousPayments />} />
                      <Route path="/reconciliation" element={<Reconciliation />} />
                      <Route path="/reconciliation/management" element={<ReconciliationManagement />} />
                      <Route path="/time-slots" element={<TimeSlots />} />
                      <Route path="/schedule-board" element={<ScheduleBoard />} />
                      <Route path="/search" element={<GlobalSearch />} />
                      <Route path="/refunds/approval" element={<RefundApproval />} />
                      <Route path="/refunds/records" element={<RefundRecords />} />
                      <Route path="/export/orders" element={<ExportOrders />} />
                      <Route path="/export/users" element={<ExportUsers />} />
                      <Route path="/export/finance" element={<ExportFinance />} />
                      <Route path="/export/all" element={<ExportAll />} />
                      <Route path="/notify/push" element={<NotifyPush />} />
                      <Route path="/notify/email" element={<NotifyEmail />} />
                      <Route path="/notify/system" element={<NotifySystem />} />
                      <Route path="/notify/stock" element={<NotifyStock />} />
                      <Route path="/notify/templates" element={<NotificationTemplates />} />
                      <Route path="/system/status" element={<SystemStatus />} />
                      <Route path="/system/operation-logs" element={<OperationLogs />} />
                      <Route path="/system/roles" element={<Roles />} />
                      <Route path="/system/settings" element={<SystemSettings />} />
                      <Route path="/system/theme" element={<ThemeSettings />} />
                      <Route path="/system/backup" element={<SystemBackup />} />
                      <Route path="/system/restore" element={<SystemRestore />} />
                      <Route path="/marketing/coupons" element={<CouponList />} />
                      <Route path="/marketing/coupons/new" element={<CouponForm />} />
                      <Route path="/marketing/coupons/edit/:id" element={<CouponForm />} />
                      <Route path="/marketing/segments" element={<SegmentList />} />
                      <Route path="/marketing/segments/new" element={<SegmentForm />} />
                      <Route path="/marketing/segments/edit/:id" element={<SegmentForm />} />
                      <Route path="/marketing/segments/:id" element={<SegmentDetail />} />
                      <Route path="/marketing/campaigns" element={<CampaignList />} />
                      <Route path="/marketing/campaigns/new" element={<CampaignForm />} />
                      <Route path="/marketing/campaigns/edit/:id" element={<CampaignForm />} />
                      <Route path="/marketing/campaigns/funnel/:id" element={<CampaignFunnel />} />
                      <Route path="/analytics" element={<AnalyticsCenter />} />
                      <Route path="/wx-users" element={<WxUserList />} />
                      <Route path="/wx-users/:id" element={<WxUserDetail />} />
                      <Route path="/settings/automation-rules" element={<AutomationRules />} />
                      <Route path="/settings/automation-rules/new" element={<AutomationRuleForm />} />
                      <Route path="/settings/automation-rules/edit/:id" element={<AutomationRuleForm />} />
                      <Route path="/stock/auto-purchase" element={<Navigate to="/stock/restock-suggestions" replace />} />
                      <Route path="/stock/prediction" element={<SalesPrediction />} />
                      <Route path="/stock/safety-stock" element={<SafetyStockConfig />} />
                      <Route path="/stock/restock-suggestions" element={<RestockSuggestions />} />
                      <Route path="/stock/slow-moving" element={<SlowMovingAlerts />} />
                      <Route path="/stock/turnover-analysis" element={<TurnoverAnalysis />} />
                      <Route path="/settings/shop-info" element={<ShopInfoSettings />} />
                      <Route path="/settings/print-settings" element={<PrintSettingsPage />} />
                      <Route path="/suppliers" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <SupplierList />
                        </React.Suspense>
                      } />
                      <Route path="/suppliers/blacklist" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <SupplierList />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderList />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders/approvals" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderApprovalList />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders/create" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderForm />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders/edit/:id" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderForm />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders/:id" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderDetail />
                        </React.Suspense>
                      } />
                      <Route path="/purchase-orders/approve/:id" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <PurchaseOrderApproval />
                        </React.Suspense>
                      } />
                      <Route path="/in-transit" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <InTransitList />
                        </React.Suspense>
                      } />
                      <Route path="/in-transit/:id" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <InTransitDetail />
                        </React.Suspense>
                      } />
                      <Route path="/inbound" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <InboundList />
                        </React.Suspense>
                      } />
                      <Route path="/inbound/:id" element={
                        <React.Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}>
                          <InboundDetail />
                        </React.Suspense>
                      } />
                    </Routes>
                    </React.Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </Provider>
  );
};

export default App;



