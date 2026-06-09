import config from '../../config/index';

Page({
  data: {
    loading: true,
    shop: {
      name: '乖宝宝儿童影楼',
      phone: '',
      address: '辽宁省锦州市黑山县启发路与东内环路交叉路口往西约150米(大红嘉园东侧)',
      businessHours: '09:00 - 18:00',
      description: '专注儿童摄影10年，用镜头记录每一份童真。我们拥有专业的摄影团队、温馨的拍摄环境、丰富的拍摄主题，为每一个家庭留下最珍贵的成长记忆。',
      shopPhoto: '',
      locationMap: '',
      latitude: 41.692690,
      longitude: 122.122332,
    },
    mapMarkers: [{
      id: 0,
      latitude: 41.692690,
      longitude: 122.122332,
      title: '乖宝宝儿童影楼',
      width: 30,
      height: 40,
    }],
    appVersion: '2.1.0',
  },

  onLoad() {
    this.loadShopInfo();
  },

  /** 将相对路径转为完整URL */
  resolveImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // 相对路径，拼接 API 基础地址
    const base = config.BASE_URL.replace('/api/v1', '');
    return base + url;
  },

  async loadShopInfo() {
    this.setData({ loading: true });
    try {
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/shop-info`,
          method: 'GET',
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200 && res.data) {
        const data = res.data.data || res.data;
        const lat = parseFloat(data.latitude) || this.data.shop.latitude;
        const lng = parseFloat(data.longitude) || this.data.shop.longitude;
        this.setData({
          shop: {
            name: data.name || this.data.shop.name,
            phone: data.phone || this.data.shop.phone,
            address: data.address || this.data.shop.address,
            businessHours: data.businessHours || data.business_hours || this.data.shop.businessHours,
            description: data.description || data.introduction || this.data.shop.description,
            shopPhoto: this.resolveImageUrl(data.shopPhoto || data.shopPhotoUrl || ''),
            locationMap: this.resolveImageUrl(data.locationMap || ''),
            latitude: lat,
            longitude: lng,
          },
          mapMarkers: [{
            id: 0,
            latitude: lat,
            longitude: lng,
            title: this.data.shop.name || '乖宝宝儿童影楼',
            width: 30,
            height: 40,
          }],
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      console.log('[AboutPage] 获取店铺信息失败，使用默认数据');
      this.setData({ loading: false });
    }
  },

  /** 拨打电话 */
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.shop.phone,
    });
  },

  /** 复制地址 */
  copyAddress() {
    wx.setClipboardData({
      data: this.data.shop.address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' });
      },
    });
  },

  /** 导航到店 */
  openMap() {
    const { address, latitude, longitude, name } = this.data.shop;
    if (!latitude || !longitude) {
      wx.showToast({ title: '店铺坐标未设置', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude,
      longitude,
      name: name || '乖宝宝儿童影楼',
      address: address || '',
      scale: 18,
    });
  },
});
