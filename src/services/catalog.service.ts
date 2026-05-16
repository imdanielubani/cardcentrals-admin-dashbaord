import { api } from '../lib/api';
import type {
  Country,
  GiftCardBrand,
  GiftCardProduct,
  PaginatedResponse,
  ReloadlySyncResult,
  ReloadlySyncStatusResponse,
  ReloadlySyncLog,
} from '../types';

/**
 * Admin catalog service. Wraps the cardcentrals-backend admin endpoints —
 * never call Reloadly directly from here.
 */
export const catalogService = {
  // ── Reloadly sync ────────────────────────────────────────────────────────
  syncReloadly: () =>
    api.post<ReloadlySyncResult>('/admin/reloadly/sync', {}),

  getSyncStatus: () =>
    api.get<ReloadlySyncStatusResponse>('/admin/reloadly/sync/status'),

  getSyncLogs: (limit = 20) =>
    api.get<ReloadlySyncLog[]>(`/admin/reloadly/sync/logs?limit=${limit}`),

  // ── Brands ──────────────────────────────────────────────────────────────
  // Default limit is large enough to return the full Reloadly brand catalog
  // (~270 today) in a single response so the admin page can render it all.
  listBrands: (page = 1, limit = 1000) =>
    api.get<PaginatedResponse<GiftCardBrand>>(
      `/admin/brands?page=${page}&limit=${limit}`,
    ),

  setBrandVisibility: (id: string, isActive: boolean) =>
    api.patch<GiftCardBrand>(`/admin/brands/${id}/visibility`, { isActive }),

  // ── Products ────────────────────────────────────────────────────────────
  listProducts: (params: {
    page?: number;
    limit?: number;
    brandId?: string;
    countryCode?: string;
    isActive?: boolean;
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    // Default high so the admin page can render the entire Reloadly product
    // catalog (~1500 rows today) without paging.
    qs.set('limit', String(params.limit ?? 2000));
    if (params.brandId) qs.set('brandId', params.brandId);
    if (params.countryCode) qs.set('countryCode', params.countryCode);
    if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
    if (params.search) qs.set('search', params.search);
    return api.get<PaginatedResponse<GiftCardProduct>>(
      `/admin/products?${qs.toString()}`,
    );
  },

  setProductVisibility: (id: string, isActive: boolean) =>
    api.patch<GiftCardProduct>(`/admin/products/${id}/visibility`, { isActive }),

  // ── Countries ───────────────────────────────────────────────────────────
  listCountries: (page = 1, limit = 500) =>
    api.get<PaginatedResponse<Country>>(
      `/admin/countries?page=${page}&limit=${limit}`,
    ),

  setCountryVisibility: (codeOrId: string, isActive: boolean) =>
    api.patch<Country>(`/admin/countries/${codeOrId}/visibility`, { isActive }),
};
