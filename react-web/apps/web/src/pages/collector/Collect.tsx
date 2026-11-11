import { useState } from 'react';
import { HandCoins, Receipt, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, SelectInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/auth/session';
import { loanService, paymentService } from '@/services/api';
import { formatCOP, formatDateTime } from '@/lib/format';
import type { Payment } from '@/types/domain';

const CHANNEL_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  PSE: 'PSE',
  CARD: 'Tarjeta',
};

function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Recibo de recaudo" size="sm">
      <div className="rounded-lg border border-dashed border-ink-300 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink-900">CrediPlataforma</span>
          <span className="rounded bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700">
            En revisión
          </span>
        </div>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between">
            <dt className="text-ink-500">Recibo</dt>
            <dd className="font-medium">{payment.reference}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Préstamo</dt>
            <dd className="font-medium">{payment.loanId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Canal</dt>
            <dd className="font-medium">{CHANNEL_LABEL[payment.channel]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Registrado por</dt>
            <dd className="font-medium">{payment.registeredBy}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Fecha</dt>
            <dd className="font-medium">{formatDateTime(payment.createdAt)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
            <dt className="font-semibold text-ink-900">Monto</dt>
            <dd className="font-bold text-ink-900">{formatCOP(payment.amount)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-400">
          Este recaudo queda en revisión y será validado por el prestamista antes de aplicarse al
          saldo (ledger). No constituye paz y salvo hasta su aprobación.
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

export function CollectorCollect() {
  const { notify } = useToast();
  const { user } = useSession();

  // Préstamos reales del tenant (en backend se filtrará por cobrador con Cognito).
  const loansQ = useAsync(() => loanService.list(), []);
  const portfolio = loansQ.data ?? [];

  const { data, loading, error, reload } = useAsync(() => paymentService.list(), []);

  const [form, setForm] = useState({ loanId: '', amount: '', channel: 'CASH' as 'CASH' | 'TRANSFER', reference: '' });
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  async function submit() {
    const value = Number(form.amount);
    const loanId = form.loanId || portfolio[0]?.id;
    if (!loanId || !value || value <= 0) {
      notify({ tone: 'warning', title: 'Datos incompletos', description: 'Selecciona préstamo y un monto válido.' });
      return;
    }
    setBusy(true);
    try {
      const payment = await paymentService.registerManual({
        loanId,
        amount: value,
        channel: form.channel,
        reference: form.reference || `${form.channel === 'CASH' ? 'CAJA' : 'TRF'}-${Date.now().toString().slice(-4)}`,
        registeredBy: user?.name ?? 'Cobrador',
      });
      notify({
        tone: 'success',
        title: 'Recaudo registrado',
        description: 'Queda en revisión; no impacta el ledger hasta aprobarse.',
      });
      setForm((f) => ({ ...f, amount: '', reference: '' }));
      setReceipt(payment);
      reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Recaudos" subtitle="Registrar efectivo o transferencia de tu cartera asignada" />

      <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Todo recaudo manual queda en estado <strong>En revisión</strong> y solo impacta el saldo
          del cliente cuando el prestamista lo aprueba. Se genera recibo y se registra tu usuario.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Nuevo recaudo" />
          <div className="space-y-4">
            <Field label="Préstamo (cartera asignada)">
              {(id) => (
                <SelectInput id={id} value={form.loanId} onChange={(e) => setForm((f) => ({ ...f, loanId: e.target.value }))}>
                  <option value="">Selecciona un préstamo</option>
                  {portfolio.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.id} · {l.customerName}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label="Monto (COP)">
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))}
                  placeholder="0"
                />
              )}
            </Field>
            <Field label="Canal">
              {(id) => (
                <SelectInput id={id} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as 'CASH' | 'TRANSFER' }))}>
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                </SelectInput>
              )}
            </Field>
            <Field
              label={form.channel === 'CASH' ? 'Número de recibo' : 'Referencia / soporte'}
              hint={form.channel === 'CASH' ? 'Se registra caja y usuario.' : 'Adjunta la referencia de la transferencia.'}
            >
              {(id) => (
                <TextInput id={id} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Opcional" />
              )}
            </Field>
            <button className="btn-primary w-full" onClick={submit} disabled={busy}>
              <HandCoins className="h-4 w-4" />
              {busy ? 'Registrando...' : 'Registrar recaudo'}
            </button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recaudos de mi cartera" subtitle="Estado y recibo" />
          <AsyncBoundary
            loading={loading}
            error={error}
            data={data}
            onRetry={reload}
            loadingLabel="Cargando recaudos..."
            empty={
              <EmptyState
                icon={<Receipt className="h-7 w-7" />}
                title="Aún no has registrado recaudos"
                description="Los recaudos de tu cartera aparecerán aquí con su estado."
              />
            }
          >
            <Table>
              <Thead cols={['Préstamo', 'Monto', 'Canal', 'Referencia', 'Fecha', 'Estado', '']} />
              <Tbody>
                {(data ?? []).map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-semibold text-ink-900">{p.loanId}</Td>
                    <Td>{formatCOP(p.amount)}</Td>
                    <Td>{CHANNEL_LABEL[p.channel]}</Td>
                    <Td>{p.reference}</Td>
                    <Td>{formatDateTime(p.createdAt)}</Td>
                    <Td>
                      <DomainStatus status={p.status} />
                    </Td>
                    <Td>
                      <button className="btn-ghost text-xs text-brand-700" onClick={() => setReceipt(p)}>
                        <Receipt className="h-3.5 w-3.5" />
                        Recibo
                      </button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
              Los recaudos aprobados por el prestamista se reflejan en el saldo del cliente.
            </p>
          </AsyncBoundary>
        </Card>
      </div>

      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
