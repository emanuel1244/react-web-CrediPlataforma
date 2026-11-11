import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SelectFilter {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}

interface FilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  onClear?: () => void;
  hasActiveFilters?: boolean;
  extra?: ReactNode;
}

/** Barra de filtros reutilizable: búsqueda de texto + selects + limpiar. */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = 'Buscar...',
  selects = [],
  onClear,
  hasActiveFilters = false,
  extra,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </div>
      {selects.map((s, i) => (
        <select
          key={i}
          className="input sm:w-48"
          value={s.value}
          onChange={(e) => s.onChange(e.target.value)}
          aria-label={s.ariaLabel}
        >
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {extra}
      {hasActiveFilters && onClear && (
        <button className="btn-ghost text-sm" onClick={onClear}>
          <X className="h-4 w-4" />
          Limpiar
        </button>
      )}
    </div>
  );
}
