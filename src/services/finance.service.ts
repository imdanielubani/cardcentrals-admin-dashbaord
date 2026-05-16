import { api } from '../lib/api';
import type { WalletTransaction, PaginatedResponse } from '../types';

export const financeService = {
  listLedger: (page = 1, limit = 30, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
    return api.get<PaginatedResponse<WalletTransaction>>(`/admin/wallet-transactions?${params}`);
  },
};
