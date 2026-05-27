import { BaseEntity } from './common';

export enum TimeSlotStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export interface TimeSlot extends BaseEntity {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  availableCount: number;
  status: TimeSlotStatus;
  isHoliday: boolean;
  priceMultiplier: number;
  notes?: string;
  bookings?: TimeSlotBooking[];
}

export interface TimeSlotBooking {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userPhone: string;
  packageName: string;
  status: string;
  bookedAt: string;
}

export interface TimeSlotSearchParams {
  startDate?: string;
  endDate?: string;
  status?: TimeSlotStatus;
  isHoliday?: boolean;
  hasCapacity?: boolean;
  notes?: string;
}

export interface TimeSlotFormData {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  status: TimeSlotStatus;
  isHoliday: boolean;
  priceMultiplier: number;
  notes?: string;
}

export interface BatchCreateParams {
  startDate: string;
  endDate: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    capacity: number;
  }>;
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  priceMultiplier: number;
}

export interface TimeSlotStats {
  totalSlots: number;
  availableSlots: number;
  fullyBookedSlots: number;
  utilizationRate: number;
  avgBookingRate: number;
  peakHours: Array<{ time: string; rate: number }>;
}
