import { request } from '../../../utils/request';
import config from '../../../config/index';

function getFullImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = config.BASE_URL.replace('/api/v1', '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function getQrCodeUrl(activityId) {
  return `${config.BASE_URL}/group-buy/${activityId}/qrcode`;
}

function getStandardQrCodeUrl(activityId) {
  return `${config.BASE_URL}/group-buy/${activityId}/qrcode/standard`;
}

const POSTER_W = 375;
const POSTER_H = 750;

Page({
  data: {
    loading: true,
    activity: null,
    activityId: '',
    countdown: '',
    timer: null,
    joined: false,
    isCreator: false,
    generatingPoster: false,
    showShareGate: false,
    sharedToTimeline: false,
    statusIcon: '',
    statusText: '',
    pkgCover: '',
    pkgName: '',
    pkgPrice: '',
    posterTitle: '',
    posterContent: '',
    posterBackground: '',
    posterImages: [],
    pkgDescription: '',
    qrcodeUrl: '',
    progressPercent: 0,
    participantCount: 0,
    hasParticipants: false,
    standardQrCodeUrl: '',
  },

  onLoad(options) {
    let activityId = options.id;

    // 从小程序码/二维码扫码进入时，scene 参数包含 activityId
    if (!activityId && options.scene) {
      const scene = decodeURIComponent(options.scene);
      // 从 wxacode 生成的 scene 是 32 位 UUID（去横线），还原为标准 UUID 格式
      if (/^[0-9a-f]{32}$/i.test(scene)) {
        activityId = scene.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      } else {
        activityId = scene;
      }
    }

    if (activityId) {
      this.setData({ activityId });
      this.loadDetail();
    }
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
  },

  prepareActivity(activity) {
    if (!activity) return {};

    const pkg = activity.package || {};
    const participants = activity.participants || [];
    const pCount = participants.length;

    let statusIcon = '';
    let statusText = '';
    if (activity.status === 'ACTIVE') {
      statusIcon = '⏳';
      statusText = '拼团进行中';
    } else if (activity.status === 'SUCCESS') {
      statusIcon = '🎉';
      statusText = '拼团成功！';
    } else {
      statusIcon = '😢';
      statusText = '拼团已失败';
    }

    const images = pkg.images || [];
    const pkgCover = getFullImageUrl(images[0] || '');
    const pkgName = pkg.name || '';
    const pkgPrice = pkg.groupPrice || pkg.price || '';
    const pkgDescription = pkg.description || '';

    var posterTitle = pkg.posterTitle || (statusIcon + ' ' + statusText);
    var posterContent = pkg.posterContent || pkgDescription || '';
    const posterBackground = pkg.posterBackground || '';
    const rawImages = (pkg.posterImages || []).filter(Boolean);
    const posterImages = rawImages.map(function(u) { return getFullImageUrl(u); });
    const qrcodeUrl = getQrCodeUrl(activity.id);
    const standardQrCodeUrl = getStandardQrCodeUrl(activity.id);

    const minCount = activity.minCount || 1;
    const progressPercent = Math.min(100, Math.round((pCount / minCount) * 100));

    const preppedParticipants = participants.map(function(p) {
      const user = p.user || {};
      return {
        ...p,
        userAvatar: getFullImageUrl(user.avatar || ''),
        userNickname: user.nickname || '未知',
        userInitial: (user.nickname || '?')[0] || '?',
      };
    });

    return {
      statusIcon,
      statusText,
      pkgCover,
      pkgName,
      pkgPrice,
      pkgDescription,
      progressPercent,
      participantCount: pCount,
      hasParticipants: pCount > 0,
      participants: preppedParticipants,
      posterTitle,
      posterContent,
      posterBackground,
      posterImages,
      qrcodeUrl,
      standardQrCodeUrl,
    };
  },

  async loadDetail() {
    try {
      this.setData({ loading: true });
      const res = await request({
        url: '/group-buy/' + this.data.activityId,
        method: 'GET',
        needAuth: false,
      });

      const rawActivity = res && res.data ? res.data : res;
      const prep = this.prepareActivity(rawActivity);
      this.setData({
        activity: Object.assign({}, rawActivity, { participants: prep.participants }),
        ...prep,
      });

      const token = wx.getStorageSync(config.TOKEN_KEY);
      if (token) {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.id) {
          const joined = rawActivity.participants && rawActivity.participants.some(function(p) { return p.userId === userInfo.id; });
          const isCreator = rawActivity.creatorUserId === userInfo.id;
          this.setData({ joined: !!joined, isCreator: !!isCreator });
        }
      }

      if (rawActivity.status === 'ACTIVE') {
        this.startCountdown(rawActivity.expiredAt);
      }
    } catch (err) {
      console.error('加载团购详情失败', err);
      wx.showToast({ title: '活动已失效，即将返回首页', icon: 'none', duration: 2000 });
      setTimeout(function () {
        wx.switchTab({ url: '/pages/packages/list/list' });
      }, 2000);
      return;
    } finally {
      this.setData({ loading: false });
    }
  },

  startCountdown(expiredAt) {
    var self = this;
    function tick() {
      var now = Date.now();
      var diff = new Date(expiredAt).getTime() - now;
      if (diff <= 0) {
        self.setData({ countdown: '已过期' });
        clearInterval(self.data.timer);
        return;
      }
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      self.setData({ countdown: h + '时' + m + '分' + s + '秒' });
    }
    tick();
    var timer = setInterval(tick, 1000);
    this.setData({ timer: timer });
  },

  async onJoin() {
    var token = wx.getStorageSync(config.TOKEN_KEY);
    if (!token) {
      // 直接使用 data 中已保存的 activityId，避免 options 解析问题
      var redirectUrl = '/pages/group-buy/detail/detail?id=' + this.data.activityId;
      wx.reLaunch({
        url: '/pages/login/login?redirectUrl=' + encodeURIComponent(redirectUrl)
      });
      return;
    }

    if (!this.data.sharedToTimeline) {
      this.setData({ showShareGate: true });
      return;
    }

    try {
      await request({
        url: '/group-buy/' + this.data.activityId + '/join',
        method: 'POST',
      });
      wx.showToast({ title: '参团成功！', icon: 'success' });
      this.setData({ joined: true });

      // 参团成功后跳转到预约流程创建订单并付款
      var pkg = this.data.activity && this.data.activity.package;
      if (pkg) {
        var packageInfo = {
          id: pkg.id,
          name: pkg.name,
          price: pkg.groupPrice || pkg.price,
          depositAmount: pkg.depositAmount || 0,
          duration_minutes: pkg.duration_minutes || 0,
          coverImage: this.data.pkgCover,
          activityId: this.data.activityId,
        };
        wx.navigateTo({
          url: '/pages/booking/date/date?packageId=' + pkg.id + '&packageInfo=' + encodeURIComponent(JSON.stringify(packageInfo)),
        });
      } else {
        this.loadDetail();
      }
    } catch (err) {
      console.error('参团失败', err);
    }
  },

  handleShareToTimeline() {
    if (typeof wx.shareToTimeline !== 'function') {
      wx.showToast({ title: '当前微信版本不支持，请使用海报分享', icon: 'none' });
      return;
    }
    var pkgName = this.data.pkgName || '团购';
    var pkgPrice = this.data.pkgPrice || '';
    wx.shareToTimeline({
      title: '快来参团！' + pkgName + ' 仅需¥' + pkgPrice,
      query: 'id=' + this.data.activityId,
      imageUrl: this.data.pkgCover || '',
    });
    this.setData({ sharedToTimeline: true, showShareGate: false });
  },

  async handleSavePosterAndJoin() {
    try {
      await this.onSavePoster();
      this.setData({ sharedToTimeline: true, showShareGate: false });
    } catch (e) {
      // 保存失败，用户可重试或直接确认已分享
    }
  },

  noop() {},

  handleCloseShareGate() {
    this.setData({ showShareGate: false });
  },

  async handleConfirmJoin() {
    this.setData({ sharedToTimeline: true, showShareGate: false });
    await this.onJoin();
  },

  onShareAppMessage() {
    return {
      title: '快来参团！' + (this.data.pkgName || '团购') + ' 仅需¥' + this.data.pkgPrice,
      path: '/pages/group-buy/detail/detail?id=' + this.data.activityId,
      imageUrl: this.data.pkgCover || '',
    };
  },

  onShareTimeline() {
    return {
      title: '快来参团！' + (this.data.pkgName || '团购') + ' 仅需¥' + this.data.pkgPrice,
      query: 'id=' + this.data.activityId,
      imageUrl: this.data.pkgCover || '',
    };
  },

  onGoBooking() {
    var pkg = this.data.activity && this.data.activity.package;
    if (!pkg) return;
    var packageInfo = {
      id: pkg.id,
      name: pkg.name,
      price: pkg.groupPrice || pkg.price,
      depositAmount: pkg.depositAmount || 0,
      duration_minutes: pkg.duration_minutes || 0,
      coverImage: this.data.pkgCover,
      activityId: this.data.activityId,
    };
    wx.navigateTo({
      url: '/pages/booking/date/date?packageId=' + pkg.id + '&packageInfo=' + encodeURIComponent(JSON.stringify(packageInfo)),
    });
  },

  /** 返回首页 */
  goHome() {
    wx.switchTab({ url: '/pages/packages/list/list' });
  },

  async onSavePoster() {
    if (this.data.generatingPoster) return;
    this.setData({ generatingPoster: true });
    wx.showLoading({ title: '生成海报中...' });

    var self = this;
    try {
      var tempPath = await this.drawPoster();
      var auth = await this.requestAlbumPermission();
      if (!auth) {
        wx.hideLoading();
        self.setData({ generatingPoster: false });
        return;
      }

      wx.saveImageToPhotosAlbum({
        filePath: tempPath,
        success: function() {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
        },
        fail: function() {
          wx.showToast({ title: '保存失败，请重试', icon: 'none' });
        },
        complete: function() {
          self.setData({ generatingPoster: false });
        },
      });
    } catch (err) {
      console.error('生成海报失败', err);
      wx.hideLoading();
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
      this.setData({ generatingPoster: false });
    }
  },

  requestAlbumPermission() {
    var self = this;
    return new Promise(function(resolve) {
      wx.getSetting({
        success: function(res) {
          var auth = res.authSetting['scope.writePhotosAlbum'];
          if (auth === undefined) {
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: function() { resolve(true); },
              fail: function() { resolve(false); },
            });
          } else if (auth === false) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中开启相册写入权限，以便保存海报',
              success: function(modal) {
                if (modal.confirm) {
                  wx.openSetting({
                    success: function(setting) {
                      resolve(!!setting.authSetting['scope.writePhotosAlbum']);
                    },
                  });
                } else {
                  resolve(false);
                }
              },
            });
          } else {
            resolve(true);
          }
        },
        fail: function() { resolve(false); },
      });
    });
  },

  drawPoster() {
    var activity = this.data.activity;
    var pkg = (activity && activity.package) || {};
    var participants = (activity && activity.participants) || [];
    var self = this;

    return new Promise(function(resolve, reject) {
      var query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async function(res) {
          try {
            var canvas = res[0].node;
            var ctx = canvas.getContext('2d');
            var dpr = wx.getSystemInfoSync().pixelRatio;

            canvas.width = POSTER_W * dpr;
            canvas.height = POSTER_H * dpr;
            ctx.scale(dpr, dpr);

            // === 渐变背景 ===
            var bgSetting = self.data.posterBackground;
            if (bgSetting && (bgSetting.startsWith('http://') || bgSetting.startsWith('https://'))) {
              try {
                var bgImg = await self.loadImage(canvas, bgSetting);
                ctx.drawImage(bgImg, 0, 0, POSTER_W, POSTER_H);
              } catch (e) {
                self.drawPosterBackground(ctx);
              }
            } else if (bgSetting && bgSetting.startsWith('#')) {
              var grad = ctx.createLinearGradient(0, 0, 0, POSTER_H);
              grad.addColorStop(0, bgSetting);
              grad.addColorStop(0.35, self.lightenColor(bgSetting, 30));
              grad.addColorStop(1, self.lightenColor(bgSetting, 65));
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, POSTER_W, POSTER_H);
            } else {
              self.drawPosterBackground(ctx);
            }

            // === 背景装饰元素：散落小圆点 ===
            ctx.save();
            var dots = [[30, 60, 8, 'rgba(255,255,255,0.2)'], [POSTER_W-40, 30, 12, 'rgba(255,255,255,0.15)'], [50, POSTER_H-80, 6, 'rgba(255,255,255,0.18)'], [POSTER_W-60, POSTER_H-120, 10, 'rgba(255,255,255,0.12)'], [POSTER_W/2, 25, 5, 'rgba(255,255,255,0.2)']];
            for (var di = 0; di < dots.length; di++) {
              ctx.beginPath();
              ctx.arc(dots[di][0], dots[di][1], dots[di][2], 0, Math.PI * 2);
              ctx.fillStyle = dots[di][3];
              ctx.fill();
            }
            ctx.restore();

            // === 顶部装饰半圆 ===
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, 180, 0, Math.PI / 2, false);
            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(POSTER_W, 0, 140, Math.PI / 2, Math.PI, false);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fill();
            ctx.restore();

            // === 海报标题（带半透明背景条） ===
            var title = self.data.posterTitle || (activity.status === 'SUCCESS' ? '🎉 拼团成功' : '⏳ 拼团进行中');
            ctx.save();
            var titleW = ctx.measureText(title).width + 60;
            var titleX = (POSTER_W - titleW) / 2;
            self.roundRect(ctx, titleX, 32, titleW, 50, 25);
            var stripColor = activity.status === 'SUCCESS' ? 'rgba(7,193,96,0.35)' : 'rgba(0,0,0,0.30)';
            ctx.fillStyle = stripColor;
            ctx.fill();

            ctx.shadowColor = 'rgba(0,0,0,0.20)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 34px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, POSTER_W / 2, 66);
            ctx.restore();

            // === 海报描述 ===
            var content = self.data.posterContent;
            if (content) {
              ctx.fillStyle = 'rgba(255,255,255,0.92)';
              ctx.font = '15px "PingFang SC", sans-serif';
              ctx.textAlign = 'center';
              self.wrapText(ctx, content, POSTER_W / 2, 104, POSTER_W - 80, 22, 15);
            }

            // === 白色主卡片（带顶部彩色装饰条） ===
            var hasContent = !!content;
            var cardX = 14;
            var cardTop = hasContent ? 132 : 100;
            var cardW = POSTER_W - 28;
            var cardH = 335;
            ctx.shadowColor = 'rgba(0,0,0,0.08)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
            self.roundRect(ctx, cardX, cardTop, cardW, cardH, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // 卡片顶部彩色装饰条
            var accentColor = activity.status === 'SUCCESS' ? '#07c160' : '#ff6b6b';
            ctx.save();
            self.roundRect(ctx, cardX + 60, cardTop, cardW - 120, 6, 3);
            ctx.fillStyle = accentColor;
            ctx.fill();
            ctx.restore();

            // === 主图 ===
            var imgPadding = 18;
            var imgX = cardX + imgPadding;
            var imgY = cardTop + imgPadding + 10;
            var imgW = cardW - imgPadding * 2;
            var imgH = 215;

            var posterImgs = self.data.posterImages || [];
            var mainImageUrl = posterImgs[0] || self.data.pkgCover;

            if (mainImageUrl) {
              try {
                var img = await self.loadImage(canvas, mainImageUrl);
                var imgRatio = img.width / img.height;
                var drawRatio = imgW / imgH;
                var sx = 0, sy = 0, sw = img.width, sh = img.height;
                if (imgRatio > drawRatio) {
                  sw = img.height * drawRatio;
                  sx = (img.width - sw) / 2;
                } else {
                  sh = img.width / drawRatio;
                  sy = (img.height - sh) / 2;
                }
                ctx.save();
                self.clipRoundRect(ctx, imgX, imgY, imgW, imgH, 12);
                ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
                ctx.restore();
              } catch (e) {
                self.drawPlaceholder(ctx, imgX, imgY, imgW, imgH);
              }
            } else {
              self.drawPlaceholder(ctx, imgX, imgY, imgW, imgH);
            }

            // === 套餐名称 ===
            var nameY = imgY + imgH + 28;
            ctx.fillStyle = '#2c2c2c';
            ctx.font = 'bold 22px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            var pkgName = self.data.pkgName || '套餐';
            self.wrapText(ctx, pkgName, POSTER_W / 2, nameY, cardW - 50, 28, 22);

            // === 价格（红色标签） ===
            var priceY = imgY + imgH + 66;
            var priceText = '¥' + self.data.pkgPrice;
            var priceTagW = ctx.measureText(priceText).width + 40;
            ctx.save();
            self.roundRect(ctx, (POSTER_W - priceTagW) / 2, priceY - 24, priceTagW, 40, 20);
            ctx.fillStyle = '#ee0a24';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(priceText, POSTER_W / 2, priceY - 4);
            ctx.textBaseline = 'alphabetic';
            ctx.restore();

            // === 分割线 ===
            var dividerY = cardTop + cardH + 14;
            ctx.save();
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(50, dividerY);
            ctx.lineTo(POSTER_W - 50, dividerY);
            ctx.stroke();
            ctx.restore();

            // === 参团成员 ===
            var memberY = dividerY + 14;
            ctx.fillStyle = '#888888';
            ctx.font = '13px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('已有 ' + participants.length + ' 人参团', POSTER_W / 2, memberY);

            var avatarY = memberY + 20;
            var maxShow = Math.min(participants.length, 5);
            var avatarSize = 40;
            var avatarGap = 12;
            var totalW = maxShow * (avatarSize + avatarGap) - avatarGap;
            var startX = (POSTER_W - totalW) / 2;

            for (var i = 0; i < maxShow; i++) {
              var p = participants[i];
              var user = p.user || {};
              var ax = startX + i * (avatarSize + avatarGap);
              var avatarUrl = getFullImageUrl(user.avatar || '');

              if (avatarUrl) {
                try {
                  var avatarImg = await self.loadImage(canvas, avatarUrl);
                  ctx.save();
                  self.clipRoundRect(ctx, ax, avatarY, avatarSize, avatarSize, avatarSize / 2);
                  ctx.drawImage(avatarImg, 0, 0, avatarImg.width, avatarImg.height, ax, avatarY, avatarSize, avatarSize);
                  ctx.restore();
                } catch (e) {
                  self.drawFallbackAvatar(ctx, ax, avatarY, avatarSize, user.nickname || '?');
                }
              } else {
                self.drawFallbackAvatar(ctx, ax, avatarY, avatarSize, user.nickname || '?');
              }
            }

            // === 二维码区域（带边框和阴影） ===
            var qrSectionY = avatarY + avatarSize + 14;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.04)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
            self.roundRect(ctx, 20, qrSectionY, POSTER_W - 40, 122, 12);
            ctx.fillStyle = '#f5f6fa';
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.restore();

            // === 单二维码 ===
            var qrS = 84;
            var qrY = qrSectionY + 32;
            var qrCenterX = POSTER_W / 2;
            var labelY = qrY - 6;
            var qrLoaded = false;

            ctx.fillStyle = '#444444';
            ctx.font = '13px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';

            if (self.data.qrcodeUrl) {
              try {
                var qrImg = await self.loadImage(canvas, self.data.qrcodeUrl);
                ctx.fillText('长按识别小程序码 立即参团', qrCenterX, labelY);
                ctx.save();
                self.roundRect(ctx, qrCenterX - qrS / 2, qrY + 2, qrS, qrS, 8);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                self.clipRoundRect(ctx, qrCenterX - qrS / 2 + 4, qrY + 6, qrS - 8, qrS - 8, 6);
                ctx.drawImage(qrImg, 0, 0, qrImg.width, qrImg.height, qrCenterX - qrS / 2 + 4, qrY + 6, qrS - 8, qrS - 8);
                ctx.restore();
                qrLoaded = true;
              } catch (e) {}
            }

            if (!qrLoaded && self.data.standardQrCodeUrl) {
              try {
                var qrImg2 = await self.loadImage(canvas, self.data.standardQrCodeUrl);
                ctx.fillText('微信扫码 跳转小程序', qrCenterX, labelY);
                ctx.save();
                self.roundRect(ctx, qrCenterX - qrS / 2, qrY + 2, qrS, qrS, 8);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                self.clipRoundRect(ctx, qrCenterX - qrS / 2 + 4, qrY + 6, qrS - 8, qrS - 8, 6);
                ctx.drawImage(qrImg2, 0, 0, qrImg2.width, qrImg2.height, qrCenterX - qrS / 2 + 4, qrY + 6, qrS - 8, qrS - 8);
                ctx.restore();
                qrLoaded = true;
              } catch (e) {}
            }

            if (!qrLoaded) {
              ctx.fillText('扫码参团', qrCenterX, labelY);
              self.drawQrPlaceholder(ctx, qrCenterX - qrS / 2, qrY + 6, qrS);
            }

            // === 底部品牌信息（带装饰线） ===
            var footerY = POSTER_H - 30;
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(100, footerY - 10);
            ctx.lineTo(POSTER_W - 100, footerY - 10);
            ctx.stroke();
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '12px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('乖宝宝儿童摄影 · 扫码立即参团', POSTER_W / 2, footerY);
            ctx.restore();

            // === 转为图片 ===
            wx.canvasToTempFilePath({
              canvas: canvas,
              x: 0,
              y: 0,
              width: POSTER_W,
              height: POSTER_H,
              destWidth: POSTER_W * dpr,
              destHeight: POSTER_H * dpr,
              fileType: 'jpg',
              quality: 0.95,
              success: function(r) {
                wx.hideLoading();
                resolve(r.tempFilePath);
              },
              fail: function(err) {
                wx.hideLoading();
                reject(err);
              },
            });
          } catch (err) {
            wx.hideLoading();
            reject(err);
          }
        });
    });
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  clipRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.clip();
  },

  loadImage(canvas, src) {
    return new Promise(function(resolve, reject) {
      var img = canvas.createImage();
      img.onload = function() { resolve(img); };
      img.onerror = function() { reject(new Error('图片加载失败: ' + src)); };
      img.src = src;
    });
  },

  drawFallbackAvatar(ctx, x, y, size, name) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#07c160';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = (size * 0.4) + 'px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name[0] || '?', x + size / 2, y + size / 2);
    ctx.textBaseline = 'alphabetic';
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight, fontSize) {
    ctx.font = 'bold ' + fontSize + 'px "PingFang SC", sans-serif';
    if (ctx.measureText(text).width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }
    var line = '';
    var lastY = y;
    for (var ci = 0; ci < text.length; ci++) {
      var test = line + text[ci];
      if (ctx.measureText(test).width > maxWidth) {
        ctx.fillText(line, x, lastY);
        line = text[ci];
        lastY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, lastY);
    }
  },

  drawPosterBackground(ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, POSTER_H);
    grad.addColorStop(0, '#fce4ec');
    grad.addColorStop(0.3, '#fff3e0');
    grad.addColorStop(0.6, '#e8f5e9');
    grad.addColorStop(1, '#e3f2fd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  },

  lightenColor(hex, percent) {
    var num = parseInt(hex.replace('#', ''), 16);
    var r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    var g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    var b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  },

  drawPlaceholder(ctx, x, y, w, h) {
    ctx.fillStyle = '#f0f0f0';
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = '#cccccc';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📷', x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  },

  drawQrPlaceholder(ctx, x, y, size) {
    ctx.fillStyle = '#f0f0f0';
    this.roundRect(ctx, x, y, size, size, 8);
    ctx.fill();
    ctx.fillStyle = '#999999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('二维码', x + size / 2, y + size / 2);
    ctx.textBaseline = 'alphabetic';
  },
});
