import { Inbox, Loader2, AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-400">
        {icon ?? <Inbox className="h-7 w-7" />}
      </span>
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-600">
        <AlertCircle className="h-7 w-7" />
      </span>
      <p className="text-base font-semibold text-ink-900">No se pudieron cargar los datos</p>
      <p className="max-w-sm text-sm text-ink-500">{message ?? 'Ocurrió un error inesperado.'}</p>
      {onRetry && (
        <button className="btn-secondary mt-2" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

/**
 * Wrapper que resuelve los tres estados de una operación async.
 * Centraliza loading / error / empty para no repetirlo en cada página.
 */
export function AsyncBoundary<T>({
  loading,
  error,
  data,
  onRetry,
  empty,
  children,
  loadingLabel,
}: {
  loading: boolean;
  error: Error | null;
  data: T[] | T | null;
  onRetry?: () => void;
  empty?: ReactNode;
  children: ReactNode;
  loadingLabel?: string;
}) {
  if (loading) return <Spinner label={loadingLabel} />;
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />;
  const isEmpty = Array.isArray(data) ? data.length === 0 : data == null;
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
