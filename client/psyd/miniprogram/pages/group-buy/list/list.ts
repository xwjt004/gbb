import { request } from '../../../utils/request';
import config from '../../../config/index';

Page({
  data: {
    loading: true,
    list: [],
    myUserId: '',
  },

  onShow() {
    this.loadList();
  },

  getFullImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = config.BASE_URL.replace('/api/v1', '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  },

  preprocessList(activities) {
    return (activities || []).map((item) => {
      const pkg = item.package || {};
      const images = pkg.images || [];
      return {
        ...item,
        _coverImg: this.getFullImageUrl(images[0] || ''),
      };
    });
  },

  async loadList() {
    try {
      this.setData({ loading: true });
      const userInfo = wx.getStorageSync('userInfo');
      const res = await request({
        url: '/group-buy/user/my',
        method: 'GET',
      });
      const activities = res?.data || res || [];
      this.setData({
        list: this.preprocessList(activities),
        myUserId: userInfo?.id || '',
      });
    } catch (err) {
      console.error('加载团购列表失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  goDetail(e) {
    const id = e.currentTarget?.dataset?.id || e;
    wx.navigateTo({ url: `/pages/group-buy/detail/detail?id=${id}` });
  },

  goStartGroupBuy() {
    wx.switchTab({ url: '/pages/packages/list/list' });
  },

  async onLeave(e) {
    const id = e.currentTarget?.dataset?.id;
    if (!id) return;

    const res = await new Promise((resolve) => {
      wx.showModal({
        title: '确认退团',
        content: '退团后需要重新参团，确定要退出吗？',
        success: (r) => resolve(r.confirm),
        fail: () => resolve(false),
      });
    });
    if (!res) return;

    try {
      await request({
        url: `/group-buy/${id}/leave`,
        method: 'POST',
      });
      wx.showToast({ title: '退团成功', icon: 'success' });
      this.loadList();
    } catch (err) {
      wx.showToast({ title: err.message || '退团失败', icon: 'none' });
    }
  },

  formatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hour}:${min}`;
  },

  noop() {},
});
