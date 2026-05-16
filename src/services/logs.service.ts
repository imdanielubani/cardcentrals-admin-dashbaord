import { api } from '../lib/api';
import type { AuditLog, PaginatedResponse } from '../types';

export const logsService = {
  list: (page = 1, limit = 30, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
    return api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params}`);
  },
};
