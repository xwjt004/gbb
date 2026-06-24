import { getImageUrl } from '../../utils/image';

interface Category {
  id: number;
  name: string;
}

interface Photographer {
  id: number;
  name: string;
  title?: string;
  avatar?: string;
  style?: string;
}

interface PhotoItem {
  url: string;
  thumbUrl: string;
  error?: boolean;
}

Page({
  data: {
    loading: true,
    photos: [] as PhotoItem[],
    photoUrls: [] as string[],
    categories: [] as Category[],
    photographers: [] as Photographer[],
    activeCategoryId: 0,
    activePhotographerId: 0,
    showPhotographerFilter: false,
    selectedPhotographerName: '全部摄影师',
    apiBaseUrl: '',
    skeletonArray: [1, 2, 3, 4, 5, 6, 7, 8],
  },

  onLoad() {
    console.log('[WorksPage] onLoad');
    const app = getApp();
    const apiBaseUrl = app.globalData.apiBaseUrl || '';
    console.log('[WorksPage] apiBaseUrl:', apiBaseUrl);
    this.setData({ apiBaseUrl });
    this.loadMeta();
  },

  onPullDownRefresh() {
    this.loadMeta();
  },

  async loadMeta() {
    const app = getApp();
    const apiBaseUrl = app.globalData.apiBaseUrl || '';

    try {
      await Promise.all([
        this.loadCategories(apiBaseUrl),
        this.loadWorks(),
      ]);
    } catch (err) {
      console.error('[WorksPage] loadMeta error', err);
    }
  },

  loadCategories(apiBaseUrl: string) {
    return new Promise<void>((resolve) => {
      wx.request({
        url: `${apiBaseUrl}/work-categories/all`,
        method: 'GET',
        timeout: 8000,
        success: (res: any) => {
          if (res.data?.code === 200) {
            this.setData({ categories: res.data.data || [] });
          }
        },
        fail: () => {},
        complete: () => resolve(),
      });
    });
  },

  async loadWorks() {
    const app = getApp();
    const apiBaseUrl = app.globalData.apiBaseUrl || '';
    this.setData({ loading: true });

    try {
      let url = `${apiBaseUrl}/photo-albums?albumType=PORTFOLIO&page=1&limit=50&isPublic=true`;
      if (this.data.activeCategoryId > 0) {
        url += `&categoryId=${this.data.activeCategoryId}`;
      }
      if (this.data.activePhotographerId > 0) {
        url += `&photographerId=${this.data.activePhotographerId}`;
      }

      const res: any = await new Promise((resolve, reject) => {
        wx.request({
          url,
          method: 'GET',
          timeout: 10000,
          success: resolve,
          fail: reject,
        });
      });

      if (res.statusCode === 200) {
        const items = res.data?.data?.items || [];
        const photos: PhotoItem[] = [];
        const photoUrls: string[] = [];
        items.forEach((item: any) => {
          let urls: string[] = [];
          try { urls = JSON.parse(item.photoUrls || '[]'); } catch { urls = [item.photoUrls].filter(Boolean); }
          urls.forEach((u: string) => {
            const fullUrl = getImageUrl(u);
            if (fullUrl) {
              photos.push({ url: fullUrl, thumbUrl: fullUrl });
              photoUrls.push(fullUrl);
            }
          });
        });
        this.setData({ photos, photoUrls });
      }
    } catch (err) {
      console.error('[WorksPage] 加载失败', err);
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  onCategoryChange(e: any) {
    const id = Number(e.currentTarget.dataset.id);
    this.setData({ activeCategoryId: id, photos: [], photoUrls: [] }, () => {
      this.loadWorks();
    });
  },

  togglePhotographerFilter() {
    const app = getApp();
    const apiBaseUrl = app.globalData.apiBaseUrl || '';

    if (this.data.photographers.length === 0) {
      wx.request({
        url: `${apiBaseUrl}/photographers/all`,
        method: 'GET',
        timeout: 8000,
        success: (res: any) => {
          if (res.data?.code === 200) {
            this.setData({
              photographers: res.data.data || [],
              showPhotographerFilter: !this.data.showPhotographerFilter,
            });
          }
        },
      });
    } else {
      this.setData({ showPhotographerFilter: !this.data.showPhotographerFilter });
    }
  },

  onPhotographerChange(e: any) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || '全部摄影师';
    this.setData({
      activePhotographerId: id,
      selectedPhotographerName: name,
      showPhotographerFilter: false,
      photos: [],
      photoUrls: [],
    }, () => {
      this.loadWorks();
    });
  },

  onImageError(e: any) {
    const index = e.currentTarget?.dataset?.index;
    if (index !== undefined) {
      const errKey = `photos[${index}].error`;
      this.setData({ [errKey]: true });
      console.warn('[WorksPage] 图片加载失败:', this.data.photos[index]?.thumbUrl);
    }
  },

  onPreviewImage(e: any) {
    const index = e.currentTarget?.dataset?.index;
    const current = this.data.photos[index]?.url;
    wx.previewImage({ current, urls: this.data.photoUrls });
  },
});
