import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Banknote,
  SlidersHorizontal,
  Download,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { AsyncBoundary, Spinner } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import { Field, TextInput, SelectInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { formatCOP, formatDate, formatDateTime, formatPercent } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { loanService, paymentService } from '@/services/api';

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
  ANNUAL: 'Anual',
};

const ACCOUNT_LABEL: Record<string, string> = {
  CAPITAL: 'Capital',
  INTERES: 'Interés',
  MORA: 'Mora',
  CARGOS: 'Cargos',
  CAJA: 'Caja',
};

function ManualPaymentModal({
  loanId,
  onClose,
  onDone,
}: {
  loanId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) {
      notify({ tone: 'warning', title: 'Monto inválido', description: 'Ingresa un monto mayor a cero.' });
      return;
    }
    setBusy(true);
    try {
      await paymentService.registerManual({
        loanId,
        amount: value,
        channel,
        reference: reference || 'SIN-REF',
        registeredBy: 'Ana Prestamista',
      });
      notify({
        tone: 'success',
        title: 'Pago registrado en revisión',
        description: 'Queda PENDING_REVIEW y no impacta el ledger hasta aprobarse.',
      });
      onDone();
      onClose();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pago manual"
      description="El pago nace en revisión; solo impacta el ledger tras aprobarse."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Registrando...' : 'Registrar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Monto (COP)">
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
            />
          )}
        </Field>
        <Field label="Canal">
          {(id) => (
            <SelectInput id={id} value={channel} onChange={(e) => setChannel(e.target.value as 'CASH' | 'TRANSFER')}>
              <option value="CASH">Efectivo</option>
              <option value="TRANSFER">Transferencia</option>
            </SelectInput>
          )}
        </Field>
        <Field
          label={channel === 'CASH' ? 'Número de recibo' : 'Referencia / soporte'}
          hint={channel === 'CASH' ? 'Se genera recibo y se registra caja/usuario.' : 'Registra la referencia de la transferencia.'}
        >
          {(id) => (
            <TextInput id={id} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej. CAJA-0913" />
          )}
        </Field>
      </div>
    </Modal>
  );
}

function AdjustModal({ loanId, onClose, onDone }: { loanId: string; onClose: () => void; onDone: () => void }) {
  const { notify } = useToast();
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!concept || !value || !reason) {
      notify({ tone: 'warning', title: 'Datos incompletos', description: 'Concepto, monto y motivo son obligatorios.' });
      return;
    }
    setBusy(true);
    try {
      await loanService.adjust(loanId, concept, value, reason);
      notify({ tone: 'success', title: 'Ajuste registrado', description: 'No se modifican movimientos previos; se agrega uno nuevo y queda auditado.' });
      onDone();
      onClose();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajuste / reverso auditado"
      description="Los movimientos financieros no se editan ni borran. Un ajuste agrega un movimiento corrector."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn-primary bg-warning-600 hover:bg-warning-700" onClick={submit} disabled={busy}>
            {busy ? 'Aplicando...' : 'Aplicar ajuste'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Concepto">
          {(id) => <TextInput id={id} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Corrección de cargo" />}
        </Field>
        <Field label="Monto (COP, negativo para crédito)" hint="Positivo suma al saldo; negativo lo reduce.">
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))}
              placeholder="Ej. -50000"
            />
          )}
        </Field>
        <Field label="Motivo (obligatorio)">
          {(id) => <TextInput id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justificación del ajuste" />}
        </Field>
      </div>
    </Modal>
  );
}

