// 日期选择页
import { request } from '../../../utils/request';

interface DateInfo {
  date: string;
  available: boolean;
  remainingSlots: number;
  isPassed: boolean;
  isHoliday: boolean;
  priceMultiplier: number;
}

Page({
  data: {
    // 套系信息
    packageId: 0,
    packageInfo: null as any,

    // 日历数据
    currentYear: 0,
    currentMonth: 0,
    calendarDays: [] as any[],
    
    // 选中的日期
    selectedDate: '',
    
    // 可用日期数据
    availableDates: new Map<string, DateInfo>(),
    
    // 加载状态
    loading: false,
  },

  onLoad(options: any) {
    // 获取套系信息
    if (options.packageId) {
      const packageId = parseInt(options.packageId);
      let packageInfo = null;

      // 尝试从 packageInfo 参数解析
      if (options.packageInfo) {
        try {
          packageInfo = JSON.parse(decodeURIComponent(options.packageInfo));
        } catch (e) {
          console.error('解析套系信息失败:', e);
        }
      }

      this.setData({
        packageId,
        packageInfo
      });
    }

    // 初始化日历
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
    });

    this.loadAvailableDates();
  },

  /**
   * 加载可用日期
   */
  async loadAvailableDates() {
    try {
      this.setData({ loading: true });

      // 获取未来30天的可用时间段
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      console.log('📅 请求可用日期:', {
        startDate: this.formatDate(startDate),
        endDate: this.formatDate(endDate)
      });

      const res = await request<any>({
        url: '/time-slots/available',
        method: 'GET',
        needAuth: false,
        data: {
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
        }
      });

      console.log('📅 可用日期API响应:', res);

      // 处理响应数据 - request.ts返回的是直接的数据数组
      const dates = Array.isArray(res) ? res : [];
      console.log('📅 解析的日期数据:', dates.length, '条时间段');
      console.log('📅 第一条数据示例:', dates[0]);

      const availableDatesMap = new Map<string, DateInfo>();

      // 处理返回的可用日期数据 - 合并同一天的多个时间段
      if (Array.isArray(dates) && dates.length > 0) {
        dates.forEach((item: any) => {
          // 将ISO格式转为短格式: "2025-12-16T00:00:00.000Z" -> "2025-12-16"
          const isoDate = item.date;
          const dateStr = isoDate.split('T')[0];
          const isAvailable = !item.isBooked; // 未预订的才可用
          
          console.log(`📅 处理时间段 ${dateStr} - ${item.startTime} 预订状态:${item.isBooked}`);
          
          // 如果这一天已经存在，累加可用名额
          if (availableDatesMap.has(dateStr)) {
            const existing = availableDatesMap.get(dateStr)!;
            availableDatesMap.set(dateStr, {
              ...existing,
              available: existing.available || isAvailable,
              remainingSlots: existing.remainingSlots + (isAvailable ? 1 : 0),
            });
          } else {
            availableDatesMap.set(dateStr, {
              date: dateStr,
              available: isAvailable,
              remainingSlots: isAvailable ? 1 : 0,
              isPassed: false,
              isHoliday: item.isHoliday || false,
              priceMultiplier: item.priceMultiplier || 1.0,
            });
          }
        });
      }

      console.log('📅 可用日期Map:', availableDatesMap.size, '天');
      console.log('📅 Map内容:', Array.from(availableDatesMap.entries()));

      this.setData({ availableDates: availableDatesMap });
      this.generateCalendar();
    } catch (error) {
      console.error('❌ 加载可用日期失败:', error);
      wx.showToast({
        title: '加载日期失败',
        icon: 'none',
        duration: 2000
      });
      
      // 即使失败也生成日历,只是没有可用日期数据
      this.generateCalendar();
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 生成日历数据
   */
  generateCalendar() {
    const { currentYear, currentMonth } = this.data;
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayWeek = firstDay.getDay(); // 0-6, 0是周日

    const calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 填充前面的空白
    for (let i = 0; i < firstDayWeek; i++) {
      calendarDays.push({ day: 0, disabled: true });
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const dateStr = this.formatDate(date);
      const dateInfo = this.data.availableDates.get(dateStr);
      
      const isPassed = date < today;
      const available = !isPassed && dateInfo?.available;

      calendarDays.push({
        day,
        date: dateStr,
        disabled: !available || isPassed,
        isPassed,
        isToday: dateStr === this.formatDate(today),
        selected: dateStr === this.data.selectedDate,
        remainingSlots: dateInfo?.remainingSlots || 0,
        isHoliday: dateInfo?.isHoliday || false,
        priceMultiplier: dateInfo?.priceMultiplier || 1.0,
      });
    }

    this.setData({ calendarDays });
  },

  /**
   * 选择日期
   */
  onDateSelect(e: any) {
    const { date, disabled } = e.currentTarget.dataset;
    
    if (disabled) {
      wx.showToast({
        title: '该日期不可选',
        icon: 'none'
      });
      return;
    }

    this.setData({ selectedDate: date });
    this.generateCalendar();
  },

  /**
   * 上一月
   */
  onPrevMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
  },

  /**
   * 下一月
   */
  onNextMonth() {
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({ currentYear, currentMonth });
    this.generateCalendar();
  },

  /**
   * 确认日期，进入时间段选择
   */
  onConfirm() {
    if (!this.data.selectedDate) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      });
      return;
    }

    const dateInfo = this.data.availableDates.get(this.data.selectedDate);
    
    // 跳转到时间段选择页,传递套系信息
    wx.navigateTo({
      url: `/pages/booking/time/time?packageId=${this.data.packageId}&date=${this.data.selectedDate}&packageInfo=${encodeURIComponent(JSON.stringify(this.data.packageInfo))}`
    });
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 获取星期几
   */
  getWeekDay(dateStr: string): string {
    const date = new Date(dateStr);
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    return `周${weekDays[date.getDay()]}`;
  }
});
