import React, { useState, useEffect } from "react";
import { Modal, Descriptions, Tag, Timeline, Card, Space, Button, message, Table, Alert, Spin, List } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  EditOutlined,
  PrinterOutlined,
  MoneyCollectOutlined,
  RollbackOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { Order, OrderStatus, OrderTimeline } from "@/types/order";
import OrderForm from "./OrderForm";
import BalanceCollectionModal from "@/components/BalanceCollectionModal";
import RefundRequestModal from "@/components/RefundRequestModal";
import { refundService, RefundRequest } from "@/services/refundService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import './OrderDetail.css';
import { getShopInfo, ShopInfo } from '@/services/shopInfoService';

// 初始化 dayjs 插件
dayjs.extend(utc);

interface OrderDetailProps {
  visible: boolean;
  order?: Order;
  onClose: () => void;
  onEdit?: (order: Order) => void;
  onRefresh?: () => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({
  visible,
  order,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const [timeline, setTimeline] = useState<OrderTimeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundHistory, setRefundHistory] = useState<RefundRequest[]>([]);
  // 店铺信息
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  // 更换套餐
  const [changePkgModalVisible, setChangePkgModalVisible] = useState(false);
  const [changePkgLoading, setChangePkgLoading] = useState(false);
  const [allPackages, setAllPackages] = useState<any[]>([]);

  // 拖动状态
  // 已弃用: Draggable 产生 findDOMNode 警告，移除拖拽支持

  useEffect(() => {
    if (visible && order) {
      fetchTimeline();
      fetchRefundHistory();
      fetchShopInfo();
    }
  }, [visible, order]);

  // 获取店铺信息
  const fetchShopInfo = async () => {
  try {
      const data = await getShopInfo();
      setShopInfo(data);
    } catch (err) {
      console.error('获取店铺信息失败:', err);
    }
  };

  // 拖动事件处理
  // 已移除拖拽逻辑

  const fetchTimeline = async () => {
    if (!order) return;

    try {
      setLoading(true);
      // 临时注释掉不存在的方法，等待后续实现
      // const response = await orderService.getOrderTimeline(order.id);
      // setTimeline(response.data.data);
      console.log("获取订单时间线:", order.id);
      setTimeline([]);
    } catch (error) {
      console.error("获取订单时间线失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取退款历史
  const fetchRefundHistory = async () => {
    if (!order?.orderNo) return;

    try {
      const refunds = await refundService.getRefundRequestsByOrderNo(order.orderNo);
      setRefundHistory(refunds);
    } catch (error) {
      console.error("获取退款历史失败:", error);
      setRefundHistory([]);
    }
  };

  // 处理编辑订单
  const handleEdit = () => {
    if (onEdit && order) {
      onEdit(order);
    } else {
      setEditFormVisible(true);
    }
  };

  // 处理编辑表单提交
  const handleEditSubmit = () => {
    setEditFormVisible(false);
    if (onRefresh) {
      onRefresh();
    }
    message.success('订单更新成功');
  };

  // 处理编辑表单取消
  const handleEditCancel = () => {
    setEditFormVisible(false);
  };

  // 处理收取尾款
  const handleCollectBalance = () => {
    setBalanceModalVisible(true);
  };

  // 处理尾款收取成功
  const handleBalanceCollectionSuccess = () => {
    setBalanceModalVisible(false);
    if (onRefresh) {
      onRefresh();
    }
    message.success('尾款收取成功');
  };

  // 处理尾款收取取消
  const handleBalanceCollectionCancel = () => {
    setBalanceModalVisible(false);
  };

  // 处理申请退款
  const handleApplyRefund = () => {
    setRefundModalVisible(true);
  };

  // 处理更换套餐
  const handleChangePackage = async () => {
    setChangePkgLoading(true);
    try {
      const { packageService } = await import('@/services/packages');
      const res = await packageService.getPackages({ page: 1, limit: 100 } as any) as any;
      const d = res?.data || res;
      const list = d?.packages || d?.list || [];
      setAllPackages(list.filter((p: any) => p.id !== order?.packageId));
      setChangePkgModalVisible(true);
    } catch {
      message.error('获取套餐列表失败');
    } finally {
      setChangePkgLoading(false);
    }
  };

  const handleConfirmChangePackage = async (newPackageId: number) => {
    if (!order) return;
    setChangePkgLoading(true);
    try {
      const { orderService } = await import('@/services/orders');
      await orderService.changePackage(order.id, newPackageId);
      message.success('套餐更换成功');
      setChangePkgModalVisible(false);
      onRefresh?.();
    } catch {
      message.error('套餐更换失败');
    } finally {
      setChangePkgLoading(false);
    }
  };

  // 处理退款申请成功
  const handleRefundSuccess = () => {
    setRefundModalVisible(false);
    message.success('退款申请提交成功');
    fetchRefundHistory();
    if (onRefresh) {
      onRefresh();
    }
    // 关闭订单详情抽屉，返回订单列表
    onClose();
  };

  // 处理退款申请取消
  const handleRefundCancel = () => {
    setRefundModalVisible(false);
  };

  // 处理打印订单
  const handlePrint = () => {
    if (!order) return;

    // 获取支付方式文本
    const getPaymentMethodText = () => {
      if (!order.payments || order.payments.length === 0) return '暂无';
      
      const paymentTypeMap: Record<string, string> = {
        'DEPOSIT': '定金',
        'FINAL': '尾款',
        'FULL': '全款',
        'REFUND': '退款',
      };
      
      const paymentMethodMap: Record<string, string> = {
        'WECHAT_PAY': '微信支付',
        'CASH': '现金',
        'WECHAT_TRANSFER': '微信转账',
        'ALIPAY': '支付宝',
        'BANK_TRANSFER': '银行转账',
      };
      
      return order.payments.map((p: any) => {
        const type = paymentTypeMap[p.paymentType] || p.paymentType;
        const method = paymentMethodMap[p.paymentMethod] || p.paymentMethod;
        return `${type}(${method})`;
      }).join(', ');
    };

    // 创建打印内容
    // 构造店铺信息字段（根据打印设置未来可控制显示，这里先全部显示，有值才展示）
    const s = shopInfo || ({} as Partial<ShopInfo>);
    const mapImg = s.locationMap ? getImageUrl(s.locationMap) : '';
    const shopPhotoImg = s.shopPhoto ? getImageUrl(s.shopPhoto) : '';

    const shopInfoHtml = `
      <div class="shop-info">
        <div class="shop-info-title">🏪 店铺信息</div>
        <div class="shop-info-grid">
          ${s.shopName ? `<div class="shop-info-item"><span class="shop-info-label">店铺名称:</span><span class="shop-info-value">${s.shopName}</span></div>` : ''}
          ${s.address ? `<div class="shop-info-item"><span class="shop-info-label">地址:</span><span class="shop-info-value">${s.address}</span></div>` : ''}
          ${s.phone ? `<div class="shop-info-item"><span class="shop-info-label">手机:</span><span class="shop-info-value">${s.phone}</span></div>` : ''}
          ${s.telephone ? `<div class="shop-info-item"><span class="shop-info-label">座机:</span><span class="shop-info-value">${s.telephone}</span></div>` : ''}
          ${s.wechatId ? `<div class="shop-info-item"><span class="shop-info-label">微信:</span><span class="shop-info-value">${s.wechatId}</span></div>` : ''}
          ${s.douyinId ? `<div class="shop-info-item"><span class="shop-info-label">抖音:</span><span class="shop-info-value">${s.douyinId}</span></div>` : ''}
          ${s.kuaishouId ? `<div class="shop-info-item"><span class="shop-info-label">快手:</span><span class="shop-info-value">${s.kuaishouId}</span></div>` : ''}
          ${s.xiaohongshuId ? `<div class="shop-info-item"><span class="shop-info-label">小红书:</span><span class="shop-info-value">${s.xiaohongshuId}</span></div>` : ''}
          ${s.businessHours ? `<div class="shop-info-item"><span class="shop-info-label">营业时间:</span><span class="shop-info-value">${s.businessHours}</span></div>` : ''}
          ${s.businessScope ? `<div class="shop-info-item" style="grid-column: span 3;"><span class="shop-info-label">经营范围:</span><span class="shop-info-value">${s.businessScope}</span></div>` : ''}
        </div>
        ${(mapImg || shopPhotoImg) ? `<div class="shop-images" style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">
          ${shopPhotoImg ? `<div style="flex:1; min-width:120px; text-align:center;"><div style="font-size:10px; color:#666; margin-bottom:4px;">店铺照片</div><img src="${shopPhotoImg}" style="max-width:180px; max-height:120px; object-fit:cover; border:1px solid #eee; padding:2px;" /></div>` : ''}
          ${mapImg ? `<div style="flex:1; min-width:120px; text-align:center;"><div style="font-size:10px; color:#666; margin-bottom:4px;">位置地图</div><img src="${mapImg}" style="max-width:180px; max-height:120px; object-fit:cover; border:1px solid #eee; padding:2px;" /></div>` : ''}
        </div>` : ''}
      </div>
    `;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>订单详情 - ${order.orderNo}</title>
        <style>
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
            line-height: 1.3;
            color: #333;
            background: #fff;
            max-width: 210mm;
            margin: 0 auto;
            padding: 0;
            font-size: 11px;
          }
          
          .print-container {
            border: 2px solid #1890ff;
            padding: 0;
          }
          
          .main-content {
            border-bottom: 2px solid #1890ff;
          }
          
          .info-section-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 0;
            border-bottom: 1px solid #e8e8e8;
          }
          
          .info-section-item {
            padding: 8px 10px;
            border-right: 1px solid #e8e8e8;
            break-inside: avoid;
          }
          
          .info-section-item:last-child {
            border-right: none;
          }
          
          .items-detail-section {
            padding: 8px 10px;
            background: #fff;
          }
          
          .header {
            padding: 8px 12px;
            border-bottom: 2px solid #1890ff;
            background: linear-gradient(to right, #e6f7ff, #f0f8ff);
          }
          
          .header-top {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          
          .header-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .logo {
            width: 30px;
            height: 30px;
            background: #ffa500;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          }
          
          .shop-name {
            font-size: 15px;
            font-weight: bold;
            color: #1890ff;
          }
          
          .header-title {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 2px;
          }
          
          .order-no {
            font-size: 14px;
            font-weight: bold;
            color: #1890ff;
          }
          
          .content-grid {
            display: block;
          }
          
          .section {
            padding: 8px 10px;
            border-bottom: 1px solid #e8e8e8;
            break-inside: avoid;
          }
          
          .section-full {
            grid-column: auto;
            border-top: 2px solid #1890ff;
            background: #fff;
            padding: 8px 10px;
            border-bottom: 1px solid #e8e8e8;
          }
          
          .section-full .section-title {
            font-size: 14px;
          }
          
          .section-full .info-row {
            font-size: 13px;
          }
          
          .section-full .label {
            font-size: 13px;
          }
          
          .section-full .value {
            font-size: 13px;
          }
          
          .section-full .value-highlight {
            font-size: 15px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 12px;
            color: #333;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e8e8e8;
          }
          
          .info-row {
            margin: 3px 0;
            display: flex;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .label {
            color: #666;
            min-width: 65px;
            flex-shrink: 0;
            font-size: 11px;
          }
          
          .value {
            color: #333;
            flex: 1;
            font-size: 11px;
          }
          
          .value-highlight {
            color: #1890ff;
            font-weight: bold;
            font-size: 12px;
          }
          
          .value-success {
            color: #52c41a;
            font-weight: bold;
          }
          
          .value-warning {
            color: #faad14;
            font-weight: bold;
          }
          
          .status-badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 600;
          }
          
          .status-success {
            background: #f6ffed;
            color: #52c41a;
            border: 1px solid #b7eb8f;
          }
          
          .status-warning {
            background: #fffbe6;
            color: #faad14;
            border: 1px solid #ffe58f;
          }
          
          .status-error {
            background: #fff2f0;
            color: #ff4d4f;
            border: 1px solid #ffccc7;
          }
          
          .status-info {
            background: #e6f7ff;
            color: #1890ff;
            border: 1px solid #91d5ff;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #ddd, transparent);
            margin: 8px 0;
          }
          
          .signature-area {
            margin-top: 0;
            margin-bottom: 10px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            page-break-inside: avoid;
          }
          
          .signature-box {
            text-align: center;
            padding: 8px;
            border: 1px dashed #ccc;
            border-radius: 3px;
            background: #fff;
          }
          
          .signature-label {
            color: #666;
            margin-bottom: 15px;
            font-weight: bold;
            font-size: 11px;
          }
          
          .signature-line {
            border-top: 1px solid #333;
            margin: 0 15px;
            padding-top: 4px;
            color: #999;
            font-size: 10px;
          }
          
          .shop-info {
            margin-top: 0;
            padding: 8px;
            background: #e6f7ff;
            border-radius: 3px;
            border: 1px solid #91d5ff;
          }
          
          .shop-info-title {
            font-weight: bold;
            font-size: 12px;
            color: #1890ff;
            margin-bottom: 6px;
            text-align: center;
            border-bottom: 1px solid #91d5ff;
            padding-bottom: 4px;
          }
          
          .shop-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px 8px;
            font-size: 10px;
          }
          
          .shop-info-item {
            display: flex;
            align-items: center;
          }
          
          .shop-info-label {
            font-weight: 600;
            color: #666;
            margin-right: 3px;
            white-space: nowrap;
          }
          
          .shop-info-value {
            color: #333;
          }
          
          .footer {
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px dashed #ddd;
            text-align: center;
            color: #999;
            font-size: 9px;
          }
          
          .footer-row {
            margin: 2px 0;
          }
          
          @media print {
            .section {
              background: #fff;
              border: 1px solid #eee;
            }
            .shop-info {
              background: #fff;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <!-- 头部 -->
          <div class="header">
            <div class="header-top">
              <div class="logo">👶</div>
              <div class="shop-name">乖宝宝儿童影楼</div>
            </div>
            <div class="header-bottom">
              <div class="header-title">订单详情</div>
              <div class="order-no">订单编号: ${order.orderNo}</div>
            </div>
          </div>
          
          <!-- 主内容区域 -->
          <div class="main-content">
            <!-- 第一横栏：客户信息、预约信息、套餐信息 -->
            <div class="info-section-row">
              <!-- 客户信息 -->
              <div class="info-section-item">
                <div class="section-title">客户信息</div>
                <div class="info-row">
                  <span class="label">客户姓名:</span>
                  <span class="value">${order.customerName || '未设置'}</span>
                </div>
                <div class="info-row">
                  <span class="label">联系电话:</span>
                  <span class="value value-highlight">📱 ${order.customerPhone || '未设置'}</span>
                </div>
                <div class="info-row">
                  <span class="label">操作人员:</span>
                  <span class="value">${order.user?.nickname || '-'}</span>
                </div>
              </div>

              <!-- 预约信息 -->
              <div class="info-section-item">
                <div class="section-title">预约信息</div>
                <div class="info-row">
                  <span class="label">预约日期:</span>
                  <span class="value value-highlight">📅 ${order.timeSlot && order.timeSlot.date ? dayjs(order.timeSlot.date).format('YYYY-MM-DD') : '2025-11-21'}</span>
                </div>
                <div class="info-row">
                  <span class="label">预约时间:</span>
                  <span class="value value-highlight">🕐 ${order.timeSlot && order.timeSlot.startTime && order.timeSlot.endTime ? `${dayjs.utc(order.timeSlot.startTime).local().format('HH:mm')} - ${dayjs.utc(order.timeSlot.endTime).local().format('HH:mm')}` : '12:00 - 13:00'}</span>
                </div>
                <div class="info-row">
                  <span class="label">组建人数:</span>
                  <span class="value">👶 ${order.childrenCount || 1} 人</span>
                </div>
              </div>
            
              <!-- 套餐信息 -->
              <div class="info-section-item">
                <div class="section-title">套餐信息</div>
                ${order.diyPackageId && order.diyPackage ? `
                <!-- DIY套系信息 -->
                <div class="info-row">
                  <span class="label">套系类型:</span>
                  <span class="value" style="color: #722ed1;">🎨 DIY套系</span>
                </div>
                <div class="info-row">
                  <span class="label">套系名称:</span>
                  <span class="value">${order.diyPackage.packageName}</span>
                </div>
                <div class="info-row">
                  <span class="label">原价:</span>
                  <span class="value">¥${Number(order.diyPackage.originalAmount || 0).toFixed(2)}</span>
                </div>
                <div class="info-row">
                  <span class="label">折扣:</span>
                  <span class="value" style="color: #ff4d4f;">-¥${Number(order.diyPackage.discountAmount || 0).toFixed(2)} </span>
                </div>
                <div class="info-row">
                  <span class="label">优惠后:</span>
                  <span class="value value-highlight">¥${(Number(order.diyPackage.originalAmount || 0) - Number(order.diyPackage.discountAmount || 0)).toFixed(2)}</span>
                </div>
                ` : `
                <!-- 普通套餐信息 -->
                <div class="info-row">
                  <span class="label">套餐名称:</span>
                  <span class="value">${order.package?.name || '暂无'}</span>
                </div>
                <div class="info-row">
                  <span class="label">套餐分类:</span>
                  <span class="value">${order.package?.category || '暂无'}</span>
                </div>
                <div class="info-row">
                  <span class="label">套餐价格:</span>
                  <span class="value">¥${order.package?.price || 0}</span>
                </div>
                ${order.package?.includes && order.package.includes.length > 0 ? `
                <div class="info-row">
                  <span class="label">服务内容:</span>
                  <span class="value">${order.package.includes.join('、')}</span>
                </div>
                ` : ''}
                `}
              </div>
            </div>
            
            <!-- 第二横栏：商品和服务明细 -->
            ${order.diyPackageId && order.diyPackage ? `
            <div class="items-detail-section">
              <div class="section-title">📦 商品和服务明细</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-top: 6px;">
              ${(() => {
                const products = order.diyPackage.selectedItems.filter((item: any) => item.type === 'product');
                const services = order.diyPackage.selectedItems.filter((item: any) => item.type === 'service');
                const items: any[] = [];
                
                // 计算最大行数
                const maxRows = Math.max(Math.ceil(products.length / 2), services.length);
                
                for (let i = 0; i < maxRows; i++) {
                  // 第一列：商品（左）
                  if (products[i * 2]) {
                    items.push({...products[i * 2], gridColumn: 1});
                  } else {
                    items.push({empty: true, gridColumn: 1});
                  }
                  
                  // 第二列：商品（中）
                  if (products[i * 2 + 1]) {
                    items.push({...products[i * 2 + 1], gridColumn: 2});
                  } else {
                    items.push({empty: true, gridColumn: 2});
                  }
                  
                  // 第三列：服务（右）
                  if (services[i]) {
                    items.push({...services[i], gridColumn: 3});
                  } else {
                    items.push({empty: true, gridColumn: 3});
                  }
                }
                
                return items.map((item: any) => {
                  if (item.empty) {
                    return `<div style="padding: 4px; background: transparent;"></div>`;
                  }
                  return `
                <div style="padding: 4px; background: ${item.type === 'product' ? '#f0f8ff' : '#f6ffed'}; border: 1px solid ${item.type === 'product' ? '#e6f7ff' : '#d9f7be'}; border-radius: 2px; font-size: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                    <div style="flex: 1;">
                      <span style="display: inline-block; padding: 0px 4px; background: ${item.type === 'product' ? '#1890ff' : '#52c41a'}; color: white; border-radius: 2px; font-size: 9px; margin-right: 3px;">
                        ${item.type === 'product' ? '商品' : '服务'}
                      </span>
                      <strong style="font-size: 10px;">${item.name}</strong>
                    </div>
                    <div style="font-weight: bold; font-size: 10px; color: #f50; white-space: nowrap; margin-left: 4px;">¥${Number(item.subtotal).toFixed(2)}</div>
                  </div>
                  <div style="color: #666; font-size: 9px; line-height: 1.3;">
                    单价: ¥${Number(item.price).toFixed(2)} × ${item.quantity}
                    ${item.specification ? ` | ${item.specification}` : ''}
                  </div>
                </div>
                  `;
                }).join('');
              })()}
              </div>
            </div>
            ` : ''}
          </div>
          
          <!-- 费用信息 -->
          <div class="section section-full">
            <div class="section-title">费用信息</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
              <div class="info-row">
                <span class="label">订单总额:</span>
                <span class="value value-highlight">¥${Number(order.totalAmount).toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="label">已付定金:</span>
                <span class="value ${Number(order.depositAmount) > 0 ? 'value-success' : ''}">¥${Number(order.depositAmount).toFixed(2)}</span>
              </div>
              <div class="info-row">
                <span class="label">已付金额:</span>
                <span class="value ${Number(order.paidAmount || 0) > 0 ? 'value-success' : ''}">¥${Number(order.paidAmount || 0).toFixed(2)}</span>
              </div>
              ${Number(order.refundedAmount || 0) > 0 ? `
                <div class="info-row">
                  <span class="label">已退款:</span>
                  <span class="value" style="color: #ff4d4f; font-weight: bold;">-¥${Number(order.refundedAmount).toFixed(2)}</span>
                </div>
              ` : ''}
              ${(() => {
                const totalAmount = Number(order.totalAmount);
                const paidAmount = Number(order.paidAmount || 0);
                const remaining = totalAmount - paidAmount;
                
                if (paidAmount > totalAmount) {
                  const overpaid = paidAmount - totalAmount;
                  return `
                    <div class="info-row">
                      <span class="label">多收款:</span>
                      <span class="value" style="color: #ff4d4f; font-weight: bold;">¥${overpaid.toFixed(2)}</span>
                    </div>
                  `;
                }
                return `
                  <div class="info-row">
                    <span class="label">待付尾款:</span>
                    <span class="value ${remaining > 0 ? 'value-warning' : 'value-success'}">¥${remaining.toFixed(2)}</span>
                  </div>
                `;
              })()}
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e8e8e8; display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px;">
              <div class="info-row">
                <span class="label">支付方式:</span>
                <span class="value">${getPaymentMethodText()}</span>
              </div>
              <div class="info-row">
                <span class="label">订单状态:</span>
                <span class="value">
                  <span class="status-badge ${getStatusClass(order.orderStatus as OrderStatus)}">
                    ${getStatusText(order.orderStatus as OrderStatus)}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="label">支付状态:</span>
                <span class="value">
                  <span class="status-badge ${getPaymentStatusClass(order.paymentStatus)}">
                    ${getPaymentStatusText(order.paymentStatus)}
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="label">创建时间:</span>
                <span class="value">${dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
              </div>
            </div>
          </div>
          
          ${order.notes ? `
          <div class="section" style="padding: 12px 15px; background: #fff; border-bottom: 1px solid #e8e8e8;">
            <div class="section-title">备注信息</div>
            <div class="info-row">
              <span class="value">${order.notes}  (ID: diy套系${String(order.diyPackageId).padStart(4, '0')})</span>
            </div>
          </div>
          ` : ''}
          
          <!-- 底部信息区 -->
          <div style="padding: 10px 12px; background: #fafafa;">
            <!-- 签名区域 -->
            <div class="signature-area">
              <div class="signature-box">
                <div class="signature-label">客户签名</div>
                <div class="signature-line">签名</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">工作人员签名</div>
                <div class="signature-line">签名</div>
              </div>
            </div>
            
            <!-- 店铺信息 -->
            <div class="shop-info">
              ${shopInfoHtml}
            </div>
            
            <div class="footer">
              <div class="footer-row">� 打印时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // 打开新窗口并打印
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('无法打开打印窗口，请检查浏览器设置');
      return;
    }
    printWindow.document.write(printContent);
    printWindow.document.close();

    // 等待图片加载（最多2秒）后再打印
    const images = printWindow.document.images;
    let loaded = 0;
    const total = images.length;
    const startTime = Date.now();
    if (total === 0) {
      doPrint();
    } else {
      for (let img of images) {
        if (img.complete) {
          loaded++;
          continue;
        }
        img.addEventListener('load', () => {
          loaded++;
          if (loaded === total) {
            doPrint();
          }
        });
        img.addEventListener('error', () => {
          loaded++;
          if (loaded === total) {
            doPrint();
          }
        });
      }
      // 超时兜底
      const check = () => {
        if (Date.now() - startTime > 2000) doPrint();
        else if (loaded === total) doPrint();
        else setTimeout(check, 200);
      };
      setTimeout(check, 200);
    }

    function doPrint() {
      if (!printWindow) return; // 冗余安全检查
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // 图片URL处理逻辑复用 (与设置页类似)
  const getImageUrl = (raw?: string) => {
    if (!raw) return '';
    // 若已是完整URL
    if (/^https?:\/\//.test(raw)) return raw;
    // 使用当前页面 origin（nginx 反向代理会自动转发到后端）
    const baseOrigin = window.location.origin;
    // 规范路径前缀
    if (raw.startsWith('/uploads/')) return baseOrigin + raw;
    if (raw.includes('/uploads/')) {
      const idx = raw.indexOf('/uploads/');
      return baseOrigin + raw.substring(idx);
    }
    return baseOrigin + (raw.startsWith('/') ? raw : `/${raw}`);
  };

  // 获取状态文本的辅助函数
  const getStatusText = (status: OrderStatus) => {
    const statusMap = {
      [OrderStatus.PENDING]: '待确认',
      [OrderStatus.CONFIRMED]: '已确认',
      [OrderStatus.REJECTED]: '已拒绝',
      [OrderStatus.IN_PROGRESS]: '进行中',
      [OrderStatus.COMPLETED]: '已完成',
      [OrderStatus.CANCELLED]: '已取消',
    };
    return statusMap[status] || status;
  };

  // 获取订单状态样式类
  const getStatusClass = (status: OrderStatus) => {
    const classMap = {
      [OrderStatus.PENDING]: 'status-warning',
      [OrderStatus.CONFIRMED]: 'status-info',
      [OrderStatus.REJECTED]: 'status-error',
      [OrderStatus.IN_PROGRESS]: 'status-info',
      [OrderStatus.COMPLETED]: 'status-success',
      [OrderStatus.CANCELLED]: 'status-error',
    };
    return classMap[status] || 'status-info';
  };

  const getPaymentStatusText = (status: string) => {
    const statusMap = {
      'PENDING_PAYMENT': '待支付',
      'PARTIAL_PAID': '部分支付',
      'FULLY_PAID': '已支付',
      'PAID': '已支付',
      'FAILED': '支付失败',
      'REFUNDING': '退款中',
      'REFUNDED': '已退款',
      'CANCELLED': '已取消',
      'FREE': '免费赠送',
      'OVERPAID': '多收款',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // 获取支付状态样式类
  const getPaymentStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      'PENDING_PAYMENT': 'status-warning',
      'PARTIAL_PAID': 'status-info',
      'FULLY_PAID': 'status-success',
      'PAID': 'status-success',
      'FAILED': 'status-error',
      'REFUNDING': 'status-warning',
      'REFUNDED': 'status-error',
      'CANCELLED': 'status-error',
      'FREE': 'status-info',       // 🔥 免费订单 - 蓝色信息样式
      'OVERPAID': 'status-error',  // 🔥 多收款 - 红色错误样式
    };
    return classMap[status] || 'status-info';
  };

  // 如果没有订单数据,显示错误提示而不是空白
  if (!order) {
    // 只在 visible 为 true 时才记录警告，避免重复日志
    if (visible) {
      console.warn('OrderDetail - 订单数据为空');
    }
    return (
      <Modal
        title="订单详情"
        open={visible}
        onCancel={onClose}
        footer={<Button type="primary" onClick={onClose}>关闭</Button>}
        width={900}
      >
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p style={{ fontSize: '16px', color: '#999' }}>订单数据加载失败或不存在</p>
        </div>
      </Modal>
    );
  }

  const statusConfig = {
    [OrderStatus.PENDING]: {
      color: "orange",
      text: "待确认",
      icon: <ClockCircleOutlined />,
    },
    [OrderStatus.CONFIRMED]: {
      color: "blue",
      text: "已确认",
      icon: <CheckCircleOutlined />,
    },
    [OrderStatus.IN_PROGRESS]: {
      color: "processing",
      text: "进行中",
      icon: <ClockCircleOutlined />,
    },
    [OrderStatus.COMPLETED]: {
      color: "green",
      text: "已完成",
      icon: <CheckCircleOutlined />,
    },
    [OrderStatus.CANCELLED]: {
      color: "red",
      text: "已取消",
      icon: <CloseCircleOutlined />,
    },
    [OrderStatus.REJECTED]: {
      color: "red",
      text: "已拒绝",
      icon: <CloseCircleOutlined />,
    },
  };

  return (
  <Modal
      className="order-detail-modal"
      title={
        <div
          style={{
            width: '100%',
      // cursor: 'move', // 去除拖拽光标
          }}
        >
          订单详情
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto'
        }
      }}
      footer={
        <Space>
          {/* 待支付或部分支付状态且订单未取消/未退款时显示收款按钮 */}
          {(() => {
            const paymentStatus = order?.paymentStatus || '';
            const orderStatus = order?.orderStatus || '';
            // PENDING_PAYMENT = 待支付, PARTIAL_PAID = 部分支付
            const showButton = ['PENDING_PAYMENT', 'PARTIAL_PAID'].includes(paymentStatus) && 
                              !['CANCELLED', 'REFUNDED'].includes(orderStatus);
            
            return showButton ? (
              <Button 
                type="primary"
                ghost
                icon={<MoneyCollectOutlined />}
                onClick={handleCollectBalance}
                style={{ fontSize: '15px' }}
              >
                {paymentStatus === 'PENDING_PAYMENT' ? '收款' : '收取尾款'}
              </Button>
            ) : null;
          })()}
          {/* 只有在已取消状态且有已支付金额时才显示申请退款按钮 */}
          {order?.orderStatus === 'CANCELLED' && 
           Number(order?.paidAmount || 0) > 0 && (
            <Button 
              danger
              icon={<RollbackOutlined />}
              onClick={handleApplyRefund}
              style={{ fontSize: '15px' }}
            >
              申请退款
            </Button>
          )}
          {['PENDING', 'CONFIRMED'].includes(order?.orderStatus || '') && (
            <Button
              icon={<SwapOutlined />}
              onClick={handleChangePackage}
              style={{ fontSize: '15px' }}
            >
              更换套餐
            </Button>
          )}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
            style={{ fontSize: '15px' }}
          >
            编辑
          </Button>
          <Button 
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            style={{ fontSize: '15px' }}
          >
            打印
          </Button>
          <Button onClick={onClose} style={{ fontSize: '15px' }}>
            关闭
          </Button>
        </Space>
      }
  // 移除拖拽包装
    >
      {/* 取消/退款状态警告提示 */}
      {(order.orderStatus === 'CANCELLED' || order.orderStatus === 'REFUNDED') && (
        <Alert
          message={order.orderStatus === 'CANCELLED' ? '订单已取消' : '订单已退款'}
          description={
            order.orderStatus === 'CANCELLED' && order.notes && order.notes.includes('取消原因') 
              ? (() => {
                  const match = order.notes.match(/取消原因:\s*(.+?)(?:\n|$)/);
                  return match ? `取消原因：${match[1]}` : '';
                })()
              : undefined
          }
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Card title="订单信息" style={{ marginBottom: 16, fontSize: '15px' }}>
        <Descriptions column={1} bordered style={{ fontSize: '15px' }}>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>订单号</span>}>
            <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: '15px' }}>
              {order.orderNo}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>订单状态</span>}>
            {(() => {
              const orderStatus = (order as any).orderStatus;
              const statusMap: { [key: string]: keyof typeof statusConfig } = {
                'PENDING': OrderStatus.PENDING,
                'CONFIRMED': OrderStatus.CONFIRMED,
                'COMPLETED': OrderStatus.COMPLETED,
                'CANCELLED': OrderStatus.CANCELLED,
                'IN_PROGRESS': OrderStatus.IN_PROGRESS,
                'REJECTED': OrderStatus.REJECTED,
              };
              const mappedStatus = statusMap[orderStatus] || OrderStatus.PENDING;
              const config = statusConfig[mappedStatus];
              return (
                <Tag color={config?.color} icon={config?.icon} style={{ fontSize: '14px' }}>
                  {config?.text || orderStatus}
                </Tag>
              );
            })()}
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>支付状态</span>}>
            {(() => {
              const paymentStatus = (order as any).paymentStatus;
              const paymentConfig: { [key: string]: { color: string; text: string } } = {
                'PENDING': { color: 'orange', text: '待支付' },
                'PENDING_PAYMENT': { color: 'orange', text: '待支付' },
                'PROCESSING': { color: 'blue', text: '处理中' },
                'PARTIAL': { color: 'gold', text: '部分支付' },
                'PARTIAL_PAID': { color: 'gold', text: '部分支付' },
                'FULLY_PAID': { color: 'green', text: '已支付' },
                'PAID': { color: 'green', text: '已支付' },
                'FAILED': { color: 'red', text: '支付失败' },
                'CANCELLED': { color: 'default', text: '已取消' },
                'REFUNDING': { color: 'purple', text: '退款中' },
                'REFUNDED': { color: 'purple', text: '已退款' },
              };
              const config = paymentConfig[paymentStatus] || { color: 'default', text: paymentStatus || '未知' };
              return <Tag color={config.color} style={{ fontSize: '14px' }}>{config.text}</Tag>;
            })()}
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>订单金额</span>}>
            <span
              style={{ fontSize: "16px", fontWeight: "bold", color: "#f50" }}
            >
              ¥{Number(order.totalAmount || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>已支付金额</span>}>
            <span style={{ fontSize: "16px", fontWeight: "bold", color: Number(order.paidAmount || 0) > 0 ? "#52c41a" : undefined }}>
              ¥{Number(order.paidAmount || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          {(order as any).refundedAmount > 0 && (
            <Descriptions.Item label={<span style={{ fontSize: '15px' }}>已退款金额</span>}>
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#ff4d4f" }}>
                -¥{Number((order as any).refundedAmount).toFixed(2)}
              </span>
            </Descriptions.Item>
          )}
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>未付款金额</span>}>
            <span style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: Number(order.totalAmount) - Number(order.paidAmount || 0) > 0 ? "#faad14" : "#52c41a"
            }}>
              ¥{(Number(order.totalAmount) - Number(order.paidAmount || 0)).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>支付方式</span>}>
            <span style={{ fontSize: '15px' }}>
            {(() => {
              if (!order.payments || order.payments.length === 0) return '-';
              
              const paymentTypeMap: Record<string, string> = {
                'DEPOSIT': '定金',
                'FINAL': '尾款',
                'FULL': '全款',
                'REFUND': '退款',
              };
              
              const paymentMethodMap: Record<string, string> = {
                'WECHAT_PAY': '微信支付',
                'CASH': '现金',
                'WECHAT_TRANSFER': '微信转账',
                'ALIPAY': '支付宝',
                'BANK_TRANSFER': '银行转账',
              };
              
              return order.payments
                .map((p: any) => {
                  const type = paymentTypeMap[p.paymentType] || p.paymentType;
                  const method = paymentMethodMap[p.paymentMethod] || p.paymentMethod;
                  return `${type}(${method})`;
                })
                .join(', ');
            })()}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>创建时间</span>}>
            <span style={{ fontSize: '15px' }}>
            {new Date(order.createdAt).toLocaleString()}
            </span>
          </Descriptions.Item>
          {order.orderStatus === 'CANCELLED' && (
            <Descriptions.Item label={<span style={{ fontSize: '15px' }}>取消时间</span>}>
              <span style={{ fontSize: '15px' }}>
              {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}
              </span>
            </Descriptions.Item>
          )}
          <Descriptions.Item label={<span style={{ fontSize: '15px' }}>备注</span>}>
            <span style={{ fontSize: '15px' }}>
            {order.notes || "-"}
            </span>
          </Descriptions.Item>
          {order.orderStatus === 'CANCELLED' && order.notes && order.notes.includes('取消原因') && (
            <Descriptions.Item label={<span style={{ fontSize: '15px' }}>取消原因</span>}>
              <span style={{ color: '#ff4d4f', fontSize: '15px' }}>
                {(() => {
                  const match = order.notes.match(/取消原因:\s*(.+?)(?:\n|$)/);
                  return match ? match[1] : order.notes;
                })()}
              </span>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card title="用户信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="客户姓名">
            {order.customerName || "未填写"}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            <Space>
              <PhoneOutlined />
              {order.customerPhone || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="操作人员">
            <Space>
              <UserOutlined />
              {order.user?.nickname || '-'}
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="套餐信息" style={{ marginBottom: 16 }}>
        {order.diyPackageId && order.diyPackage ? (
          // DIY套系信息
          <>
            <Descriptions column={2}>
              <Descriptions.Item label="套系类型">
                <Tag color="purple">DIY套系</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="套系名称">
                {order.diyPackage.packageName}
              </Descriptions.Item>
              <Descriptions.Item label="原价">
                ¥{Number(order.diyPackage.originalAmount || 0).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="折扣金额">
                <span style={{ color: '#ff4d4f' }}>
                  -¥{Number(order.diyPackage.discountAmount || 0).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="优惠后价格">
                <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '16px' }}>
                  ¥{(Number(order.diyPackage.originalAmount || 0) - Number(order.diyPackage.discountAmount || 0)).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="折扣率">
                {(order.diyPackage.discountRate * 100).toFixed(1)}%
              </Descriptions.Item>
            </Descriptions>

            {/* 商品和服务详细列表 */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 12 }}>商品和服务明细</h4>
              <Table
                dataSource={order.diyPackage.selectedItems}
                rowKey={(item) => `${item.type}-${item.id}`}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '类型',
                    dataIndex: 'type',
                    key: 'type',
                    width: 80,
                    render: (type: string) => (
                      <Tag color={type === 'product' ? 'blue' : 'green'}>
                        {type === 'product' ? '商品' : '服务'}
                      </Tag>
                    ),
                  },
                  {
                    title: '名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: any) => (
                      <Space>
                        {record.thumbnail && (
                          <img 
                            src={record.thumbnail} 
                            alt={name} 
                            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                          />
                        )}
                        <span>{name}</span>
                      </Space>
                    ),
                  },
                  {
                    title: '分类',
                    dataIndex: 'categoryName',
                    key: 'categoryName',
                    width: 100,
                  },
                  {
                    title: '规格',
                    dataIndex: 'specification',
                    key: 'specification',
                    width: 100,
                    render: (spec: string) => spec || '-',
                  },
                  {
                    title: '品牌',
                    dataIndex: 'brand',
                    key: 'brand',
                    width: 100,
                    render: (brand: string) => brand || '-',
                  },
                  {
                    title: '型号',
                    dataIndex: 'model',
                    key: 'model',
                    width: 100,
                    render: (model: string) => model || '-',
                  },
                  {
                    title: '单价',
                    dataIndex: 'price',
                    key: 'price',
                    width: 100,
                    align: 'right' as const,
                    render: (price: number) => `¥${Number(price).toFixed(2)}`,
                  },
                  {
                    title: '数量',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 80,
                    align: 'center' as const,
                  },
                  {
                    title: '小计',
                    dataIndex: 'subtotal',
                    key: 'subtotal',
                    width: 100,
                    align: 'right' as const,
                    render: (subtotal: number) => (
                      <span style={{ fontWeight: 'bold' }}>
                        ¥{Number(subtotal).toFixed(2)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </>
        ) : (
          // 普通套餐信息
          <Descriptions column={2}>
            <Descriptions.Item label="套餐名称">
              {order.package?.name}
            </Descriptions.Item>
            <Descriptions.Item label="套餐价格">
              ¥{Number(order.package?.price || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="服务内容" span={2}>
              {order.package?.includes && order.package.includes.length > 0 ? (
                <Space wrap>
                  {order.package.includes.map((service: string, index: number) => (
                    <Tag key={index} color="blue">{service}</Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="预约信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="预约日期">
            <Space>
              <CalendarOutlined />
              {order.timeSlot && order.timeSlot.date 
                ? dayjs(order.timeSlot.date).format('YYYY-MM-DD') 
                : "-"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="预约时间">
            {order.timeSlot && order.timeSlot.startTime && order.timeSlot.endTime
              ? `${dayjs.utc(order.timeSlot.startTime).local().format('HH:mm')} - ${dayjs.utc(order.timeSlot.endTime).local().format('HH:mm')}`
              : "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="订单流程" loading={loading}>
        <Timeline
          items={[
            {
              color: "blue",
              children: (
                <>
                  订单创建
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </>
              ),
            },
            ...timeline.map((item: OrderTimeline, index: number) => ({
              color: index === timeline.length - 1 ? "green" : "blue",
              children: (
                <>
                  {item.description}
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {item.operator} · {new Date(item.timestamp).toLocaleString()}
                  </div>
                </>
              ),
            })),
            ...(order.orderStatus === 'CANCELLED' ? [{
              color: "red",
              children: (
                <>
                  订单已取消
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}
                  </div>
                  {order.notes && order.notes.includes('取消原因') && (
                    <div style={{ fontSize: "12px", color: "#ff4d4f", marginTop: "4px" }}>
                      {(() => {
                        const match = order.notes.match(/取消原因:\s*(.+?)(?:\n|$)/);
                        return match ? `原因：${match[1]}` : '';
                      })()}
                    </div>
                  )}
                </>
              ),
            }] : []),
            ...(order.orderStatus === 'REFUNDED' ? [{
              color: "purple",
              children: (
                <>
                  订单已退款
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '-'}
                  </div>
                </>
              ),
            }] : []),
          ]}
        />
      </Card>

      {/* 退款历史 */}
      {refundHistory.length > 0 && (
        <Card title="退款历史">
          <Table
            dataSource={refundHistory}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: '退款编号',
                dataIndex: 'refundNo',
                key: 'refundNo',
              },
              {
                title: '退款类型',
                dataIndex: 'refundType',
                key: 'refundType',
                render: (type: string) => refundService.getTypeText(type as any),
              },
              {
                title: '退款金额',
                dataIndex: 'refundAmount',
                key: 'refundAmount',
                render: (amount: number) => `¥${Number(amount || 0).toFixed(2)}`,
              },
              {
                title: '退款方式',
                dataIndex: 'refundMethod',
                key: 'refundMethod',
                render: (method: string) => refundService.getMethodText(method as any),
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={refundService.getStatusColor(status as any)}>
                    {refundService.getStatusText(status as any)}
                  </Tag>
                ),
              },
              {
                title: '申请时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (date: string) => new Date(date).toLocaleString(),
              },
            ]}
          />
        </Card>
      )}
      
      {/* 编辑订单表单 */}
      <OrderForm
        visible={editFormVisible}
        order={order}
        onCancel={handleEditCancel}
        onSubmit={handleEditSubmit}
      />

      {/* 尾款收取弹窗 */}
      <BalanceCollectionModal
        visible={balanceModalVisible}
        orderId={order?.id}
        onCancel={handleBalanceCollectionCancel}
        onSuccess={handleBalanceCollectionSuccess}
      />

      {/* 退款申请弹窗 */}
      <RefundRequestModal
        visible={refundModalVisible}
        orderNo={order?.orderNo || ''}
        paidAmount={Number(order?.paidAmount || 0)}
        onCancel={handleRefundCancel}
        onSuccess={handleRefundSuccess}
      />

      {/* 更换套餐弹窗 */}
      <Modal
        title="更换套餐"
        open={changePkgModalVisible}
        onCancel={() => setChangePkgModalVisible(false)}
        footer={null}
        width={500}
      >
        <Spin spinning={changePkgLoading}>
          {allPackages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>暂无其他套餐</div>
          ) : (
            <List
              dataSource={allPackages}
              renderItem={(item: any) => (
                <List.Item
                  actions={[
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => handleConfirmChangePackage(item.id)}
                    >
                      选择
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={`¥${Number(item.price).toFixed(2)}`}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Modal>
    </Modal>
  );
};

export default OrderDetail;
