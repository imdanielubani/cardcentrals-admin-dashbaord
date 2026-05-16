import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}

/**
 * Page-level pagination bar with prev/next and numbered page buttons.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  limit,
  onPrev,
  onNext,
  onPage,
}: PaginationProps) {
  const from = Math.min((page - 1) * limit + 1, totalItems);
  const to = Math.min(page * limit, totalItems);

  // Show up to 5 page buttons centered on current page
  const visiblePages = buildPageRange(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
      <p className="text-[#6B7280]" style={{ fontSize: 13 }}>
        Showing <span className="font-medium text-[#272936]">{from}–{to}</span> of{' '}
        <span className="font-medium text-[#272936]">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {visiblePages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[#9CA3AF]" style={{ fontSize: 13 }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                p === page
                  ? 'bg-[#0159C7] border-[#0159C7] text-white'
                  : 'border-border text-[#6B7280] hover:bg-[#F5F7FB]'
              }`}
              style={{ fontSize: 13, fontWeight: p === page ? 600 : 400 }}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#6B7280] hover:bg-[#F5F7FB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