export function AdminLoanDetail() {
  const { id = '' } = useParams();
  const { notify } = useToast();
  const [tab, setTab] = useState('resumen');
  const [showPay, setShowPay] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [disbursing, setDisbursing] = useState(false);

  const loan = useAsync(() => loanService.get(id), [id]);
  const installments = useAsync(() => loanService.installments(id), [id]);
  const ledger = useAsync(() => loanService.ledger(id), [id]);
  const documents = useAsync(() => loanService.documents(id), [id]);
  const audit = useAsync(() => loanService.auditTrail(id), [id]);

  function reloadFinancials() {
    loan.reload();
    ledger.reload();
    audit.reload();
  }

  async function disburse() {
    setDisbursing(true);
    try {
      await loanService.disburse(id, 'TRANSFER', `TRF-${Date.now().toString().slice(-5)}`);
      notify({ tone: 'success', title: 'Desembolso registrado', description: 'Se emitió LoanDisbursed y se notificó al cliente.' });
      reloadFinancials();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setDisbursing(false);
    }
  }

  if (loan.loading) return <Spinner label="Cargando préstamo..." />;
  if (loan.error || !loan.data) {
    return (
      <Card>
        <p className="text-sm text-danger-600">No se encontró el préstamo {id}.</p>
        <Link to="/admin/prestamos" className="btn-secondary mt-4">
          Volver a préstamos
        </Link>
      </Card>
    );
  }

  const l = loan.data;

  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'amortizacion', label: 'Amortización' },
    { id: 'ledger', label: 'Movimientos (ledger)' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'auditoria', label: 'Auditoría' },
  ];

  return (
    <>
      <Link to="/admin/prestamos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" />
        Préstamos
      </Link>
      <PageHeader
        title={`Préstamo ${l.id}`}
        subtitle={l.customerName}
        actions={
          <>
            {l.status === 'PENDING_DISBURSEMENT' && (
              <button className="btn-primary" onClick={disburse} disabled={disbursing}>
                <Banknote className="h-4 w-4" />
                {disbursing ? 'Desembolsando...' : 'Desembolsar'}
              </button>
            )}
            <button className="btn-secondary" onClick={() => setShowPay(true)}>
              <Banknote className="h-4 w-4" />
              Pago manual
            </button>
            <button className="btn-secondary" onClick={() => setShowAdjust(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              Ajuste
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-ink-500">Saldo pendiente</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{formatCOP(l.outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Capital inicial</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{formatCOP(l.principal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Tasa</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{formatPercent(l.rate)} m.v.</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-500">Estado</p>
          <div className="mt-1.5">
            <DomainStatus status={l.status} />
          </div>
        </Card>
      </div>

      <Card>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        <div className="pt-5">
          {tab === 'resumen' && (
            <dl className="grid grid-cols-2 gap-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-500">Frecuencia</dt>
                <dd className="font-semibold text-ink-900">{FREQ_LABEL[l.frequency]}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Próxima cuota</dt>
                <dd className="font-semibold text-ink-900">{formatDate(l.nextDueDate)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Días de mora</dt>
                <dd className={l.overdueDays > 0 ? 'font-semibold text-danger-600' : 'font-semibold text-ink-900'}>
                  {l.overdueDays > 0 ? `${l.overdueDays} días` : 'Al día'}
                </dd>
              </div>
            </dl>
          )}

          {tab === 'amortizacion' && (
            <AsyncBoundary loading={installments.loading} error={installments.error} data={installments.data} onRetry={installments.reload}>
              <Table>
                <Thead cols={['#', 'Vencimiento', 'Capital', 'Interés', 'Cargos', 'Total', 'Saldo', 'Estado']} />
                <Tbody>
                  {(installments.data ?? []).map((i) => (
                    <Tr key={i.id}>
                      <Td className="font-semibold text-ink-900">{i.number}</Td>
                      <Td>{formatDate(i.dueDate)}</Td>
                      <Td>{formatCOP(i.principal)}</Td>
                      <Td>{formatCOP(i.interest)}</Td>
                      <Td>{formatCOP(i.fees)}</Td>
                      <Td className="font-semibold">{formatCOP(i.total)}</Td>
                      <Td>{formatCOP(i.balance)}</Td>
                      <Td>
                        <DomainStatus status={i.status} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </AsyncBoundary>
          )}

          {tab === 'ledger' && (
            <AsyncBoundary loading={ledger.loading} error={ledger.error} data={ledger.data} onRetry={ledger.reload}>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
                <ShieldCheck className="h-4 w-4 text-success-600" />
                Ledger inmutable. Los movimientos no se editan ni borran; las correcciones se hacen con ajustes.
              </div>
              <Table>
                <Thead cols={['Fecha', 'Concepto', 'Cuenta', 'Débito', 'Crédito', 'Saldo']} />
                <Tbody>
                  {(ledger.data ?? []).map((e) => (
                    <Tr key={e.id}>
                      <Td>{formatDate(e.date)}</Td>
                      <Td>{e.concept}</Td>
                      <Td>{ACCOUNT_LABEL[e.account]}</Td>
                      <Td>{e.debit ? formatCOP(e.debit) : '—'}</Td>
                      <Td className={e.credit ? 'text-success-700' : ''}>{e.credit ? formatCOP(e.credit) : '—'}</Td>
                      <Td className="font-semibold">{formatCOP(e.balance)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </AsyncBoundary>
          )}

          {tab === 'documentos' && (
            <AsyncBoundary loading={documents.loading} error={documents.error} data={documents.data} onRetry={documents.reload}>
              <ul className="divide-y divide-ink-100">
                {(documents.data ?? []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{d.name}</p>
                        <p className="text-xs text-ink-400">{formatDate(d.createdAt)}</p>
                      </div>
                    </div>
                    <button className="btn-ghost text-sm text-brand-700">
                      <Download className="h-4 w-4" />
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-400">Las descargas usan URLs prefirmadas de corta duración.</p>
            </AsyncBoundary>
          )}

          {tab === 'auditoria' && (
            <AsyncBoundary loading={audit.loading} error={audit.error} data={audit.data} onRetry={audit.reload}>
              <ol className="relative space-y-5 border-l border-ink-200 pl-6">
                {(audit.data ?? []).map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-brand-600">
                      <ShieldCheck className="h-3 w-3" />
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-900">{a.action}</span>
                      <span className="text-xs text-ink-400">{formatDateTime(a.at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {a.actor}
                      {a.detail ? ` · ${a.detail}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </AsyncBoundary>
          )}
        </div>
      </Card>

      {showPay && <ManualPaymentModal loanId={id} onClose={() => setShowPay(false)} onDone={reloadFinancials} />}
      {showAdjust && <AdjustModal loanId={id} onClose={() => setShowAdjust(false)} onDone={reloadFinancials} />}
    </>
  );
}
