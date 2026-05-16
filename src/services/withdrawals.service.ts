import { api } from '../lib/api';
import type { Withdrawal, UpdateWithdrawalDto, PaginatedResponse } from '../types';

export const withdrawalsService = {
  list: (page = 1, limit = 20, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
    return api.get<PaginatedResponse<Withdrawal>>(`/admin/withdrawals?${params}`);
  },

  getById: (id: string) => api.get<Withdrawal>(`/admin/withdrawals/${id}`),

  updateStatus: (id: string, dto: UpdateWithdrawalDto) =>
    api.patch<Withdrawal>(`/admin/withdrawals/${id}/status`, dto),
};
