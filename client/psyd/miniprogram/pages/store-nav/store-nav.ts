Page({
  data: {
    storeName: '乖宝宝儿童摄影',
    address: '辽宁省锦州市黑山县启发路与东内环路交叉路口往西约150米(大红嘉园东侧)',
    phone: '0416-5577456',
    mobile: '13841640830',
    latitude: 41.692690,
    longitude: 122.122332,
    businessHours: '周一至周日 08:00-18:00',
  },

  onNavigate() {
    wx.openLocation({
      latitude: this.data.latitude,
      longitude: this.data.longitude,
      name: this.data.storeName,
      address: this.data.address,
      scale: 18,
    });
  },

  onCall() {
    wx.makePhoneCall({ phoneNumber: this.data.phone });
  },

  onCallMobile() {
    wx.makePhoneCall({ phoneNumber: this.data.mobile });
  },

  onCopyAddress() {
    wx.setClipboardData({
      data: this.data.address,
      success: () => wx.showToast({ title: '地址已复制', icon: 'success' }),
    });
  },
});
