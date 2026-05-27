// 地址列表页面
import { get, del, patch } from '../../../utils/request';

interface Address {
  id: string; // 后端使用 UUID
  receiverName: string; // 后端字段名
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
    addresses: [] as Address[],
    loading: false,
    selectMode: false, // 是否为选择模式
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    console.log('地址列表页加载，参数:', options);
    
    // 判断是否为选择地址模式
    if (options.mode === 'select') {
      this.setData({ selectMode: true });
    }
    
    this.loadAddresses();
  },

  /**
   * 页面显示
   */
  onShow() {
    // 每次显示时刷新列表
    this.loadAddresses();
  },

  /**
   * 加载地址列表
   */
  async loadAddresses() {
    this.setData({ loading: true });

    try {
      // 调用后端 API
      const addresses = await get<Address[]>('/wx-address', {}, { showLoading: false });
      
      this.setData({
        addresses: addresses || [],
        loading: false
      });

      console.log('地址列表加载成功:', addresses);
    } catch (error: any) {
      console.error('加载地址列表失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择地址
   */
  onSelectAddress(e: any) {
    if (!this.data.selectMode) return;

    const { index } = e.currentTarget.dataset;
    const address = this.data.addresses[index];

    // 通过页面通信将地址返回给上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({ address });
      prevPage.calculateTotal && prevPage.calculateTotal();
    }

    wx.navigateBack();
  },

  /**
   * 设置默认地址
   */
  async onSetDefault(e: any) {
    const { id } = e.currentTarget.dataset;

    try {
      // 调用后端 API（使用 patch 方法）
      await patch(`/wx-address/${id}/default`, {}, { showLoading: true });

      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });

      this.loadAddresses();
    } catch (error: any) {
      console.error('设置默认地址失败:', error);
      wx.showToast({
        title: error.message || '设置失败',
        icon: 'none'
      });
    }
  },

  /**
   * 编辑地址
   */
  onEditAddress(e: any) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/address/edit/edit?id=${id}`
    });
  },

  /**
   * 删除地址
   */
  onDeleteAddress(e: any) {
    const { id } = e.currentTarget.dataset;

    wx.showModal({
      title: '提示',
      content: '确定删除该地址吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteAddress(id);
        }
      }
    });
  },

  /**
   * 删除地址
   */
  async deleteAddress(id: string) {
    try {
      // 调用后端 API
      await del(`/wx-address/${id}`, {}, { showLoading: true });

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      this.loadAddresses();
    } catch (error: any) {
      console.error('删除地址失败:', error);
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 新增地址
   */
  onAddAddress() {
    wx.navigateTo({
      url: '/pages/address/edit/edit'
    });
  }
});
