import React, { useState } from 'react';
import {
  Card, Button, Space, message, Row, Col, Typography, Divider,
} from 'antd';
import {
  DownloadOutlined, AppstoreOutlined, ShoppingCartOutlined,
  ToolOutlined, TeamOutlined, FileTextOutlined,
  UsergroupAddOutlined, GiftOutlined, CalendarOutlined,
  DollarOutlined, RollbackOutlined, ShoppingOutlined,
  InboxOutlined, TruckOutlined, ExportOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { exportService } from '@/services/export';

const { Title, Text } = Typography;

interface ExportType {
  key: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  action: () => Promise<void>;
}

const ExportAll: React.FC = () => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleExport = async (key: string, action: () => Promise<void>) => {
    setLoadingKey(key);
    try {
      await action();
      message.success(`${key}导出成功，文件正在下载...`);
    } catch {
      message.error(`${key}导出失败`);
    } finally {
      setLoadingKey(null);
    }
  };

  const handleExportAll = async () => {
    setLoadingKey('全部');
    let success = 0;
    let fail = 0;
    for (const item of exportTypes) {
      try {
        await item.action();
        success++;
      } catch {
        fail++;
      }
    }
    setLoadingKey(null);
    if (fail === 0) {
      message.success(`全部 ${success} 项导出成功`);
    } else {
      message.warning(`${success} 项导出成功，${fail} 项导出失败`);
    }
  };

  const exportTypes: ExportType[] = [
    { key: '套系', label: '套系导出', desc: '套系名称、价格、定金、分类、状态、销量', icon: <AppstoreOutlined />, color: '#1677ff', action: () => exportService.exportPackages() },
    { key: '商品', label: '商品导出', desc: '商品编号、名称、分类、规格、价格、库存', icon: <ShoppingCartOutlined />, color: '#52c41a', action: () => exportService.exportProducts() },
    { key: '服务', label: '服务项目导出', desc: '服务编号、名称、分类、价格、时长、状态', icon: <ToolOutlined />, color: '#722ed1', action: () => exportService.exportServiceItems() },
    { key: '顾客', label: '顾客导出', desc: '微信昵称、手机号、姓名、会员等级、积分、消费', icon: <TeamOutlined />, color: '#13c2c2', action: () => exportService.exportCustomers() },
    { key: '订单', label: '订单导出', desc: '订单号、用户、套餐、金额、支付状态、物流', icon: <FileTextOutlined />, color: '#fa8c16', action: () => exportService.exportOrders() },
    { key: '团购', label: '团购导出', desc: '活动ID、关联商品、创建人、参团人数、状态', icon: <UsergroupAddOutlined />, color: '#eb2f96', action: () => exportService.exportGroupBuys() },
    { key: '积分', label: '积分/优惠券导出', desc: '优惠券码、名称、类型、面值、使用量、有效期', icon: <GiftOutlined />, color: '#fa541c', action: () => exportService.exportPoints() },
    { key: '日程', label: '拍摄日程导出', desc: '日期、时段、容量、预约数、状态、加价', icon: <CalendarOutlined />, color: '#2f54eb', action: () => exportService.exportTimeSlots() },
    { key: '支付', label: '支付导出', desc: '支付单号、订单号、金额、方式、状态、时间', icon: <DollarOutlined />, color: '#389e0d', action: () => exportService.exportFinancial({ startDate: '2000-01-01', endDate: '2099-12-31' }) },
    { key: '退款', label: '退款导出', desc: '退款编号、订单号、类型、金额、原因、状态', icon: <RollbackOutlined />, color: '#cf1322', action: () => exportService.exportRefunds() },
    { key: '采购', label: '采购订单导出', desc: '采购单号、供应商、金额、状态、收货状态', icon: <ShoppingOutlined />, color: '#d4b106', action: () => exportService.exportPurchaseOrders() },
    { key: '库存', label: '库存商品导出', desc: '商品编号、名称、分类、库存量、预警库存、状态', icon: <InboxOutlined />, color: '#1d39c4', action: () => exportService.exportStockItems() },
    { key: '员工', label: '员工导出', desc: '员工ID、昵称、手机号、角色、状态、创建时间', icon: <UserOutlined />, color: '#595959', action: () => exportService.exportUsers() },
    { key: '供应商', label: '供应商导出', desc: '供应商编号、名称、联系人、电话、等级、金额', icon: <TruckOutlined />, color: '#c41d7f', action: () => exportService.exportSuppliers() },
    { key: '在途', label: '在途商品导出', desc: '在途编号、采购单号、数量、金额、承运方、物流状态', icon: <ShoppingOutlined />, color: '#d48806', action: () => exportService.exportInTransit() },
    { key: '入库', label: '入库记录导出', desc: '入库编号、采购单号、数量、金额、质检状态、入库状态', icon: <InboxOutlined />, color: '#08979c', action: () => exportService.exportInbound() },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>数据导出中心</Title>
        <Button
          type="primary"
          size="large"
          icon={<ExportOutlined />}
          onClick={handleExportAll}
          loading={loadingKey === '全部'}
        >
          一键导出全部数据
        </Button>
      </div>

      <Divider />

      <Row gutter={[16, 16]}>
        {exportTypes.map(item => (
          <Col xs={24} sm={12} md={12} lg={6} key={item.key}>
            <Card
              hoverable
              style={{ height: '100%' }}
              actions={[
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={loadingKey === item.key}
                  onClick={() => handleExport(item.key, item.action)}
                  style={{ width: '90%', marginBottom: 8 }}
                >
                  导出
                </Button>,
              ]}
            >
              <Card.Meta
                avatar={
                  <span style={{ fontSize: 32, color: item.color }}>
                    {item.icon}
                  </span>
                }
                title={<Text strong>{item.label}</Text>}
                description={<Text type="secondary" style={{ fontSize: 13 }}>{item.desc}</Text>}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ExportAll;
