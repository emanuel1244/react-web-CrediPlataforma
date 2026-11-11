import { Briefcase, HandCoins, AlertTriangle, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { formatCOP, formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { loanService, paymentService } from '@/services/api';

export function CollectorPortfolio() {
  // En la demo el cobrador ve la cartera del tenant. Con Cognito, el backend
  // filtrará por collector_user_id según asignación vigente.
  const loansQ = useAsync(() => loanService.list(), []);
  const paymentsQ = useAsync(() => paymentService.list(), []);

  const loans = loansQ.data ?? [];
  const payments = paymentsQ.data ?? [];

  const montoAsignado = loans.reduce((s, l) => s + l.outstanding, 0);
  const recaudoPeriodo = payments
    .filter((p) => p.status === 'APPROVED')
    .reduce((s, p) => s + p.amount, 0);
  const cuotasVencidas = loans.filter((l) => l.overdueDays > 0).length;
  const compromisosPendientes = payments.filter((p) => p.status === 'PENDING_REVIEW').length;

  return (
    <>
      <PageHeader
        title="Mi cartera"
        subtitle="Préstamos asignados · datos en vivo (el backend filtrará por cobrador con Cognito)"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Monto en cartera" value={formatCOP(montoAsignado)} icon={Briefcase} tone="brand" />
        <KpiCard label="Recaudo aprobado" value={formatCOP(recaudoPeriodo)} icon={HandCoins} tone="success" />
        <KpiCard label="Préstamos en mora" value={String(cuotasVencidas)} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Recaudos en revisión" value={String(compromisosPendientes)} icon={CalendarClock} tone="warning" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Préstamos asignados" subtitle="Cartera del tenant" />
        <AsyncBoundary
          loading={loansQ.loading}
          error={loansQ.error}
          data={loans}
          onRetry={loansQ.reload}
          loadingLabel="Cargando cartera..."
          empty={<EmptyState title="Sin préstamos asignados" description="Aún no hay cartera para gestionar." />}
        >
          <Table>
            <Thead cols={['Préstamo', 'Cliente', 'Saldo', 'Próx. vencimiento', 'Mora', 'Estado']} />
            <Tbody>
              {loans.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-semibold text-ink-900">{l.id}</Td>
                  <Td>{l.customerName}</Td>
                  <Td>{formatCOP(l.outstanding)}</Td>
                  <Td>{formatDate(l.nextDueDate)}</Td>
                  <Td className={l.overdueDays > 0 ? 'font-semibold text-danger-600' : ''}>
                    {l.overdueDays > 0 ? `${l.overdueDays} días` : '—'}
                  </Td>
                  <Td>
                    <DomainStatus status={l.status} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </AsyncBoundary>
      </Card>
    </>
  );
}
