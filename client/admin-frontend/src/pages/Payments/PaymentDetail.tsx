import React from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Timeline,
  Card,
  Space,
  Button,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UndoOutlined,
  SyncOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Payment, PaymentStatus, PaymentMethod } from '@/types/payment';

interface PaymentDetailProps {
  visible: boolean;
  payment?: Payment;
  onClose: () => void;
}

const PaymentDetail: React.FC<PaymentDetailProps> = ({
  visible,
  payment,
  onClose,
}) => {
  if (!payment) return null;

  const statusConfig: Record<PaymentStatus, { color: string; text: string; icon: React.ReactNode }> = {
    [PaymentStatus.PENDING_PAYMENT]: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
    [PaymentStatus.PARTIAL_PAID]: { color: 'blue', text: '部分支付', icon: <ClockCircleOutlined /> },
    [PaymentStatus.PENDING]: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
    [PaymentStatus.PROCESSING]: { color: 'blue', text: '处理中', icon: <SyncOutlined spin /> },
    [PaymentStatus.PAID]: { color: 'green', text: '支付成功', icon: <CheckCircleOutlined /> },
    [PaymentStatus.FAILED]: { color: 'red', text: '支付失败', icon: <CloseCircleOutlined /> },
    [PaymentStatus.CANCELLED]: { color: 'default', text: '已取消', icon: <CloseCircleOutlined /> },
    [PaymentStatus.REFUNDING]: { color: 'orange', text: '退款中', icon: <SyncOutlined spin /> },
    [PaymentStatus.REFUNDED]: { color: 'purple', text: '已退款', icon: <UndoOutlined /> },
  };

  const methodConfig: Record<string, string> = {
    [PaymentMethod.WECHAT]: '微信支付',
    [PaymentMethod.ALIPAY]: '支付宝',
    [PaymentMethod.CASH]: '现金',
    [PaymentMethod.BANK_TRANSFER]: '银行卡',
  };

  const handlePrint = () => {
    if (!payment) return;

    // 创建打印内容
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>支付凭证 - ${payment.paymentNo}</title>
        <style>
          body { 
            font-family: "Microsoft YaHei", Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #1890ff;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1890ff;
            margin: 0;
            font-size: 28px;
          }
          .header h2 {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 18px;
            font-weight: normal;
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section-title { 
            font-weight: bold; 
            font-size: 16px;
            margin-bottom: 15px; 
            border-bottom: 1px solid #d9d9d9; 
            padding-bottom: 8px;
            color: #1890ff;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-row { 
            margin: 10px 0; 
            padding: 8px;
            background: #fafafa;
            border-radius: 4px;
          }
          .label { 
            font-weight: bold; 
            display: inline-block; 
            width: 120px; 
            color: #666;
          }
          .value {
            color: #333;
          }
          .amount {
            font-size: 18px;
            font-weight: bold;
            color: #f5222d;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .status-success { background-color: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
          .status-pending { background-color: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
          .status-failed { background-color: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
          .status-refunded { background-color: #f9f0ff; color: #722ed1; border: 1px solid #d3adf7; }
          .timeline {
            margin: 15px 0;
          }
          .timeline-item {
            margin: 10px 0;
            padding: 8px 0;
            border-left: 2px solid #1890ff;
            padding-left: 15px;
          }
          .timeline-time {
            font-size: 12px;
            color: #999;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 12px; 
            color: #999; 
            border-top: 1px solid #d9d9d9;
            padding-top: 20px;
          }
          .qr-note {
            background: #e6f7ff;
            border: 1px solid #91d5ff;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎈 乖宝宝儿童影楼</h1>
          <h2>支付凭证</h2>
        </div>
        
        <div class="section">
          <div class="section-title">💳 支付信息</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="label">支付单号:</span>
              <span class="value" style="font-family: monospace; font-weight: bold;">${payment.paymentNo}</span>
            </div>
            <div class="info-row">
              <span class="label">支付状态:</span>
              <span class="status ${getStatusClass(payment.status)}">${statusConfig[payment.status]?.text}</span>
            </div>
            <div class="info-row">
              <span class="label">支付方式:</span>
              <span class="value">${payment.method ? methodConfig[payment.method] : '未支付'}</span>
            </div>
            <div class="info-row">
              <span class="label">创建时间:</span>
              <span class="value">${new Date(payment.createdAt).toLocaleString()}</span>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-row">
              <span class="label">支付金额:</span>
              <span class="amount">¥${Number(payment.amount || 0).toFixed(2)}</span>
            </div>
            <div class="info-row">
              <span class="label">实付金额:</span>
              <span class="amount">¥${Number(payment.actualAmount || 0).toFixed(2)}</span>
            </div>
            ${Number(payment.refundAmount || 0) > 0 ? `
            <div class="info-row">
              <span class="label">退款金额:</span>
              <span class="value" style="color: #f5222d;">¥${Number(payment.refundAmount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            ${payment.thirdPartyId ? `
            <div class="info-row">
              <span class="label">第三方交易号:</span>
              <span class="value" style="font-family: monospace; font-size: 12px;">${payment.thirdPartyId}</span>
            </div>
            ` : ''}
          </div>
          
          ${payment.processedAt ? `
          <div class="info-row">
            <span class="label">支付时间:</span>
            <span class="value">${new Date(payment.processedAt).toLocaleString()}</span>
          </div>
          ` : ''}
          
          ${payment.notes ? `
          <div class="info-row" style="grid-column: span 2;">
            <span class="label">备注:</span>
            <span class="value">${payment.notes}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">📋 关联订单信息</div>
          <div class="info-grid">
            <div class="info-row">
              <span class="label">订单号:</span>
              <span class="value" style="font-family: monospace; font-weight: bold;">${payment.order?.orderNo || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">客户手机:</span>
              <span class="value">${payment.user?.phone || '-'}</span>
            </div>
            ${payment.user?.nickname ? `
            <div class="info-row">
              <span class="label">客户昵称:</span>
              <span class="value">${payment.user.nickname}</span>
            </div>
            ` : ''}
            ${payment.order?.totalAmount ? `
            <div class="info-row">
              <span class="label">订单总额:</span>
              <span class="value">¥${Number(payment.order.totalAmount).toFixed(2)}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">⏰ 操作记录</div>
          <div class="timeline">
            <div class="timeline-item">
              <div>💡 支付单创建</div>
              <div class="timeline-time">${new Date(payment.createdAt).toLocaleString()}</div>
            </div>
            ${payment.processedAt ? `
            <div class="timeline-item">
              <div>✅ 支付完成</div>
              <div class="timeline-time">${new Date(payment.processedAt).toLocaleString()}</div>
            </div>
            ` : ''}
            ${payment.refundedAt ? `
            <div class="timeline-item">
              <div>↩️ 退款完成</div>
              <div class="timeline-time">${new Date(payment.refundedAt).toLocaleString()}</div>
            </div>
            ` : ''}
          </div>
        </div>
        
        ${payment.refundReason ? `
        <div class="section">
          <div class="section-title">📝 退款信息</div>
          <div class="info-row">
            <span class="label">退款原因:</span>
            <span class="value">${payment.refundReason}</span>
          </div>
        </div>
        ` : ''}
        
        <div class="qr-note">
          <strong>🔍 支付凭证查询</strong><br>
          如有疑问，请联系客服或访问门店进行查询核实<br>
          支付单号: ${payment.paymentNo}
        </div>
        
        <div class="footer">
          <p><strong>打印时间:</strong> ${new Date().toLocaleString()}</p>
          <p>🎈 乖宝宝儿童影楼 - 记录每一个美好瞬间</p>
          <p>📍 地址: [门店地址] | 📞 电话: [客服电话] | 🌐 官网: [官方网站]</p>
          <p style="margin-top: 15px; font-size: 10px; color: #ccc;">
            此凭证为系统自动生成，具有法律效力。如有争议，请以系统记录为准。
          </p>
        </div>
      </body>
      </html>
    `;

    // 获取状态样式类
    function getStatusClass(status: PaymentStatus): string {
      switch (status) {
        case PaymentStatus.PAID:
          return 'status-success';
        case PaymentStatus.PENDING:
        case PaymentStatus.PROCESSING:
          return 'status-pending';
        case PaymentStatus.FAILED:
        case PaymentStatus.CANCELLED:
          return 'status-failed';
        case PaymentStatus.REFUNDED:
        case PaymentStatus.REFUNDING:
          return 'status-refunded';
        default:
          return 'status-pending';
      }
    }

    // 打开新窗口并打印
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // 等待内容加载完成后打印
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        
        // 打印完成后关闭窗口
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };
      
      message.success('支付凭证准备完成，请确认打印');
    } else {
      message.error('无法打开打印窗口，请检查浏览器设置');
    }
  };

  return (
    <Drawer
      title="支付详情"
      placement="right"
      size="large"
      onClose={onClose}
      open={visible}
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            打印凭证
          </Button>
        </Space>
      }
    >
      <Card title="支付信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="支付单号" span={2}>
            <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {payment.paymentNo}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="支付状态">
            <Tag 
              color={statusConfig[payment.status]?.color} 
              icon={statusConfig[payment.status]?.icon}
            >
              {statusConfig[payment.status]?.text}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="支付方式">
            {payment.method ? methodConfig[payment.method] : '未支付'}
          </Descriptions.Item>
          <Descriptions.Item label="支付金额">
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f50' }}>
              ¥{Number(payment.amount || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="实付金额">
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
              ¥{Number(payment.actualAmount || 0).toFixed(2)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="第三方交易号">
            {payment.thirdPartyId || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="支付时间">
            {payment.processedAt ? new Date(payment.processedAt).toLocaleString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="退款金额">
            ¥{Number(payment.refundAmount || 0).toFixed(2)}
          </Descriptions.Item>
          <Descriptions.Item label="退款原因">
            {payment.refundReason || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {payment.notes || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="关联订单信息" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="订单号">
            {payment.order?.orderNo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="用户手机号">
            {payment.user?.phone || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="操作记录">
        <Timeline
          items={[
            {
              color: 'blue',
              children: (
                <div>
                  支付单创建
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(payment.createdAt).toLocaleString()}
                  </div>
                </div>
              ),
            },
            ...(payment.processedAt ? [{
              color: 'green' as const,
              children: (
                <div>
                  支付完成
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(payment.processedAt).toLocaleString()}
                  </div>
                </div>
              ),
            }] : []),
            ...(payment.refundedAt ? [{
              color: 'red' as const,
              children: (
                <div>
                  退款完成
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(payment.refundedAt).toLocaleString()}
                  </div>
                </div>
              ),
            }] : []),
          ]}
        />
      </Card>
    </Drawer>
  );
};

export default PaymentDetail;
