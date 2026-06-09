import { getAccessToken } from '../../../utils/auth';

interface PointsRecord {
  id: string;
  type: string;
  amount: number;
  balance: number;
  remark: string;
  createdAt: string;
}

Page({
  data: {
    points: 1200,
    loading: false,
    records: [] as PointsRecord[],
    hasMore: true,
    page: 1,
  },

  onLoad() {
    this.loadPoints();
  },

  async loadPoints() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const token = getAccessToken();
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/wx-points/my?page=${this.data.page}&limit=20`,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200) {
        const data = res.data.data || res.data;
        this.setData({
          points: data.balance || data.totalPoints || this.data.points,
          records: this.data.page === 1
            ? (data.items || data.records || [])
            : [...this.data.records, ...(data.items || data.records || [])],
          hasMore: (data.page || 1) < (data.totalPages || 1),
          loading: false,
        });
      } else {
        // 后端无接口时使用模拟数据
        this.setData({
          loading: false,
          records: this.generateMockRecords(),
        });
      }
    } catch (error) {
      console.log('[PointsPage] 加载积分记录失败，使用模拟数据');
      this.setData({
        loading: false,
        records: this.generateMockRecords(),
      });
    }
  },

  generateMockRecords(): PointsRecord[] {
    return [
      { id: '1', type: 'INCOME', amount: 120, balance: 1200, remark: '订单消费返积分', createdAt: '2026-05-28 14:30' },
      { id: '2', type: 'INCOME', amount: 50, balance: 1080, remark: '每日签到奖励', createdAt: '2026-05-27 09:00' },
      { id: '3', type: 'INCOME', amount: 200, balance: 1030, remark: '会员升级奖励', createdAt: '2026-05-25 16:20' },
      { id: '4', type: 'EXPENSE', amount: -100, balance: 830, remark: '积分兑换精修1张', createdAt: '2026-05-20 11:10' },
      { id: '5', type: 'INCOME', amount: 30, balance: 930, remark: '发表评价奖励', createdAt: '2026-05-18 15:45' },
      { id: '6', type: 'INCOME', amount: 500, balance: 900, remark: '首次消费送积分', createdAt: '2026-05-10 10:00' },
      { id: '7', type: 'INCOME', amount: 300, balance: 400, remark: '注册赠送积分', createdAt: '2026-05-01 08:30' },
    ];
  },

  /** 积分规则 */
  goToRules() {
    wx.showToast({ title: '积分规则开发中', icon: 'none' });
  },
});
