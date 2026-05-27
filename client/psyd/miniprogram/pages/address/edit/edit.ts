// 地址编辑页面
import { get, post, put } from '../../../utils/request';

interface AddressForm {
  receiverName: string; // 后端字段名
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
  isDefault: boolean;
}

interface AddressResponse {
  id: string;
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

Page({
  data: {
    id: null as string | null, // UUID
    form: {
      receiverName: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      postalCode: '',
      isDefault: false
    } as AddressForm,
    submitting: false
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadAddressDetail(options.id);
    }
  },

  /**
   * 加载地址详情
   */
  async loadAddressDetail(id: string) {
    try {
      // 调用后端 API
      const address = await get<AddressResponse>(`/wx-address/${id}`, {}, { showLoading: true });
      
      if (address) {
        this.setData({
          form: {
            receiverName: address.receiverName,
            phone: address.phone,
            province: address.province,
            city: address.city,
            district: address.district,
            detail: address.detail,
            postalCode: address.postalCode || '',
            isDefault: address.isDefault
          }
        });
      }
    } catch (error: any) {
      console.error('加载地址详情失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 输入姓名
   */
  onNameInput(e: any) {
    this.setData({
      'form.receiverName': e.detail.value
    });
  },

  /**
   * 输入电话
   */
  onPhoneInput(e: any) {
    this.setData({
      'form.phone': e.detail.value
    });
  },

  /**
   * 选择地区
   */
  onRegionChange(e: any) {
    const [province, city, district] = e.detail.value;
    this.setData({
      'form.province': province,
      'form.city': city,
      'form.district': district
    });
  },

  /**
   * 输入详细地址
   */
  onDetailInput(e: any) {
    this.setData({
      'form.detail': e.detail.value
    });
  },

  /**
   * 输入邮编
   */
  onPostalCodeInput(e: any) {
    this.setData({
      'form.postalCode': e.detail.value
    });
  },

  /**
   * 切换默认地址
   */
  onToggleDefault() {
    this.setData({
      'form.isDefault': !this.data.form.isDefault
    });
  },

  /**
   * 验证表单
   */
  validateForm(): boolean {
    const { receiverName, phone, province, detail, postalCode } = this.data.form;

    if (!receiverName || !receiverName.trim()) {
      wx.showToast({
        title: '请输入收货人姓名',
        icon: 'none'
      });
      return false;
    }

    // 姓名长度验证（2-50字符）
    if (receiverName.length < 2 || receiverName.length > 50) {
      wx.showToast({
        title: '姓名长度应为2-50个字符',
        icon: 'none'
      });
      return false;
    }

    if (!phone || !phone.trim()) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      });
      return false;
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号码格式不正确',
        icon: 'none'
      });
      return false;
    }

    if (!province) {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return false;
    }

    if (!detail || !detail.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return false;
    }

    // 详细地址长度验证（5-200字符）
    if (detail.length < 5 || detail.length > 200) {
      wx.showToast({
        title: '详细地址长度应为5-200个字符',
        icon: 'none'
      });
      return false;
    }

    // 邮编格式验证（可选）
    if (postalCode && postalCode.trim() && !/^\d{6}$/.test(postalCode)) {
      wx.showToast({
        title: '邮编格式不正确（6位数字）',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  /**
   * 保存地址
   */
  async onSave() {
    if (this.data.submitting) return;

    if (!this.validateForm()) {
      return;
    }

    this.setData({ submitting: true });

    try {
      const { id, form } = this.data;

      // 准备提交数据
      const submitData: AddressForm = {
        receiverName: form.receiverName.trim(),
        phone: form.phone.trim(),
        province: form.province,
        city: form.city,
        district: form.district,
        detail: form.detail.trim(),
        isDefault: form.isDefault
      };

      // 如果邮编有值，添加到提交数据
      if (form.postalCode && form.postalCode.trim()) {
        submitData.postalCode = form.postalCode.trim();
      }

      if (id) {
        // 更新地址
        await put<AddressResponse>(`/wx-address/${id}`, submitData, { showLoading: true });
      } else {
        // 新增地址
        await post<AddressResponse>('/wx-address', submitData, { showLoading: true });
      }

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error: any) {
      console.error('保存地址失败:', error);
      this.setData({ submitting: false });
      
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    }
  }
});
