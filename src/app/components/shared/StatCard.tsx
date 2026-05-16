import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  iconBg?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

/**
 * KPI metric card used on the Dashboard and Finance pages.
 */
export function StatCard({ title, value, subtitle, icon, iconBg = '#EFF6FF', trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[#6B7280] mb-1 truncate" style={{ fontSize: 13, fontWeight: 500 }}>
            {title}
          </p>
          <p className="text-[#272936] truncate" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-[#9CA3AF] mt-1" style={{ fontSize: 12 }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p
              className="mt-1.5"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: trend.positive ? '#16A34A' : '#DC2626',
              }}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
