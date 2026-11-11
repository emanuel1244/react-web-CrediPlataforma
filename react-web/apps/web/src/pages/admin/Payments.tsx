import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Receipt, Clock, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCOP, formatDateTime } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { paymentService } from '@/services/api';
import type { Payment } from '@/types/domain';

const CHANNEL_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  PSE: 'PSE',
  CARD: 'Tarjeta',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'PENDING_REVIEW', label: 'En revisión' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'DECLINED', label: 'Rechazado' },
];

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'Todos los canales' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'PSE', label: 'PSE' },
  { value: 'CARD', label: 'Tarjeta' },
];

export function AdminPayments() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => paymentService.list(), []);
  const payments = data ?? [];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [channel, setChannel] = useState('ALL');
  const [action, setAction] = useState<{ payment: Payment; approve: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const pendingCount = payments.filter((p) => p.status === 'PENDING_REVIEW').length;
  const pendingAmount = payments
    .filter((p) => p.status === 'PENDING_REVIEW')
    .reduce((sum, p) => sum + p.amount, 0);
  const approvedAmount = payments
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + p.amount, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesText =
        !q || p.loanId.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || p.status === status;
      const matchesChannel = channel === 'ALL' || p.channel === channel;
      return matchesText && matchesStatus && matchesChannel;
    });
  }, [payments, search, status, channel]);

  const { page, setPage, pageSize, paged, total } = usePagination(filtered);
  const hasFilters = search !== '' || status !== 'PENDING_REVIEW' || channel !== 'ALL';

  async function confirm() {
    if (!action) return;
    setBusy(true);
    try {
      await paymentService.review(action.payment.id, action.approve);
      notify({
        tone: action.approve ? 'success' : 'warning',
        title: action.approve ? 'Pago aprobado' : 'Pago rechazado',
        description: action.approve
          ? 'Se aplicó al ledger y quedó auditado.'
          : 'Quedó como rechazado y auditado; no impacta el saldo.',
      });
      setAction(null);
      reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Cuotas y recaudos"
        subtitle="Revisión y aprobación de pagos manuales (efectivo / transferencia)"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pagos en revisión" value={String(pendingCount)} icon={Clock} tone="warning" />
        <KpiCard label="Monto en revisión" value={formatCOP(pendingAmount)} icon={Receipt} tone="warning" hint="Aún no impacta el saldo" />
        <KpiCard label="Aprobado (histórico)" value={formatCOP(approvedAmount)} icon={ShieldCheck} tone="success" hint="Aplicado al ledger" />
      </div>

      <Card>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Un pago manual solo impacta el ledger cuando se aprueba aquí. Aprobar o rechazar queda
            registrado en la auditoría del préstamo con tu usuario y la fecha.
          </p>
        </div>

        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por préstamo o referencia..."
          selects={[
            { value: status, onChange: setStatus, options: STATUS_OPTIONS, ariaLabel: 'Filtrar por estado' },
            { value: channel, onChange: setChannel, options: CHANNEL_OPTIONS, ariaLabel: 'Filtrar por canal' },
          ]}
          hasActiveFilters={hasFilters}
          onClear={() => {
            setSearch('');
            setStatus('PENDING_REVIEW');
            setChannel('ALL');
          }}
        />

        <AsyncBoundary
          loading={loading}
          error={error}
          data={filtered}
          onRetry={reload}
          loadingLabel="Cargando recaudos..."
          empty={
            <EmptyState
              icon={<Receipt className="h-7 w-7" />}
              title="Sin recaudos"
              description={
                hasFilters
                  ? 'Ningún pago coincide con los filtros.'
                  : 'No hay pagos manuales en revisión por el momento.'
              }
            />
          }
        >
          <Table>
            <Thead cols={['Préstamo', 'Monto', 'Canal', 'Referencia', 'Registrado por', 'Fecha', 'Estado', '']} />
            <Tbody>
              {paged.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link to={`/admin/prestamos/${p.loanId}`} className="font-semibold text-brand-700 hover:underline">
                      {p.loanId}
                    </Link>
                  </Td>
                  <Td className="font-semibold">{formatCOP(p.amount)}</Td>
                  <Td>{CHANNEL_LABEL[p.channel]}</Td>
                  <Td>{p.reference}</Td>
                  <Td>{p.registeredBy ?? '—'}</Td>
                  <Td>{formatDateTime(p.createdAt)}</Td>
                  <Td>
                    <DomainStatus status={p.status} />
                  </Td>
                  <Td>
                    {p.status === 'PENDING_REVIEW' ? (
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost p-1.5 text-success-600"
                          onClick={() => setAction({ payment: p, approve: true })}
                          aria-label={`Aprobar pago ${p.reference}`}
                          title="Aprobar"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost p-1.5 text-danger-600"
                          onClick={() => setAction({ payment: p, approve: false })}
                          aria-label={`Rechazar pago ${p.reference}`}
                          title="Rechazar"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="block text-right text-xs text-ink-400">Resuelto</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </AsyncBoundary>
      </Card>

      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={confirm}
        title={action?.approve ? 'Aprobar pago' : 'Rechazar pago'}
        description={
          action?.approve
            ? `¿Aprobar ${formatCOP(action?.payment.amount ?? 0)} del préstamo ${action?.payment.loanId}? Al aprobar se aplica al ledger y se refleja en el saldo del cliente.`
            : `¿Rechazar ${formatCOP(action?.payment.amount ?? 0)} del préstamo ${action?.payment.loanId}? No impactará el saldo y quedará registrado el rechazo.`
        }
        confirmLabel={action?.approve ? 'Aprobar y aplicar' : 'Rechazar'}
        tone={action?.approve ? 'success' : 'danger'}
        loading={busy}
      />
    </>
  );
}
