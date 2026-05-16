import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * Consistent page title + subtitle + optional action buttons bar.
 * Used at the top of every admin page.
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[#272936]" style={{ fontSize: 22, fontWeight: 700 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#6B7280] mt-0.5" style={{ fontSize: 14 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
