import { request } from './api';

export interface CouponItem {
  id: string;
  couponCode: string;
  couponName: string;
  couponType: string;
  discountType: string;
  discountValue: number;
  minAmount: number | null;
  maxDiscount: number | null;
  totalCount: number;
  usedCount: number;
  perUserLimit: number;
  applicableType: string;
  applicableIds: number[];
  startTime: string;
  endTime: string;
  status: string;
  description: string | null;
  createdAt: string;
}

export interface CouponFormData {
  couponCode: string;
  couponName: string;
  couponType: string;
  discountType: string;
  discountValue: number;
  minAmount?: number;
  maxDiscount?: number;
  totalCount: number;
  perUserLimit?: number;
  applicableType?: string;
  applicableIds?: number[];
  startTime: string;
  endTime: string;
  description?: string;
}

export const couponService = {
  getCoupons: async (params?: { page?: number; pageSize?: number; status?: string }) => {
    const res = await request.get<any>('/coupons', { params });
    return res.data;
  },

  getCouponById: (id: string) => request.get<any>(`/coupons/${id}`),

  createCoupon: (data: CouponFormData) => request.post('/coupons', data),

  updateCoupon: (id: string, data: Partial<CouponFormData>) => request.patch(`/coupons/${id}`, data),

  deleteCoupon: (id: string) => request.delete(`/coupons/${id}`),

  toggleStatus: (id: string, status: string) => request.patch(`/coupons/${id}`, { status }),
};
