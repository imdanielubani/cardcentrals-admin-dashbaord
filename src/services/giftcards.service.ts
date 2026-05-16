import { api } from '../lib/api';
import type { GiftCardTransaction, GiftCardBrand, GiftCardRate, PaginatedResponse, UpdateTransactionStatusDto, SetRateDto } from '../types';

export const giftcardsService = {
  // Transactions
  listTransactions: (page = 1, limit = 20, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
    return api.get<PaginatedResponse<GiftCardTransaction>>(`/admin/gift-cards?${params}`);
  },

  getTransaction: (id: string) =>
    api.get<GiftCardTransaction>(`/admin/gift-cards/${id}`),

  updateTransactionStatus: (id: string, dto: UpdateTransactionStatusDto) =>
    api.patch<GiftCardTransaction>(`/admin/gift-cards/${id}/status`, dto),

  // Brands
  listBrands: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<GiftCardBrand>>(`/admin/brands?page=${page}&limit=${limit}`),

  getBrand: (id: string) => api.get<GiftCardBrand>(`/admin/brands/${id}`),

  updateBrand: (id: string, data: Partial<GiftCardBrand>) =>
    api.patch<GiftCardBrand>(`/admin/brands/${id}`, data),

  syncBrands: () => api.post<{ synced: number }>('/admin/reloadly/sync', {}),

  // Rates
  listRates: (page = 1, limit = 50) =>
    api.get<PaginatedResponse<GiftCardRate>>(`/admin/rates?page=${page}&limit=${limit}`),

  setRate: (dto: SetRateDto) => api.post<GiftCardRate>('/admin/rates', dto),

  updateRate: (id: string, dto: Partial<SetRateDto>) =>
    api.put<GiftCardRate>(`/admin/rates/${id}`, dto),

  deleteRate: (id: string) => api.delete<void>(`/admin/rates/${id}`),
};
