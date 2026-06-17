import { getAccessToken, getUserInfo, saveAuthData } from '../../../utils/auth';
import { getImageUrl } from '../../../utils/image';
import { patch, post, get, del } from '../../../utils/request';

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
    hundredDaysTime: '10:00',
    firstBirthdayDate: '',
    firstBirthdayTime: '10:00',
    // 成长里程碑
    milestones: [],
    showMilestoneForm: false,
    editingMilestoneId: '',
    milestoneFormData: {
      type: '',
      recordDate: '',
      height: '',
      weight: '',
      hobby: '',
      photo: '',
      momBlessing: '',
      dadBlessing: '',
      elderBlessing: '',
    },
    MILESTONE_TYPES: ['出生', '百天', '周岁', '二周岁', '三周岁', '四周岁', '五周岁', '幼儿园', '小学', '初中', '高中', '大学', '硕士', '博士'],
    milestoneTypeIndex: -1,
    savingMilestone: false,
    photoList: [],
    videoUrl: '',
    // 配额和积分
    quota: null as { photoRemaining: number; videoRemaining: number; playRemaining: number; pointsBalance?: number } | null,
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
    this.loadMilestones();
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

  /** 纪念日时间选择 */
  onTimeChange(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  /** 解析里程碑媒体字段（兼容单URL和JSON数组） */
  parseMilestoneMedia(photo: string): { photoList: string[]; videoUrl: string } {
    if (!photo) return { photoList: [], videoUrl: '' };
    let photoList: string[] = [];
    let videoUrl = '';
    try {
      const parsed = JSON.parse(photo);
      if (Array.isArray(parsed)) {
        photoList = parsed.filter((u: string) => !u.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i));
        videoUrl = parsed.find((u: string) => u.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i)) || '';
      }
    } catch {
      if (photo.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i)) {
        videoUrl = photo;
      } else {
        photoList = [photo];
      }
    }
    return { photoList, videoUrl };
  },

  /** 加载成长里程碑 */
  async loadMilestones() {
    try {
      const res: any = await get(`/wx-users/${this.data.userId}/milestones`);
      let list = res?.data || [];
      // 解析 photo JSON 字段，方便 WXML 直接渲染
      list = list.map((m: any) => {
        const { photoList, videoUrl } = this.parseMilestoneMedia(m.photo);
        return { ...m, _photoList: photoList, _videoUrl: videoUrl };
      });
      this.setData({ milestones: list });
    } catch { /* ignore */ }
  },

  /** 加载幸福空间配额 */
  async loadQuota() {
    try {
      const res: any = await get(`/wx-users/${this.data.userId}/milestone/quota`);
      const d = res?.data || res || {};
      this.setData({
        quota: {
          photoRemaining: d.photoRemaining ?? 0,
          videoRemaining: d.videoRemaining ?? 0,
          playRemaining: d.playRemaining ?? 0,
        },
      });
    } catch { /* ignore */ }
  },

  /** 显示新增里程碑表单 */
  addMilestone() {
    this.setData({
      showMilestoneForm: true,
      editingMilestoneId: '',
      milestoneFormData: {
        type: '',
        recordDate: '',
        height: '',
        weight: '',
        hobby: '',
        photo: '',
        momBlessing: '',
        dadBlessing: '',
        elderBlessing: '',
      },
      milestoneTypeIndex: -1,
      photoList: [],
      videoUrl: '',
    });
    this.loadQuota();
  },

  /** 编辑里程碑 */
  editMilestone(e: any) {
    const id = e.currentTarget.dataset.id;
    const m = this.data.milestones.find((x: any) => x.id === id);
    if (!m) return;

    const types = this.data.MILESTONE_TYPES;
    const typeIndex = m.type ? types.indexOf(m.type) : -1;

    let photoList: string[] = [];
    let videoUrl = '';
    if (m.photo) {
      try {
        const parsed = JSON.parse(m.photo);
        if (Array.isArray(parsed)) {
          photoList = parsed.filter((u: string) => !u.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i));
          videoUrl = parsed.find((u: string) => u.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i)) || '';
        }
      } catch {
        if (m.photo.match(/\.(mp4|mov|avi|webm|wmv|3gp|m4v)(\?|$)/i)) {
          videoUrl = m.photo;
        } else {
          photoList = [m.photo];
        }
      }
    }

    this.setData({
      showMilestoneForm: true,
      editingMilestoneId: id,
      milestoneFormData: {
        type: m.type || '',
        recordDate: m.recordDate ? m.recordDate.slice(0, 10) : '',
        height: m.height != null ? String(m.height) : '',
        weight: m.weight != null ? String(m.weight) : '',
        hobby: m.hobby || '',
        photo: m.photo || '',
        momBlessing: m.momBlessing || '',
        dadBlessing: m.dadBlessing || '',
        elderBlessing: m.elderBlessing || '',
      },
      milestoneTypeIndex: typeIndex,
      photoList,
      videoUrl,
    });
    this.loadQuota();
  },

  /** 取消里程碑表单 */
  cancelMilestoneForm() {
    this.setData({ showMilestoneForm: false, editingMilestoneId: '' });
  },

  /** 里程碑类型选择 */
  onMilestoneTypeChange(e: any) {
    const index = parseInt(e.detail.value);
    const types = this.data.MILESTONE_TYPES;
    const selectedType = types[index] || '';
    this.setData({
      milestoneTypeIndex: index,
      'milestoneFormData.type': selectedType,
    });
  },

  /** 里程碑表单输入 */
  onMilestoneFormInput(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`milestoneFormData.${field}`]: e.detail.value });
  },

  /** 里程碑日期选择 */
  onMilestoneDateChange(e: any) {
    this.setData({ 'milestoneFormData.recordDate': e.detail.value });
  },

  /** 上传照片（最多10张，每张<1MB，每年3次，自动压缩到0.7质量） */
  chooseMilestonePhotos() {
    const quota = this.data.quota;
    if (!quota || quota.photoRemaining <= 0) {
      wx.showToast({ title: '今年照片上传次数已用完（每年3次）', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: 10,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const token = getAccessToken();
        if (!token) return;

        // 先校验大小（原图不能超过1MB）
        for (const file of res.tempFiles) {
          if (file.size > 1024 * 1024) {
            wx.showToast({ title: '每张照片不能超过1MB', icon: 'none' });
            return;
          }
        }

        const remainCount = 10 - this.data.photoList.length;
        const files = res.tempFilePaths.slice(0, remainCount);

        wx.showLoading({ title: '压缩中...', mask: true });

        // 第1步：压缩所有照片到质量0.7
        const compressedPaths: string[] = [];
        let compressDone = 0;

        const compressAll = () => {
          if (compressDone >= files.length) {
            // 压缩完成，开始上传
            wx.showLoading({ title: '上传中...', mask: true });
            startUpload();
            return;
          }
          wx.compressImage({
            src: files[compressDone],
            quality: 70,
            success: (cRes) => {
              compressedPaths.push(cRes.tempFilePath);
            },
            fail: () => {
              // 压缩失败则用原图
              compressedPaths.push(files[compressDone]);
            },
            complete: () => {
              compressDone++;
              compressAll();
            },
          });
        };

        // 第2步：逐个上传压缩后的照片
        let uploaded = 0;
        const urls: string[] = [];

        const uploadNext = (idx: number) => {
          if (idx >= compressedPaths.length) {
            wx.hideLoading();
            const merged = [...this.data.photoList, ...urls].slice(0, 10);
            const photoStr = JSON.stringify(merged);
            this.setData({
              'milestoneFormData.photo': photoStr,
              photoList: merged,
            });
            // 记录上传次数
            post(`/wx-users/${this.data.userId}/milestone/upload-log`, { uploadType: 'PHOTO' }).catch(() => {});
            this.loadQuota();
            wx.showToast({ title: `成功上传 ${urls.length} 张照片`, icon: 'success' });
            return;
          }
          wx.uploadFile({
            url: `${getApp().globalData.apiBaseUrl}/files/upload`,
            filePath: compressedPaths[idx],
            name: 'file',
            header: { Authorization: `Bearer ${token}` },
            success: (uploadRes: any) => {
              if (uploadRes.statusCode === 201) {
                try {
                  const body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
                  const url = body.url || body.data?.url || '';
                  if (url) urls.push(getImageUrl(url));
                } catch { /* ignore */ }
              }
            },
            complete: () => {
              uploaded++;
              uploadNext(idx + 1);
            },
          });
        };

        const startUpload = () => {
          uploadNext(0);
        };

        compressAll();
      },
    });
  },

  /** 上传视频（最多1个，<5MB，每年3次） */
  chooseMilestoneVideo() {
    const quota = this.data.quota;
    if (!quota || quota.videoRemaining <= 0) {
      wx.showToast({ title: '今年视频上传次数已用完（每年3次）', icon: 'none' });
      return;
    }

    if (this.data.videoUrl) {
      wx.showToast({ title: '已有一个视频，请先删除再上传', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0];
        if (tempFile.size > 5 * 1024 * 1024) {
          wx.showToast({ title: '视频不能超过5MB', icon: 'none' });
          return;
        }

        const token = getAccessToken();
        if (!token) return;

        wx.showLoading({ title: '上传视频中...' });
        wx.uploadFile({
          url: `${getApp().globalData.apiBaseUrl}/files/upload`,
          filePath: tempFile.tempFilePath,
          name: 'file',
          header: { Authorization: `Bearer ${token}` },
          success: (uploadRes: any) => {
            wx.hideLoading();
            if (uploadRes.statusCode === 201) {
              try {
                const body = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data;
                const url = body.url || body.data?.url || '';
                if (url) {
                  const fullUrl = getImageUrl(url);
                  const merged = this.data.photoList.concat(fullUrl);
                  this.setData({
                    'milestoneFormData.photo': JSON.stringify(merged),
                    videoUrl: fullUrl,
                  });
                  // 记录上传次数
                  post(`/wx-users/${this.data.userId}/milestone/upload-log`, { uploadType: 'VIDEO' }).catch(() => {});
                  this.loadQuota();
                  wx.showToast({ title: '视频上传成功', icon: 'success' });
                }
              } catch { /* ignore */ }
            } else {
              wx.showToast({ title: '上传失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '上传失败', icon: 'none' });
          },
        });
      },
    });
  },

  /** 删除单张照片 */
  removeMilestonePhoto(e: any) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const list = [...this.data.photoList];
    list.splice(idx, 1);
    const merged = this.data.videoUrl ? list.concat(this.data.videoUrl) : list;
    this.setData({
      photoList: list,
      'milestoneFormData.photo': merged.length ? JSON.stringify(merged) : '',
    });
  },

  /** 删除视频 */
  removeMilestoneVideo() {
    const list = [...this.data.photoList];
    this.setData({
      videoUrl: '',
      'milestoneFormData.photo': list.length ? JSON.stringify(list) : '',
    });
  },

  /** 预览里程碑照片 */
  previewMilestonePhoto(e: any) {
    const src = e.currentTarget.dataset.src;
    const urls = this.data.photoList;
    if (urls.length > 0) {
      wx.previewImage({ urls, current: src || urls[0] });
    }
  },

  /** 保存里程碑 */
  async saveMilestone() {
    if (this.data.savingMilestone) return;

    const form = this.data.milestoneFormData;
    if (!form.type) {
      wx.showToast({ title: '请选择类型', icon: 'none' });
      return;
    }

    this.setData({ savingMilestone: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const payload: any = {
        type: form.type,
        recordDate: form.recordDate ? form.recordDate + 'T10:00:00.000Z' : undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        hobby: form.hobby || undefined,
        photo: form.photo || undefined,
        momBlessing: form.momBlessing || undefined,
        dadBlessing: form.dadBlessing || undefined,
        elderBlessing: form.elderBlessing || undefined,
      };

      // 清理空值
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      if (this.data.editingMilestoneId) {
        await patch(`/wx-users/${this.data.userId}/milestones/${this.data.editingMilestoneId}`, payload);
      } else {
        await post(`/wx-users/${this.data.userId}/milestones`, payload);
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ showMilestoneForm: false, editingMilestoneId: '' });
      this.loadMilestones();
    } catch (err: any) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ savingMilestone: false });
    }
  },

  /** 视频播放（每日限5次） */
  onVideoPlay() {
    const quota = this.data.quota;
    if (quota && quota.playRemaining <= 0) {
      wx.showToast({ title: '今日播放次数已用完（每天5次）', icon: 'none' });
      return;
    }
    // 记录播放次数（异步，不阻塞播放）
    post(`/wx-users/${this.data.userId}/milestone/play-log`, {})
      .then(() => this.loadQuota())
      .catch((err: any) => {
        if (err?.message?.includes('已达上限')) {
          wx.showToast({ title: '今日播放次数已用完', icon: 'none' });
        }
      });
  },

  /** 预览卡片中的里程碑照片（支持轮播） */
  previewCardPhoto(e: any) {
    const { urls, current } = e.currentTarget.dataset;
    if (urls && urls.length > 0) {
      wx.previewImage({ urls, current: current || urls[0] });
    }
  },

  /** 删除里程碑 */
  deleteMilestone(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条成长记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/wx-users/${this.data.userId}/milestones/${id}`);
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadMilestones();
          } catch { /* ignore */ }
        }
      },
    });
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
      if (this.data.hundredDaysDate) {
        updateData.hundredDaysDate = this.data.hundredDaysDate + 'T' + (this.data.hundredDaysTime || '10:00') + ':00';
      }
      if (this.data.firstBirthdayDate) {
        updateData.firstBirthdayDate = this.data.firstBirthdayDate + 'T' + (this.data.firstBirthdayTime || '10:00') + ':00';
      }

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
