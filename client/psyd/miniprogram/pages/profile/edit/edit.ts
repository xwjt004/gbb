import { getAccessToken, getUserInfo, saveAuthData } from '../../../utils/auth';
import { getImageUrl } from '../../../utils/image';
import { patch } from '../../../utils/request';

Page({
  data: {
    loading: false,
    saving: false,
    userId: '',
    ZODIACS: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
    CONSTELLATIONS: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'],
    // 表单数据
    avatar: '',
    nickname: '',
    realName: '',
    phone: '',
    height: '',
    weight: '',
    zodiac: '',
    zodiacIndex: -1,
    constellation: '',
    constellationIndex: -1,
    address: '',
    schoolName: '',
    talent: '',
    hundredDaysDate: '',
    firstBirthdayDate: '',
  },

  onLoad() {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    this.setData({ userId: userInfo.id });
    this.loadUserDetail();
  },

  /** 从后端加载用户详情 */
  async loadUserDetail() {
    this.setData({ loading: true });
    try {
      const token = getAccessToken();
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/wx-users/${this.data.userId}`,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200) {
        const d = res.data.data || res.data;
        const zodiacs = this.data.ZODIACS;
        const constellations = this.data.CONSTELLATIONS;
        const zodiacIndex = d.zodiac ? zodiacs.indexOf(d.zodiac) : -1;
        const constellationIndex = d.constellation ? constellations.indexOf(d.constellation) : -1;

        this.setData({
          avatar: getImageUrl(d.avatar) || '',
          nickname: d.nickname || '',
          realName: d.realName || '',
          phone: d.phone || '',
          height: d.height ? String(d.height) : '',
          weight: d.weight ? String(d.weight) : '',
          zodiac: d.zodiac || '',
          zodiacIndex: zodiacIndex >= 0 ? zodiacIndex : -1,
          constellation: d.constellation || '',
          constellationIndex: constellationIndex >= 0 ? constellationIndex : -1,
          address: d.address || '',
          schoolName: d.schoolName || '',
          talent: d.talent || '',
          hundredDaysDate: d.hundredDaysDate || '',
          firstBirthdayDate: d.firstBirthdayDate || '',
          loading: false,
        });
      } else {
        // 后端加载失败，用本地缓存
        const userInfo = getUserInfo();
        this.setData({
          avatar: userInfo?.avatar || '',
          nickname: userInfo?.nickname || '',
          phone: userInfo?.phone || '',
          loading: false,
        });
      }
    } catch (error) {
      // 网络错误，用本地缓存
      const userInfo = getUserInfo();
      this.setData({
        avatar: userInfo?.avatar || '',
        nickname: userInfo?.nickname || '',
        phone: userInfo?.phone || '',
        loading: false,
      });
    }
  },

  /** 选择头像 */
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        // 暂时显示本地路径，保存时上传
        this.setData({ avatar: tempPath });
      },
    });
  },

  /** 输入事件 */
  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  /** 选择生肖 */
  onZodiacChange(e: any) {
    const index = parseInt(e.detail.value);
    const zodiacs = this.data.ZODIACS;
    this.setData({
      zodiac: zodiacs[index],
      zodiacIndex: index,
    });
  },

  /** 选择星座 */
  onConstellationChange(e: any) {
    const index = parseInt(e.detail.value);
    const constellations = this.data.CONSTELLATIONS;
    this.setData({
      constellation: constellations[index],
      constellationIndex: index,
    });
  },

  /** 日期选择 */
  onDateChange(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  /** 保存 */
  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const token = getAccessToken();
      if (!token) throw new Error('未登录');

      // 构建更新数据（只有有值的字段才发送）
      const updateData: any = {};
      if (this.data.nickname) updateData.nickname = this.data.nickname;
      if (this.data.realName) updateData.realName = this.data.realName;
      if (this.data.phone) updateData.phone = this.data.phone;
      if (this.data.height) {
        const h = parseFloat(this.data.height);
        if (!isNaN(h)) updateData.height = h;
      }
      if (this.data.weight) {
        const w = parseFloat(this.data.weight);
        if (!isNaN(w)) updateData.weight = w;
      }
      if (this.data.zodiac) updateData.zodiac = this.data.zodiac;
      if (this.data.constellation) updateData.constellation = this.data.constellation;
      if (this.data.address) updateData.address = this.data.address;
      if (this.data.schoolName) updateData.schoolName = this.data.schoolName;
      if (this.data.talent) updateData.talent = this.data.talent;
      if (this.data.hundredDaysDate) updateData.hundredDaysDate = this.data.hundredDaysDate;
      if (this.data.firstBirthdayDate) updateData.firstBirthdayDate = this.data.firstBirthdayDate;

      // 调用 PATCH（通过 request.ts 的 patch 方法，自动处理兼容性）
      const updateRes: any = await patch(`/wx-users/${this.data.userId}`, updateData);

      // 同时上传头像（如果更改了本地临时文件）
      // 注意：Windows 开发者工具下 chooseImage 返回 http://tmp/xxx.jpg，也是临时文件需要上传
      const avatar = this.data.avatar;
      const isServerUrl = avatar.startsWith('https://guaibaobao.cn') || avatar.startsWith('https://') || avatar.startsWith('/api/v1');
      if (avatar && !isServerUrl) {
        try {
          const uploadRes = await new Promise<any>((resolve, reject) => {
            wx.uploadFile({
              url: `${getApp().globalData.apiBaseUrl}/files/upload`,
              filePath: this.data.avatar,
              name: 'file',
              header: { Authorization: `Bearer ${token}` },
              success: resolve,
              fail: reject,
            });
          });
          if (uploadRes.statusCode === 201) {
            let avatarUrl = '';
            try {
              const body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
              avatarUrl = body.url || body.data?.url || '';
            } catch (e) {
              console.warn('[EditPage] 解析上传响应失败', e);
            }
            if (avatarUrl) {
              // 用完整 URL 存储
              const fullAvatarUrl = getImageUrl(avatarUrl);
              await patch(`/wx-users/${this.data.userId}`, { avatar: fullAvatarUrl });
              this.setData({ avatar: fullAvatarUrl });
            }
          }
        } catch (e) {
          console.warn('[EditPage] 头像上传失败', e);
        }
      }

      // 更新本地存储的 userInfo（避免保存临时路径）
      const userInfo = getUserInfo();
      if (userInfo) {
        const storedAvatar = userInfo.avatar || '';
        // 只保存服务器 URL，不保存临时路径
        const finalAvatar = this.data.avatar && (
          this.data.avatar.startsWith('https://') || this.data.avatar.startsWith('/api/v1')
        ) ? this.data.avatar : storedAvatar;
        saveAuthData(getAccessToken(), '', {
          ...userInfo,
          nickname: this.data.nickname || userInfo.nickname,
          avatar: finalAvatar,
          phone: this.data.phone || userInfo.phone,
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none',
      });
      this.setData({ saving: false });
    }
  },
});
