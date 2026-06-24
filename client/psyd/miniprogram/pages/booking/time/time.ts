// pages/booking/time/time.ts
import { request } from '../../../utils/request';

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  maxBookings: number;
  currentBookings: number;
  isAvailable: boolean;
  isExpired?: boolean;
}

interface PackageInfo {
  id: number;
  name: string;
  price: number;
  depositAmount: number;
  duration_minutes: number;
  coverImage: string;
}

interface PageData {
  packageInfo: PackageInfo | null;
  selectedDate: string;
  dateDisplay: string;
  weekDay: string;
  timeSlots: TimeSlot[];
  morningSlots: TimeSlot[];
  afternoonSlots: TimeSlot[];
  eveningSlots: TimeSlot[];
  selectedSlotId: number | null;
  selectedSlotTime: string;
  loading: boolean;
  hasSlots: boolean;
}

Page({
  data: {
    packageInfo: null,
    selectedDate: '',
    dateDisplay: '',
    weekDay: '',
    timeSlots: [],
    morningSlots: [],
    afternoonSlots: [],
    eveningSlots: [],
    selectedSlotId: null,
    selectedSlotTime: '',
    loading: false,
    hasSlots: false
  } as PageData,

  onLoad(options: { packageId?: string; date?: string; packageInfo?: string }) {
    console.log('时间段选择页参数：', options);

    if (options.packageId && options.date) {
      // 解析套系信息
      if (options.packageInfo) {
        try {
          const packageInfo = JSON.parse(decodeURIComponent(options.packageInfo));
          this.setData({ packageInfo });
        } catch (error) {
          console.error('解析套系信息失败：', error);
        }
      }

      // 设置选中日期
      this.setData({
        selectedDate: options.date,
        dateDisplay: this.formatDate(options.date),
        weekDay: this.getWeekDay(options.date)
      });

      // 加载时间段数据
      this.loadTimeSlots(parseInt(options.packageId), options.date);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 加载时间段数据
   */
  async loadTimeSlots(packageId: number, date: string) {
    this.setData({ loading: true });

    try {
      const res = await request({
        url: `/time-slots/available?packageId=${packageId}&date=${date}`,
        method: 'GET',
        needAuth: false,
      });

      console.log('🕒 时间段API返回:', res);
      console.log('🕒 数据类型:', typeof res, '是否数组:', Array.isArray(res));
      if (Array.isArray(res) && res.length > 0) {
        console.log('🕒 第一条数据示例:', res[0]);
      }

      if (res && Array.isArray(res)) {
        const timeSlots = this.processTimeSlots(res);
        console.log('🕒 处理后的时间段:', timeSlots);
        
        this.setData({
          timeSlots,
          morningSlots: this.filterSlotsByPeriod(timeSlots, 'morning'),
          afternoonSlots: this.filterSlotsByPeriod(timeSlots, 'afternoon'),
          eveningSlots: this.filterSlotsByPeriod(timeSlots, 'evening'),
          hasSlots: timeSlots.length > 0,
          loading: false
        });
      } else {
        this.setData({
          timeSlots: [],
          morningSlots: [],
          afternoonSlots: [],
          eveningSlots: [],
          hasSlots: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载时间段失败：', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 处理时间段数据
   */
  processTimeSlots(slots: any[]): TimeSlot[] {
    const now = new Date();
    const selectedDate = new Date(this.data.selectedDate);
    const isToday = selectedDate.toDateString() === now.toDateString();

    return slots.map(slot => {
      // 将UTC时间转换为北京时间 HH:mm 格式
      const startTime = this.formatTimeToLocal(slot.startTime);
      const endTime = this.formatTimeToLocal(slot.endTime);
      
      // API返回的字段名是 bookedCount 和 capacity，不是 currentBookings 和 maxBookings
      const currentBookings = slot.bookedCount || 0;
      const maxBookings = slot.capacity || 0;
      const availableCount = slot.availableCount || 0;
      
      console.log(`🕒 ${startTime}-${endTime}: 可用=${availableCount}, 已订=${currentBookings}, 容量=${maxBookings}, 状态=${slot.status}`);
      
      // 判断是否可预约 - 使用availableCount字段
      let isAvailable = availableCount > 0 && slot.status === 'AVAILABLE';
      
      // 如果是今天，检查时间是否已过期
      let isExpired = false;
      if (isToday && startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const slotTime = new Date(now);
        slotTime.setHours(hours, minutes, 0, 0);
        isExpired = slotTime <= now;
        if (isExpired) {
          isAvailable = false;
        }
      }

      const result = {
        id: slot.id,
        startTime,
        endTime,
        maxBookings,
        currentBookings,
        isAvailable,
        isExpired
      };
      
      console.log(`🕒 结果: ${startTime}-${endTime} 可用=${isAvailable}, 过期=${isExpired}`);
      return result;
    });
  },

  /**
   * 将UTC时间转换为北京时间 HH:mm 格式
   */
  formatTimeToLocal(timeStr: string): string {
    if (!timeStr) return '';
    
    try {
      // 处理 ISO 时间格式: "1970-01-01T01:00:00.000Z"
      const date = new Date(timeStr);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('时间格式转换失败:', error);
      return timeStr;
    }
  },

  /**
   * 按时段筛选
   */
  filterSlotsByPeriod(slots: TimeSlot[], period: 'morning' | 'afternoon' | 'evening'): TimeSlot[] {
    return slots.filter(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (period === 'morning') {
        return hour >= 6 && hour < 12;
      } else if (period === 'afternoon') {
        return hour >= 12 && hour < 18;
      } else {
        return hour >= 18 || hour < 6;
      }
    });
  },

  /**
   * 选择时间段
   */
  selectTimeSlot(e: any) {
    const slotId = e.currentTarget.dataset.id;
    const slot = this.data.timeSlots.find(s => s.id === slotId);

    if (!slot) return;

    if (!slot.isAvailable) {
      wx.showToast({
        title: slot.isExpired ? '该时段已过期' : '该时段已满',
        icon: 'none'
      });
      return;
    }
    // 切换选中状态
    this.setData({
      selectedSlotId: this.data.selectedSlotId === slotId ? null : slotId,
      selectedSlotTime: this.data.selectedSlotId === slotId ? '' : `${slot.startTime} - ${slot.endTime}`
    });
  },

  /**
   * 确认选择
   */
  confirmSelection() {
    if (!this.data.selectedSlotId) {
      wx.showToast({
        title: '请选择时间段',
        icon: 'none'
      });
      return;
    }

    const selectedSlot = this.data.timeSlots.find(s => s.id === this.data.selectedSlotId);
    if (!selectedSlot) return;

    // 跳转到信息填写页
    wx.navigateTo({
      url: `/pages/booking/info/info?packageId=${this.data.packageInfo?.id}&date=${this.data.selectedDate}&slotId=${selectedSlot.id}&packageInfo=${encodeURIComponent(JSON.stringify(this.data.packageInfo))}&slotInfo=${encodeURIComponent(JSON.stringify(selectedSlot))}`
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    console.log('🔙 点击返回按钮');
    wx.navigateBack({
      delta: 1,
      success: () => {
        console.log('🔙 返回成功');
      },
      fail: (err) => {
        console.error('🔙 返回失败:', err);
        // 如果没有上一页，跳转到套系列表
        wx.switchTab({
          url: '/pages/packages/list/list'
        });
      }
    });
  },

  /**
   * 格式化日期显示
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  /**
   * 获取星期
   */
  getWeekDay(dateStr: string): string {
    const date = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
  }
});
