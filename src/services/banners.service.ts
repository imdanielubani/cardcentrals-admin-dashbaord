import { api } from '../lib/api';
import type { Banner, CreateBannerDto, PaginatedResponse } from '../types';

export const bannersService = {
  list: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Banner>>(`/admin/banners?page=${page}&limit=${limit}`),

  getById: (id: string) => api.get<Banner>(`/admin/banners/${id}`),

  create: (dto: CreateBannerDto) => api.post<Banner>('/admin/banners', dto),

  update: (id: string, dto: Partial<CreateBannerDto>) =>
    api.put<Banner>(`/admin/banners/${id}`, dto),

  delete: (id: string) => api.delete<void>(`/admin/banners/${id}`),

  reorder: (ids: string[]) => api.post<void>('/admin/banners/reorder', { ids }),
};
