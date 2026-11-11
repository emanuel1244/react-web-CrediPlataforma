import { useEffect, useMemo, useState } from 'react';

/** Pagina un arreglo en cliente y resetea la página si cambia el total. */
export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const paged = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return { page, setPage, pageSize, paged, total: items.length };
}
