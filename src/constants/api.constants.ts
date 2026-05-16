export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:3000/api/v1';

export const TOKEN_KEY = 'cardcentrals_admin_token';
export const ADMIN_KEY = 'cardcentrals_admin_user';

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_LARGE_PAGE_SIZE = 50;

export const STATUS_COLORS = {
  // Gift card / general transaction statuses
  pending: { bg: '#FEF9C3', text: '#854D0E' },
  processing: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#DCFCE7', text: '#166534' },
  approved: { bg: '#DCFCE7', text: '#166534' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  flagged: { bg: '#FEF3C7', text: '#92400E' },

  // Withdrawal statuses
  paid: { bg: '#DCFCE7', text: '#166534' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
  reversed: { bg: '#FEF3C7', text: '#92400E' },

  // User statuses
  active: { bg: '#DCFCE7', text: '#166534' },
  suspended: { bg: '#FEE2E2', text: '#991B1B' },
  deleted: { bg: '#F3F4F6', text: '#6B7280' },

  // Banner statuses
  scheduled: { bg: '#EDE9FE', text: '#5B21B6' },
  inactive: { bg: '#F3F4F6', text: '#6B7280' },
} as const;
