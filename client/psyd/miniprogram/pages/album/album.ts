import { getAccessToken, getUserInfo } from '../../utils/auth';
import { getImageUrl } from '../../utils/image';

Page({
  data: {
    loading: true,
    albums: [] as any[],
    albumType: 'SAMPLE' as string,
  },

  onLoad(query: any) {
    const albumType = query.type || 'SAMPLE';
    this.setData({ albumType });
    const titles: Record<string, string> = {
      SAMPLE: '样片展示',
      ALBUM: '电子相册',
    };
    wx.setNavigationBarTitle({ title: titles[albumType] || '相册' });
    this.loadAlbums(albumType);
  },

  async loadAlbums(albumType: string) {
    this.setData({ loading: true });

    try {
      const params: any = { albumType, page: 1, limit: 50 };
      if (albumType === 'ALBUM') {
        const userInfo = getUserInfo();
        if (userInfo?.id) {
          params.wxUserId = userInfo.id;
        }
      }

      const token = getAccessToken();
      const queryStr = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/photo-albums?${queryStr}`,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200) {
        const items = res.data?.data?.items || [];
        // 预处理 photoUrls 为完整 URL 数组，避免模板中嵌套 wx:for 的作用域问题
        items.forEach((item: any) => {
          item.photos = this.getPhotos(item.photoUrls);
        });
        this.setData({ albums: items });
      }
    } catch (err) {
      console.error('[AlbumPage] 加载失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  getPhotos(photoUrls: string): { url: string; original: string; isVideo: boolean }[] {
    if (!photoUrls) return [];
    const videoExts = ['mp4', 'mov', 'avi', 'webm', 'wmv', '3gp', 'm4v'];
    try {
      const urls = JSON.parse(photoUrls);
      return urls.map((u: string) => {
        const fullUrl = getImageUrl(u);
        const ext = (fullUrl.match(/\.(\w+)(\?|$)/) || [])[1]?.toLowerCase();
        return { url: fullUrl, original: u, isVideo: !!ext && videoExts.includes(ext) };
      });
    } catch {
      const fullUrl = getImageUrl(photoUrls);
      const ext = (fullUrl.match(/\.(\w+)(\?|$)/) || [])[1]?.toLowerCase();
      return [{ url: fullUrl, original: photoUrls, isVideo: !!ext && videoExts.includes(ext) }];
    }
  },

  onPreviewPhoto(e: any) {
    const { current, urls } = e.currentTarget.dataset;
    const videoExts = ['mp4', 'mov', 'avi', 'webm', 'wmv', '3gp', 'm4v'];
    let allUrls: { url: string; type: string }[] = [];
    try {
      const parsed = JSON.parse(urls) as string[];
      allUrls = parsed.map((u: string) => {
        const fullUrl = getImageUrl(u);
        const ext = (fullUrl.match(/\.(\w+)(\?|$)/) || [])[1]?.toLowerCase();
        return { url: fullUrl, type: ext && videoExts.includes(ext) ? 'video' : 'image' };
      });
    } catch {
      const fullUrl = getImageUrl(urls);
      const ext = (fullUrl.match(/\.(\w+)(\?|$)/) || [])[1]?.toLowerCase();
      allUrls = [{ url: fullUrl, type: ext && videoExts.includes(ext) ? 'video' : 'image' }];
    }

    const hasVideo = allUrls.some(s => s.type === 'video');
    if (hasVideo) {
      const currentUrl = getImageUrl(current);
      const currentIndex = allUrls.findIndex(s => s.url === currentUrl);
      wx.previewMedia({
        sources: allUrls,
        current: currentIndex >= 0 ? currentIndex : 0,
      });
    } else {
      wx.previewImage({
        current: getImageUrl(current),
        urls: allUrls.map(s => s.url),
      });
    }
  },

  onDownloadPhoto(e: any) {
    const photoUrl = e.currentTarget.dataset.photo as string;
    if (!photoUrl) return;

    const fullUrl = getImageUrl(photoUrl);

    // 从 URL 中提取文件扩展名，判断是否为视频
    const extMatch = fullUrl.match(/\.(\w+)(\?|$)/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const videoExts = ['mp4', 'mov', 'avi', 'webm', 'wmv', '3gp', 'm4v'];
    const isVideo = videoExts.includes(ext);

    // 非 mp4 视频格式在手机上可能无法保存到相册
    if (isVideo && ext !== 'mp4') {
      wx.showModal({
        title: '提示',
        content: ext === 'wmv' ? 'WMV 格式在手机端不兼容，建议上传 MP4 格式' : `${ext} 格式视频可能在部分手机上无法播放，建议使用 MP4 格式`,
      });
      // 仍然继续尝试下载
    }

    wx.showLoading({ title: '下载中...' });

    // 通过 API 域名下载（已配置 request 白名单），避免 downloadFile 域名白名单限制
    const token = getAccessToken();
    wx.request({
      url: fullUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      header: { Authorization: `Bearer ${token}` },
      success(res: any) {
        // 将 arraybuffer 写入临时文件（使用正确的扩展名）
        const fs = wx.getFileSystemManager();
        const tmpPath = `${wx.env.USER_DATA_PATH}/temp_${Date.now()}.${ext}`;
        fs.writeFile({
          filePath: tmpPath,
          data: res.data,
          encoding: 'binary',
          success() {
            if (isVideo) {
              wx.saveVideoToPhotosAlbum({
                filePath: tmpPath,
                success() {
                  wx.hideLoading();
                  wx.showToast({ title: '保存成功', icon: 'success' });
                },
                fail(err: any) {
                  wx.hideLoading();
                  if (err.errMsg?.includes('deny') || err.errMsg?.includes('denied')) {
                    wx.showModal({
                      title: '提示',
                      content: '需要保存到相册的权限，请在设置中开启',
                      success(m: any) {
                        if (m.confirm) wx.openSetting();
                      },
                    });
                  } else {
                    wx.showToast({ title: '保存失败', icon: 'none' });
                  }
                },
              });
              return;
            }
            wx.saveImageToPhotosAlbum({
              filePath: tmpPath,
              success() {
                wx.hideLoading();
                wx.showToast({ title: '保存成功', icon: 'success' });
              },
              fail(err: any) {
                wx.hideLoading();
                if (err.errMsg?.includes('deny') || err.errMsg?.includes('denied')) {
                  wx.showModal({
                    title: '提示',
                    content: '需要保存到相册的权限，请在设置中开启',
                    success(m: any) {
                      if (m.confirm) wx.openSetting();
                    },
                  });
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              },
            });
          },
          fail() {
            wx.hideLoading();
            wx.showToast({ title: '下载失败', icon: 'none' });
          },
        });
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },

  async onDeletePhoto(e: any) {
    const { albumId, original } = e.currentTarget.dataset;
    if (!albumId || !original) return;

    const confirm = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '删除照片',
        content: '确定要删除这张照片吗？',
        success: (res) => resolve(res.confirm),
      });
    });
    if (!confirm) return;

    wx.showLoading({ title: '删除中...' });

    try {
      const token = getAccessToken();
      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url: `${getApp().globalData.apiBaseUrl}/photo-albums/${albumId}/photos`,
          method: 'DELETE',
          header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { photoUrl: original },
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200) {
        wx.hideLoading();
        wx.showToast({ title: '删除成功', icon: 'success' });
        this.loadAlbums(this.data.albumType);
      } else {
        wx.hideLoading();
        wx.showToast({ title: res.data?.message || '删除失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },
});
