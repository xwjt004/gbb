import { simple, request } from './api';

export interface PhotoAlbum {
  id: string;
  wxUserId?: string;
  albumType: 'SAMPLE' | 'ALBUM';
  title: string;
  coverUrl?: string;
  photoUrls: string;
  description?: string;
  categoryId?: number;
  photographerId?: number;
  isPublic?: boolean;
  createdAt: string;
  wxUser?: { nickname: string; avatar?: string };
  category?: { id: number; name: string };
  photographer?: { id: number; name: string };
}

export const photoAlbumService = {
  getList: async (params?: {
    albumType?: string;
    wxUserId?: string;
    categoryId?: number;
    photographerId?: number;
    isPublic?: string;
    page?: number;
    limit?: number;
  }) => {
    const res: any = await simple.get('/photo-albums', { params });
    return res?.data || { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  },

  getDetail: async (id: string) => {
    const res: any = await simple.get(`/photo-albums/${id}`);
    return res?.data;
  },

  create: (data: {
    wxUserId?: string;
    albumType: string;
    title: string;
    coverUrl?: string;
    photoUrls?: string;
    description?: string;
    categoryId?: number;
    photographerId?: number;
    isPublic?: boolean;
  }) => {
    return request.post('/photo-albums', data);
  },

  update: (id: string, data: Partial<{
    title: string;
    coverUrl?: string;
    photoUrls?: string;
    description?: string;
    categoryId?: number;
    photographerId?: number;
    isPublic?: boolean;
  }>) => {
    return request.patch(`/photo-albums/${id}`, data);
  },

  remove: (id: string) => {
    return request.delete(`/photo-albums/${id}`);
  },

  removePhoto: (albumId: string, photoUrl: string) => {
    return request.delete(`/photo-albums/${albumId}/photos`, { data: { photoUrl } });
  },
};
