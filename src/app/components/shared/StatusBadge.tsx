import { STATUS_COLORS } from '../../../constants';

type StatusKey = keyof typeof STATUS_COLORS;

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Colored pill badge for entity statuses (pending, completed, flagged, etc.).
 * Falls back to a neutral gray if the status is not in STATUS_COLORS.
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = status.toLowerCase() as StatusKey;
  const colors = STATUS_COLORS[key] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full capitalize ${className}`}
      style={{
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {status}
    </span>
  );
}
