import { BaseEntity } from "./common";

export enum OrderStatus {
  PENDING = "PENDING",           // 待确认
  CONFIRMED = "CONFIRMED",       // 已确认
  REJECTED = "REJECTED",         // 已拒绝
  IN_PROGRESS = "IN_PROGRESS",   // 进行中
  COMPLETED = "COMPLETED",       // 已完成
  CANCELLED = "CANCELLED",       // 已取消
}

export interface Order extends BaseEntity {
  id: string;
  orderNo: string;
  userId: number;
  packageId?: number | null;
  diyPackageId?: number | null;
  timeSlotId: number;
  appointmentDate: string;
  totalAmount: string | number;
  depositAmount: string | number;
  paidAmount: string | number;
  paymentStatus: string; // PENDING, PAID, FAILED, REFUNDED, CANCELLED, CREATED
  orderStatus: string; // PENDING, CONFIRMED, COMPLETED, CANCELLED, IN_PROGRESS, REFUNDED
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  childrenCount: number;
  user: {
    id: number;
    openid: string;
    nickname: string;
    phone: string;
    avatar?: string;
    status: string;
  };
  package?: {
    id: number;
    name: string;
    description: string;
    price: string | number;
    deposit: string | number;
    durationMinutes: number;
    includes: string[];
    images: string[];
    category: string;
    tags: string[];
    status: string;
    isPopular: boolean;
  };
  diyPackage?: {
    id: number;
    packageName: string;
    selectedItems: Array<{
      id: number;
      type: 'product' | 'service';
      name: string;
      price: number;
      quantity: number;
      subtotal: number;
      thumbnail?: string;
      brand?: string;
      model?: string;
      categoryName?: string;
      specification?: string;
    }>;
    originalAmount: number;
    discountAmount: number;
    discountRate: number;
    savedAmount: number;
    status: string;
  };
  timeSlot: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    bookedCount: number;
    availableCount: number;
    status: string;
    isHoliday: boolean;
    priceMultiplier: number;
    notes?: string;
    isBooked: boolean;
  };
  refundedAmount?: number;
  payments: any[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderSearchParams {
  orderNo?: string;
  phone?: string;
  status?: OrderStatus;
  paymentStatus?: string;
  packageId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  dateRange?: [string, string];
  keyword?: string;
}

export interface OrderFormData {
  userId: string;
  packageId: string;
  timeSlotId: string;
  totalAmount?: number;
  depositAmount?: number;
  customerName?: string;
  customerPhone?: string;
  childrenCount?: number;
  notes?: string;
  paymentType?: 'DEPOSIT' | 'FULL';
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  todayOrders: number;
  conversionRate: number;
}

export interface OrderTimeline {
  timestamp: string;
  action: string;
  operator: string;
  description: string;
}
