import { api } from '../lib/api';
import type { PlatformSettings } from '../types';

export const settingsService = {
  getBrandAssets: () => api.get<PlatformSettings>('/admin/settings/brand-assets'),
  updateBrandAssets: (dto: Partial<PlatformSettings>) =>
    api.post<PlatformSettings>('/admin/settings/brand-assets', dto),
};
