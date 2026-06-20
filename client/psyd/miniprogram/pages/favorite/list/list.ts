import { request } from '../../../utils/request';
import config from '../../../config/index';

function getFullImageUrl(path: string): string {
  if (!path) return '/images/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = config.BASE_URL.replace('/api/v1', '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

interface FavoriteItem {
  id: string;
  itemType: 'PACKAGE' | 'PRODUCT';
  itemId: number;
  name: string;
  price: number;
  deposit?: number;
  image: string;
  description: string;
  isAvailable: boolean;
  createdAt: string;
}

Page({
  data: {
    loading: false,
    list: [] as Array<{
      id: string;
      itemType: string;
      itemId: number;
      name: string;
      price: number;
      deposit?: number;
      image: string;
      description: string;
      isAvailable: boolean;
    }>,
    page: 1,
    hasMore: true,
    empty: false,
  },

  onLoad() {
    this.loadFavorites();
  },

  async loadFavorites(refresh = false) {
    if (this.data.loading) return;

    const page = refresh ? 1 : this.data.page;

    try {
      this.setData({ loading: true });

      const res = await request<{
        items: FavoriteItem[];
        total: number;
        page: number;
        totalPages: number;
      }>({
        url: `/wx-favorite/mine?page=${page}&limit=10`,
        method: 'GET',
      });

      const items = res.items.map((item) => ({
        ...item,
        image: getFullImageUrl(item.image),
      }));

      this.setData({
        list: refresh ? items : [...this.data.list, ...items],
        page: res.page + 1,
        hasMore: res.page < res.totalPages,
        loading: false,
        empty: res.total === 0,
      });
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      this.setData({ loading: false, empty: this.data.list.length === 0 });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    this.loadFavorites(true);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.loadFavorites();
    }
  },

  goToPackages() {
    wx.switchTab({
      url: '/pages/packages/list/list'
    });
  },

  goToDetail(e: any) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    if (item.itemType === 'PACKAGE') {
      wx.navigateTo({
        url: `/pages/packages/detail/detail?id=${item.itemId}`,
      });
    } else if (item.itemType === 'PRODUCT') {
      wx.navigateTo({
        url: `/pages/product/detail?id=${item.itemId}`,
      });
    }
  },
});
