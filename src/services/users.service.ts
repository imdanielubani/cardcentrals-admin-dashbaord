import { api } from '../lib/api';
import type { AdminUser, PaginatedResponse } from '../types';

export const usersService = {
  list: (page = 1, limit = 20, search?: string, status?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return api.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
  },

  getById: (id: string) => api.get<AdminUser>(`/admin/users/${id}`),

  updateStatus: (id: string, status: 'active' | 'suspended') =>
    api.patch<AdminUser>(`/admin/users/${id}/status`, { status }),

  delete: (id: string) => api.delete<void>(`/admin/users/${id}`),
};
