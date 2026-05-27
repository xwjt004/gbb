// pages/booking/info/info.ts
import { request } from '../../../utils/request';

interface PackageInfo {
  id: number;
  name: string;
  price: number;
  depositAmount: number;
  duration: number;
  image: string;
}

interface TimeSlotInfo {
  id: number;
  startTime: string;
  endTime: string;
}

interface FormData {
  childrenCount: number;
  contactName: string;
  contactPhone: string;
  notes: string;
}

interface PageData extends FormData {
  packageInfo: PackageInfo | null;
  selectedDate: string;
  dateDisplay: string;
  weekDay: string;
  slotInfo: TimeSlotInfo | null;
  nameError: string;
  phoneError: string;
}

Page({
  data: {
    packageInfo: null,
    selectedDate: '',
    dateDisplay: '',
    weekDay: '',
    slotInfo: null,
    childrenCount: 1,
    contactName: '',
    contactPhone: '',
    notes: '',
    nameError: '',
    phoneError: ''
  } as PageData,

  onLoad(options: { packageId?: string; date?: string; slotId?: string; packageInfo?: string; slotInfo?: string }) {
    console.log('信息填写页参数：', options);

    if (options.packageId && options.date && options.slotId) {
      // 解析套系信息
      if (options.packageInfo) {
        try {
          const packageInfo = JSON.parse(decodeURIComponent(options.packageInfo));
          this.setData({ packageInfo });
        } catch (error) {
          console.error('解析套系信息失败：', error);
        }
      }

      // 解析时间段信息
      if (options.slotInfo) {
        try {
          const slotInfo = JSON.parse(decodeURIComponent(options.slotInfo));
          this.setData({ slotInfo });
        } catch (error) {
          console.error('解析时间段信息失败：', error);
        }
      }

      // 设置选中日期
      this.setData({
        selectedDate: options.date,
        dateDisplay: this.formatDate(options.date),
        weekDay: this.getWeekDay(options.date)
      });

      // 尝试从缓存加载用户信息
      this.loadUserInfo();
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
   * 从缓存加载用户信息
   */
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('lastBookingInfo');
      if (userInfo) {
        this.setData({
          contactName: userInfo.contactName || '',
          contactPhone: userInfo.contactPhone || ''
        });
      }
    } catch (error) {
      console.log('加载用户信息失败：', error);
    }
  },

  /**
   * 增加儿童数量
   */
  increaseChildren() {
    if (this.data.childrenCount < 10) {
      this.setData({
        childrenCount: this.data.childrenCount + 1
      });
    }
  },

  /**
   * 减少儿童数量
   */
  decreaseChildren() {
    if (this.data.childrenCount > 1) {
      this.setData({
        childrenCount: this.data.childrenCount - 1
      });
    }
  },

  /**
   * 输入姓名
   */
  onNameInput(e: any) {
    const value = e.detail.value.trim();
    this.setData({
      contactName: value,
      nameError: ''
    });
  },

  /**
   * 姓名失焦验证
   */
  onNameBlur() {
    const name = this.data.contactName.trim();
    if (!name) {
      this.setData({
        nameError: '请输入联系人姓名'
      });
    } else if (name.length < 2) {
      this.setData({
        nameError: '姓名至少2个字符'
      });
    }
  },

  /**
   * 输入电话
   */
  onPhoneInput(e: any) {
    const value = e.detail.value.trim();
    this.setData({
      contactPhone: value,
      phoneError: ''
    });
  },

  /**
   * 电话失焦验证
   */
  onPhoneBlur() {
    const phone = this.data.contactPhone.trim();
    if (!phone) {
      this.setData({
        phoneError: '请输入联系电话'
      });
    } else if (!this.validatePhone(phone)) {
      this.setData({
        phoneError: '请输入正确的手机号码'
      });
    }
  },

  /**
   * 输入备注
   */
  onNotesInput(e: any) {
    this.setData({
      notes: e.detail.value
    });
  },

  /**
   * 验证手机号
   */
  validatePhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone);
  },

  /**
   * 验证表单
   */
  validateForm(): boolean {
    const { contactName, contactPhone, childrenCount } = this.data;

    // 验证儿童数量
    if (childrenCount < 1) {
      wx.showToast({
        title: '儿童数量至少为1',
        icon: 'none'
      });
      return false;
    }

    // 验证姓名
    if (!contactName.trim()) {
      this.setData({ nameError: '请输入联系人姓名' });
      return false;
    }

    if (contactName.trim().length < 2) {
      this.setData({ nameError: '姓名至少2个字符' });
      return false;
    }

    // 验证电话
    if (!contactPhone.trim()) {
      this.setData({ phoneError: '请输入联系电话' });
      return false;
    }

    if (!this.validatePhone(contactPhone.trim())) {
      this.setData({ phoneError: '请输入正确的手机号码' });
      return false;
    }

    return true;
  },

  /**
   * 提交表单
   */
  submitForm() {
    // 验证表单
    if (!this.validateForm()) {
      return;
    }

    // 保存用户信息到缓存
    try {
      wx.setStorageSync('lastBookingInfo', {
        contactName: this.data.contactName.trim(),
        contactPhone: this.data.contactPhone.trim()
      });
    } catch (error) {
      console.log('保存用户信息失败：', error);
    }

    // 准备预约数据
    const bookingData = {
      packageId: this.data.packageInfo?.id,
      packageInfo: this.data.packageInfo,
      date: this.data.selectedDate,
      dateDisplay: this.data.dateDisplay,
      weekDay: this.data.weekDay,
      slotId: this.data.slotInfo?.id,
      slotInfo: this.data.slotInfo,
      childrenCount: this.data.childrenCount,
      contactName: this.data.contactName.trim(),
      contactPhone: this.data.contactPhone.trim(),
      notes: this.data.notes.trim()
    };

    // 跳转到确认页
    wx.navigateTo({
      url: `/pages/booking/confirm/confirm?data=${encodeURIComponent(JSON.stringify(bookingData))}`
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
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
