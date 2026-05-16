import { api } from '../lib/api';
import type { AdminStats } from '../types';

export const dashboardService = {
  getStats: () => api.get<AdminStats>('/admin/stats'),
};
