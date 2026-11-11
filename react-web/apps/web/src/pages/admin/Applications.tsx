import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCOP, formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { applicationService } from '@/services/api';
import type { LoanApplication } from '@/types/domain';

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'SUBMITTED', label: 'Enviada' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'REJECTED', label: 'Rechazada' },
];

function EvaluationPanel({
  app,
  onApprove,
  onReject,
}: {
  app: LoanApplication;
  onApprove: (rate: string) => void;
  onReject: () => void;
}) {
  const [rate, setRate] = useState('2.2');
  const monthlyRate = Number(rate) / 100;
  const estimated =
    monthlyRate > 0
      ? Math.round((app.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -app.termMonths)))
      : Math.round(app.amount / app.termMonths);
  const total = estimated * app.termMonths;
  const decided = app.status === 'APPROVED' || app.status === 'REJECTED';

  return (
    <Card>
      <CardHeader title={`Evaluar ${app.id}`} subtitle={app.customerName} />
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-ink-500">Monto solicitado</dt>
          <dd className="font-semibold text-ink-900">{formatCOP(app.amount)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Plazo</dt>
          <dd className="font-semibold text-ink-900">{app.termMonths} meses</dd>
        </div>
        <div>
          <dt className="text-ink-500">Frecuencia</dt>
          <dd className="font-semibold text-ink-900">{FREQ_LABEL[app.frequency]}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Propósito</dt>
          <dd className="font-semibold text-ink-900">{app.purpose ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-ink-100 pt-5">
        <label className="label" htmlFor="rate">
          Tasa de interés mensual (%)
        </label>
        <input
          id="rate"
          className="input max-w-[140px]"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
          disabled={decided}
        />
        <p className="mt-1.5 text-xs text-ink-400">
          La tasa la define el prestamista por solicitud. Se registra usuario, fecha y periodicidad.
        </p>
      </div>

      <div className="mt-5 rounded-lg bg-brand-50 p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-brand-600" />
          <div className="text-sm">
            <p className="font-medium text-brand-900">Resumen estimado para el cliente</p>
            <p className="mt-1 text-brand-700">
              Cuota aprox. <strong>{formatCOP(estimated)}</strong> · Total{' '}
              <strong>{formatCOP(total)}</strong> · Intereses{' '}
              <strong>{formatCOP(total - app.amount)}</strong>
            </p>
            <p className="mt-1 text-xs text-brand-600">Cálculo ilustrativo; el backend valida el definitivo.</p>
          </div>
        </div>
      </div>

      {decided ? (
        <div className="mt-5 text-center">
          <DomainStatus status={app.status} />
          <p className="mt-2 text-xs text-ink-400">Esta solicitud ya tiene decisión registrada.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-3">
            <button
              className="btn-primary flex-1 bg-success-600 hover:bg-success-700"
              onClick={() => onApprove(rate)}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar
            </button>
            <button className="btn-secondary flex-1 text-danger-600" onClick={onReject}>
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-400">
            Aprobar no desembolsa. El cliente recibe push: desembolso en máx. 72h hábiles.
          </p>
        </>
      )}
    </Card>
  );
}

export function AdminApplications() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => applicationService.list(), []);
  const apps = data ?? [];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    app: LoanApplication;
    decision: 'APPROVED' | 'REJECTED';
    rate?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      const matchesText = !q || a.customerName.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || a.status === status;
      return matchesText && matchesStatus;
    });
  }, [apps, search, status]);

  const selected =
    filtered.find((a) => a.id === selectedId) ??
    filtered.find((a) => ['SUBMITTED', 'IN_REVIEW'].includes(a.status)) ??
    filtered[0] ??
    null;

  const hasFilters = search !== '' || status !== 'ALL';

  async function confirmDecision() {
    if (!pendingAction) return;
    setBusy(true);
    try {
      await applicationService.decide(pendingAction.app.id, pendingAction.decision);
      if (pendingAction.decision === 'APPROVED') {
        notify({
          tone: 'success',
          title: 'Solicitud aprobada',
          description: `Tasa ${pendingAction.rate}% m.v. · Push de desembolso (72h hábiles) encolado.`,
        });
      } else {
        notify({ tone: 'warning', title: 'Solicitud rechazada', description: pendingAction.app.customerName });
      }
      setPendingAction(null);
      reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Solicitudes" subtitle="Bandeja de evaluación y aprobación" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Bandeja de solicitudes" subtitle={`${filtered.length} solicitudes`} />
          <FilterBar
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Buscar por cliente o ID..."
            selects={[
              { value: status, onChange: setStatus, options: STATUS_OPTIONS, ariaLabel: 'Filtrar por estado' },
            ]}
            hasActiveFilters={hasFilters}
            onClear={() => {
              setSearch('');
              setStatus('ALL');
            }}
          />
          <AsyncBoundary
            loading={loading}
            error={error}
            data={filtered}
            onRetry={reload}
            loadingLabel="Cargando solicitudes..."
            empty={
              <EmptyState
                icon={<FileText className="h-7 w-7" />}
                title="Sin solicitudes"
                description={hasFilters ? 'Ninguna coincide con los filtros.' : 'No hay solicitudes.'}
              />
            }
          >
            <Table>
              <Thead cols={['ID', 'Cliente', 'Monto', 'Plazo', 'Enviada', 'Estado']} />
              <Tbody>
                {filtered.map((a) => (
                  <Tr key={a.id} onClick={() => setSelectedId(a.id)}>
                    <Td className="font-semibold text-ink-900">{a.id}</Td>
                    <Td>{a.customerName}</Td>
                    <Td>{formatCOP(a.amount)}</Td>
                    <Td>{a.termMonths} m</Td>
                    <Td>{formatDate(a.submittedAt)}</Td>
                    <Td>
                      <DomainStatus status={a.status} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </AsyncBoundary>
        </Card>

        {selected ? (
          <EvaluationPanel
            app={selected}
            onApprove={(rate) => setPendingAction({ app: selected, decision: 'APPROVED', rate })}
            onReject={() => setPendingAction({ app: selected, decision: 'REJECTED' })}
          />
        ) : (
          <Card>
            <EmptyState title="Selecciona una solicitud" description="Elige una de la lista para evaluarla." />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmDecision}
        title={pendingAction?.decision === 'APPROVED' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
        description={
          pendingAction?.decision === 'APPROVED'
            ? `Aprobar la solicitud ${pendingAction?.app.id} de ${pendingAction?.app.customerName} con tasa ${pendingAction?.rate}% m.v. No se desembolsa automáticamente.`
            : `¿Rechazar la solicitud ${pendingAction?.app.id}? Quedará registrada la decisión y el motivo.`
        }
        confirmLabel={pendingAction?.decision === 'APPROVED' ? 'Aprobar' : 'Rechazar'}
        tone={pendingAction?.decision === 'APPROVED' ? 'success' : 'danger'}
        loading={busy}
      />
    </>
  );
}
