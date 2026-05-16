import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export function usePagination(defaultLimit = 20) {
  const [page, setPage] = useState(1);
  const [limit] = useState(defaultLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const setMeta = useCallback(
    (meta: { pages: number; total: number }) => {
      setTotalPages(meta.pages);
      setTotalItems(meta.total);
    },
    [],
  );

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages],
  );

  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page]);

  const resetPage = useCallback(() => setPage(1), []);

  return {
    page,
    limit,
    totalPages,
    totalItems,
    setMeta,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
