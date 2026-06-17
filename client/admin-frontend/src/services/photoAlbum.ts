import { simple, request } from './api';

export interface PhotoAlbum {
  id: string;
  wxUserId?: string;
  albumType: 'SAMPLE' | 'ALBUM';
  title: string;
  coverUrl?: string;
  photoUrls: string;
  description?: string;
  createdAt: string;
  wxUser?: { nickname: string; avatar?: string };
}

export const photoAlbumService = {
  getList: async (params: { albumType?: string; wxUserId?: string; page?: number; limit?: number }) => {
    const res: any = await simple.get('/photo-albums', { params });
    return res?.data || { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  },

  create: (data: { wxUserId?: string; albumType: string; title: string; coverUrl?: string; photoUrls?: string; description?: string }) => {
    return request.post('/photo-albums', data);
  },

  remove: (id: string) => {
    return request.delete(`/photo-albums/${id}`);
  },

  removePhoto: (albumId: string, photoUrl: string) => {
    return request.delete(`/photo-albums/${albumId}/photos`, { data: { photoUrl } });
  },
};
