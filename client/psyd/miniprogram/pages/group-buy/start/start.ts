import { request } from '../../../utils/request';

Page({
  data: {
    loading: false,
    packageId: 0,
    packageInfo: null as any,
    minCount: 3,
  },

  onLoad(options: any) {
    if (options.packageId) {
      this.setData({ packageId: parseInt(options.packageId) });
    }
    if (options.packageInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.packageInfo));
        this.setData({
          packageInfo: info,
          minCount: info.groupMinCount || 3,
        });
      } catch (e) {
        console.warn('解析套系信息失败', e);
      }
    }
  },

  onDecrease() {
    const val = Math.max(2, this.data.minCount - 1);
    this.setData({ minCount: val });
  },

  onIncrease() {
    const val = Math.min(10, this.data.minCount + 1);
    this.setData({ minCount: val });
  },

  async onStart() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res: any = await request({
        url: '/group-buy/start',
        method: 'POST',
        data: {
          packageId: this.data.packageId,
          minCount: this.data.minCount,
        },
      });

      const activityId = res?.data?.id;
      if (activityId) {
        wx.redirectTo({
          url: `/pages/group-buy/detail/detail?id=${activityId}`,
        });
      } else {
        wx.showToast({ title: '开团失败', icon: 'none' });
      }
    } catch (err: any) {
      console.error('开团失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },
});
