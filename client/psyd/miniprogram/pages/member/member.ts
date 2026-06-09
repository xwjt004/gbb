import { getAccessToken, getUserInfo } from '../../utils/auth';

const LEVEL_MAP: Record<string, { name: string; color: string; colors: string[]; icon: string }> = {
  ORDINARY: { name: '普通会员', color: '#A8A0A4', colors: ['#E8E4E6', '#D5CDD1'], icon: '🌱' },
  SILVER: { name: '银卡会员', color: '#8E9AAF', colors: ['#D5DDE8', '#B8C5D4'], icon: '🥈' },
  GOLD: { name: '金卡会员', color: '#D4AF37', colors: ['#F5E6B8', '#E8D08F'], icon: '🥇' },
  DIAMOND: { name: '钻石会员', color: '#7EC8E3', colors: ['#B9F2FF', '#7EC8E3'], icon: '💎' },
};

const ALL_BENEFITS = [
  { icon: '🎁', label: '专属优惠', desc: '会员等级折扣与专属满减券' },
  { icon: '📸', label: '免费加拍', desc: '每年赠送免费加拍张数' },
  { icon: '🚚', label: '免费配送', desc: '订单满额包邮服务' },
  { icon: '🎂', label: '生日礼遇', desc: '生日月赠送精修照片' },
  { icon: '💰', label: '多倍积分', desc: '消费享额外倍数积分' },
  { icon: '💫', label: '优先预约', desc: '热门档期优先预约权' },
  { icon: '🖼️', label: '升级礼包', desc: '升级礼包含相册/摆台' },
  { icon: '📞', label: '专属客服', desc: '一对一专属客服服务' },
];

Page({
  data: {
    member: {} as any,
    levelData: {} as any,
    allBenefits: ALL_BENEFITS,
    // 等级列表（用于底部等级展示）
    levels: [] as any[],
  },

  onLoad() {
    this.loadMemberInfo();
  },

  loadMemberInfo() {
    const userInfo = getUserInfo();
    const level = userInfo?.memberLevel || 'ORDINARY';
    const levelData = LEVEL_MAP[level] || LEVEL_MAP.ORDINARY;

    // 等级列表
    const levelKeys = ['ORDINARY', 'SILVER', 'GOLD', 'DIAMOND'];
    const levels = levelKeys.map((key, idx) => {
      const lv = LEVEL_MAP[key];
      const currentIdx = levelKeys.indexOf(level);
      return {
        key,
        name: lv.name,
        icon: lv.icon,
        color: lv.color,
        unlocked: idx <= currentIdx,
      };
    });

    this.setData({
      levelData,
      levels,
      member: {
        level,
        levelName: levelData.name,
        levelColors: levelData.colors,
        growthValue: 580,
        nextLevelName: level === 'ORDINARY' ? '银卡会员' : level === 'SILVER' ? '金卡会员' : level === 'GOLD' ? '钻石会员' : '',
        growthToNext: 1000,
        points: 1200,
        joinDays: 186,
      },
    });
  },

  /** 会员权益 */
  goToBenefits() {
    wx.navigateTo({ url: '/pages/member/benefits/benefits' });
  },

  /** 积分记录 */
  goToPoints() {
    wx.navigateTo({ url: '/pages/member/points/points' });
  },

  /** 查看全部等级 */
  goToLevels() {
    this.goToBenefits();
  },
});
