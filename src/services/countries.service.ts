import { api } from '../lib/api';
import type { AdminCountry } from '../types';

export const countriesService = {
  list: () => api.get<AdminCountry[]>('/admin/countries'),

  updateStatus: (code: string, isActive: boolean) =>
    api.patch<AdminCountry>(`/admin/countries/${code}/status`, { isActive }),
};
