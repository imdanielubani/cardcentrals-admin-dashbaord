import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/**
 * Shown when a data list is empty (no results, filtered out, etc.).
 */
export function EmptyState({
  title = 'No results found',
  description = 'Try adjusting your filters or search query.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F5F7FB] flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-7 h-7 text-[#D1D5DB]" />}
      </div>
      <p className="text-[#272936] mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        {title}
      </p>
      <p className="text-[#9CA3AF] max-w-xs" style={{ fontSize: 13 }}>
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
