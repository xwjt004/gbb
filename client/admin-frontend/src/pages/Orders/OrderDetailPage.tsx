import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button } from 'antd';
import OrderDetail from './OrderDetail';
import { orderService } from '@/services/orders';
import { Order } from '@/types/order';

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    orderService.getOrder(id)
      .then((res: any) => {
        const raw = res?.data || res;
        // normalize backend shape to frontend Order shape
        const mapped: Order = {
          id: String(raw.id ?? raw._id ?? id),
          orderNo: raw.order_no || raw.orderNo || String(raw.id || id),
          totalAmount: raw.total_amount ?? raw.totalAmount ?? 0,
          depositAmount: raw.deposit_amount ?? raw.depositAmount ?? 0,
          paidAmount: raw.paid_amount ?? raw.paidAmount ?? 0,
          refundedAmount: Number(raw.refunded_amount ?? raw.refundedAmount ?? 0),
          createdAt: raw.created_at ?? raw.createdAt ?? '',
          updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? '',
          orderStatus: raw.order_status || raw.orderStatus || raw.status || '',
          paymentStatus: raw.payment_status || raw.paymentStatus || '',
          notes: raw.notes ?? raw.memo ?? '',
          childrenCount: raw.children_count ?? raw.childrenCount ?? 0,
          user: raw.user || (raw.user_id ? { id: raw.user_id, nickname: raw.user?.nickname || '', phone: raw.user?.phone || '' } : undefined),
          package: raw.package || (raw.package_id ? { id: raw.package_id, name: raw.package_name || '' } : undefined),
          timeSlot: raw.timeSlot || raw.time_slot || undefined,
        } as Order;
        setOrder(mapped);
      })
      .catch(() => setOrder(undefined))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin style={{ marginTop: 80 }} />;
  if (!order) return (
    <div style={{ marginTop: 80, textAlign: 'center' }}>
      未找到该订单 <Button onClick={() => navigate(-1)}>返回</Button>
    </div>
  );

  const handleEdit = (o: Order) => {
    navigate(`/orders/edit/${o.id}`);
  };

  const handleRefresh = () => {
    if (!id) return;
    setLoading(true);
    orderService.getOrder(id)
      .then((res: any) => {
        const raw = res?.data || res;
        const mapped: Order = {
          id: String(raw.id ?? raw._id ?? id),
          orderNo: raw.order_no || raw.orderNo || String(raw.id || id),
          totalAmount: raw.total_amount ?? raw.totalAmount ?? 0,
          depositAmount: raw.deposit_amount ?? raw.depositAmount ?? 0,
          paidAmount: raw.paid_amount ?? raw.paidAmount ?? 0,
          refundedAmount: Number(raw.refunded_amount ?? raw.refundedAmount ?? 0),
          createdAt: raw.created_at ?? raw.createdAt ?? '',
          updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? '',
          orderStatus: raw.order_status || raw.orderStatus || raw.status || '',
          paymentStatus: raw.payment_status || raw.paymentStatus || '',
          notes: raw.notes ?? raw.memo ?? '',
          childrenCount: raw.children_count ?? raw.childrenCount ?? 0,
          user: raw.user || (raw.user_id ? { id: raw.user_id, nickname: raw.user?.nickname || '', phone: raw.user?.phone || '' } : undefined),
          package: raw.package || (raw.package_id ? { id: raw.package_id, name: raw.package_name || '' } : undefined),
          timeSlot: raw.timeSlot || raw.time_slot || undefined,
        } as Order;
        setOrder(mapped);
      })
      .catch(() => setOrder(undefined))
      .finally(() => setLoading(false));
  };

  return <OrderDetail visible={true} order={order} onClose={() => navigate(-1)} onEdit={handleEdit} onRefresh={handleRefresh} />;
};

export default OrderDetailPage;
