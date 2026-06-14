import { getAccessToken, getUserInfo } from '../../../utils/auth';
import { get } from '../../../utils/request';

interface PointsRecord {
  id: string;
  type: string;
  amount: number;
  balance: number;
  reason: string;
  createdAt: string;
}

Page({
  data: {
    points: 0,
    loading: false,
    records: [] as PointsRecord[],
  },

  onLoad() {
    this.loadPoints();
  },

  async loadPoints() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const userInfo = getUserInfo();
      if (!userInfo?.id) throw new Error('未登录');
      const res: any = await get(`/wx-users/${userInfo.id}/points`);
      const d = res?.data || res || {};
      this.setData({
        points: d.balance || 0,
        records: (d.transactions || []).map((t: any) => ({
          ...t,
          amount: t.type === 'DEBIT' ? -t.amount : t.amount,
          createdAt: t.createdAt ? t.createdAt.slice(0, 16).replace('T', ' ') : '',
        })),
        loading: false,
      });
    } catch (error: any) {
      console.log('[PointsPage] 加载积分失败', error);
      this.setData({ loading: false });
    }
  },

  /** 联系客服 */
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '请拨打客服电话：0416-5577456',
      confirmText: '拨打',
      success: (r) => {
        if (r.confirm) wx.makePhoneCall({ phoneNumber: '0416-5577456' });
      },
    });
  },
});
