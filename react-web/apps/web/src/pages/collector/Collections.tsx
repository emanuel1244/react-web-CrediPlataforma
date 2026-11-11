import { useState } from 'react';
import { Phone, MessageSquare, MapPin, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { Field, SelectInput, TextInput, TextArea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatDateTime } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { activityService, loanService } from '@/services/api';
import type { ActivityChannel } from '@/types/domain';

const CHANNEL = {
  CALL: { icon: Phone, label: 'Llamada', tone: 'bg-brand-50 text-brand-700' },
  MESSAGE: { icon: MessageSquare, label: 'Mensaje', tone: 'bg-success-50 text-success-700' },
  VISIT: { icon: MapPin, label: 'Visita', tone: 'bg-warning-50 text-warning-700' },
  OTHER: { icon: MessageSquare, label: 'Otro', tone: 'bg-ink-100 text-ink-600' },
} as const;

export function CollectorCollections() {
  const { notify } = useToast();
  const loansQ = useAsync(() => loanService.list(), []);
  const loans = loansQ.data ?? [];

  const [loanId, setLoanId] = useState('');
  const effectiveLoanId = loanId || loans[0]?.id || '';

  const activitiesQ = useAsync(
    () => (effectiveLoanId ? activityService.listByLoan(effectiveLoanId) : Promise.resolve([])),
    [effectiveLoanId],
  );
  const activities = activitiesQ.data ?? [];

  const [form, setForm] = useState({ channel: 'CALL' as ActivityChannel, result: '', notes: '', promiseDate: '' });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!effectiveLoanId || !form.result) {
      notify({ tone: 'warning', title: 'Datos incompletos', description: 'Selecciona préstamo e indica el resultado.' });
      return;
    }
    setBusy(true);
    try {
      await activityService.create({
        loanId: effectiveLoanId,
        channel: form.channel,
        result: form.result,
        notes: form.notes || undefined,
        promiseDate: form.promiseDate || undefined,
      });
      notify({ tone: 'success', title: 'Gestión registrada' });
      setForm({ channel: 'CALL', result: '', notes: '', promiseDate: '' });
      activitiesQ.reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Cobranza" subtitle="Bitácora de gestiones: llamadas, mensajes y visitas" />

      <div className="mb-4 max-w-xs">
        <Field label="Préstamo">
          {(id) => (
            <SelectInput id={id} value={effectiveLoanId} onChange={(e) => setLoanId(e.target.value)}>
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id} · {l.customerName}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Gestiones del préstamo" subtitle="No se pueden borrar; solo correcciones auditadas" />
          <AsyncBoundary
            loading={activitiesQ.loading}
            error={activitiesQ.error}
            data={activities}
            onRetry={activitiesQ.reload}
            loadingLabel="Cargando gestiones..."
            empty={<EmptyState title="Sin gestiones" description="Registra la primera gestión de este préstamo." />}
          >
            <ol className="relative space-y-5 border-l border-ink-200 pl-6">
              {activities.map((a) => {
                const ch = CHANNEL[a.channel];
                const Icon = ch.icon;
                return (
                  <li key={a.id} className="relative">
                    <span className={`absolute -left-[33px] grid h-7 w-7 place-items-center rounded-full ${ch.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-900">
                        {ch.label} · {a.loanId}
                      </span>
                      <span className="text-xs text-ink-400">{formatDateTime(a.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-600">
                      <span className="font-medium">{a.result}.</span> {a.notes}
                    </p>
                    {a.promiseDate && (
                      <p className="mt-1 inline-flex rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
                        Promesa de pago: {formatDate(a.promiseDate)}
                      </p>
                    )}
                    {a.createdBy && <p className="mt-0.5 text-xs text-ink-400">Por {a.createdBy}</p>}
                  </li>
                );
              })}
            </ol>
          </AsyncBoundary>
        </Card>

        <Card>
          <CardHeader title="Nueva gestión" />
          <div className="space-y-4">
            <Field label="Canal">
              {(id) => (
                <SelectInput id={id} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as ActivityChannel }))}>
                  <option value="CALL">Llamada</option>
                  <option value="MESSAGE">Mensaje</option>
                  <option value="VISIT">Visita</option>
                  <option value="OTHER">Otro</option>
                </SelectInput>
              )}
            </Field>
            <Field label="Resultado">
              {(id) => <TextInput id={id} value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} placeholder="Ej. Promesa de pago" />}
            </Field>
            <Field label="Observaciones">
              {(id) => <TextArea id={id} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Detalle de la gestión..." />}
            </Field>
            <Field label="Promesa de pago (opcional)">
              {(id) => <TextInput id={id} type="date" value={form.promiseDate} onChange={(e) => setForm((f) => ({ ...f, promiseDate: e.target.value }))} />}
            </Field>
            <button className="btn-primary w-full" onClick={save} disabled={busy}>
              <Plus className="h-4 w-4" />
              {busy ? 'Guardando...' : 'Guardar gestión'}
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
