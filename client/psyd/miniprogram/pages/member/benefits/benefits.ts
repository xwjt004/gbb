import { getUserInfo } from '../../../utils/auth';

const LEVELS = [
  {
    key: 'ORDINARY',
    name: '普通会员',
    icon: '🌱',
    color: '#A8A0A4',
    bgColor: '#F5F0F2',
    requirement: '注册即享',
    benefits: [
      { icon: '🎁', label: '注册礼遇', desc: '注册即送100积分' },
      { icon: '📸', label: '基础拍摄', desc: '享受标准拍摄服务' },
      { icon: '🎂', label: '生日关怀', desc: '生日月赠送精修1张' },
    ],
  },
  {
    key: 'SILVER',
    name: '银卡会员',
    icon: '🥈',
    color: '#8E9AAF',
    bgColor: '#EEF1F5',
    requirement: '累计消费满1000元\n或成长值达1000',
    benefits: [
      { icon: '🎁', label: '专属98折', desc: '全场消费享98折优惠' },
      { icon: '📸', label: '免费加拍5张', desc: '每年1次免费加拍5张' },
      { icon: '🚚', label: '满299包邮', desc: '订单满299元包邮' },
      { icon: '🎂', label: '生日礼遇', desc: '生日月赠送精修2张' },
      { icon: '💰', label: '1.5倍积分', desc: '消费享1.5倍积分' },
    ],
  },
  {
    key: 'GOLD',
    name: '金卡会员',
    icon: '🥇',
    color: '#D4AF37',
    bgColor: '#FDF6E3',
    requirement: '累计消费满3000元\n或成长值达3000',
    benefits: [
      { icon: '🎁', label: '专属95折', desc: '全场消费享95折优惠' },
      { icon: '📸', label: '免费加拍10张', desc: '每年2次免费加拍10张' },
      { icon: '🚚', label: '免费配送', desc: '全场免邮' },
      { icon: '🎂', label: '生日礼遇', desc: '生日月赠送精修4张+摆台' },
      { icon: '💰', label: '2倍积分', desc: '消费享2倍积分' },
      { icon: '💫', label: '优先预约', desc: '热门档期优先预约' },
      { icon: '🖼️', label: '升级礼包', desc: '升级送8寸相册一本' },
    ],
  },
  {
    key: 'DIAMOND',
    name: '钻石会员',
    icon: '💎',
    color: '#7EC8E3',
    bgColor: '#E8F7FD',
    requirement: '累计消费满8000元\n或成长值达8000',
    benefits: [
      { icon: '🎁', label: '专属9折', desc: '全场消费享9折优惠' },
      { icon: '📸', label: '免费加拍20张', desc: '每年4次免费加拍20张' },
      { icon: '🚚', label: '免费配送', desc: '全场免邮' },
      { icon: '🎂', label: '生日礼遇', desc: '生日月赠送精修6张+摆台+相框' },
      { icon: '💰', label: '3倍积分', desc: '消费享3倍积分' },
      { icon: '💫', label: '优先预约', desc: '专属客服优先排期' },
      { icon: '🖼️', label: '升级礼包', desc: '升级送16寸放大一幅' },
      { icon: '📞', label: '专属客服', desc: '一对一专属客服' },
    ],
  },
];

Page({
  data: {
    levels: LEVELS,
    currentLevel: 'ORDINARY',
  },

  onLoad() {
    const userInfo = getUserInfo();
    this.setData({ currentLevel: userInfo?.memberLevel || 'ORDINARY' });
  },
});
