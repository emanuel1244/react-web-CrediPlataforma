import { Link } from 'react-router-dom';
import { CreditCard, Landmark, CalendarClock, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { formatCOP, formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { loanService } from '@/services/api';

export function CustomerHome() {
  // En la demo el cliente ve el primer préstamo activo del tenant. Con Cognito,
  // el backend devolverá solo los préstamos del cliente autenticado.
  const data = useAsync(async () => {
    const loans = await loanService.list();
    const loan = loans.find((l) => l.status === 'ACTIVE') ?? loans[0] ?? null;
    const installments = loan ? await loanService.installments(loan.id) : [];
    return { loan, installments };
  }, []);

  const loan = data.data?.loan ?? null;
  const installments = data.data?.installments ?? [];
  const nextDue = installments.find((i) => i.status === 'PENDING');
  const paidCount = installments.filter((i) => i.status === 'PAID').length;
  const progress = installments.length ? Math.round((paidCount / installments.length) * 100) : 0;

  return (
    <>
      <PageHeader title="Hola 👋" subtitle="Resumen de tus obligaciones (datos en vivo)" />

      <AsyncBoundary
        loading={data.loading}
        error={data.error}
        data={data.data}
        onRetry={data.reload}
        loadingLabel="Cargando tus préstamos..."
      >
        {!loan ? (
          <Card>
            <EmptyState title="Sin préstamos" description="No hay préstamos para mostrar en este tenant." />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="bg-brand-900 text-white lg:col-span-1">
                <p className="text-sm font-medium text-brand-100">Tu próxima cuota</p>
                <p className="mt-2 text-3xl font-bold">{nextDue ? formatCOP(nextDue.total) : '—'}</p>
                <p className="mt-1 text-sm text-brand-200">
                  Vence el {nextDue ? formatDate(nextDue.dueDate) : '—'}
                </p>
                <Link to="/cliente/pagar" className="btn mt-5 w-full bg-white text-brand-900 hover:bg-brand-50">
                  <CreditCard className="h-4 w-4" />
                  Pagar ahora
                </Link>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader title="Mi préstamo" subtitle={loan.id} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-ink-500">Saldo pendiente</p>
                    <p className="text-lg font-bold text-ink-900">{formatCOP(loan.outstanding)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-500">Capital inicial</p>
                    <p className="text-lg font-bold text-ink-900">{formatCOP(loan.principal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ink-500">Cuotas pagadas</p>
                    <p className="text-lg font-bold text-ink-900">
                      {paidCount} / {installments.length}
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-success-500" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Link to="/cliente/prestamos" className="btn-secondary flex-col py-3 text-xs">
                    <Landmark className="h-5 w-5" />
                    Préstamos
                  </Link>
                  <Link to="/cliente/cuotas" className="btn-secondary flex-col py-3 text-xs">
                    <CalendarClock className="h-5 w-5" />
                    Cuotas
                  </Link>
                  <Link to="/cliente/documentos" className="btn-secondary flex-col py-3 text-xs">
                    <FileText className="h-5 w-5" />
                    Documentos
                  </Link>
                </div>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader title="Plan de pagos" subtitle="Calendario de amortización" />
              {installments.length === 0 ? (
                <EmptyState title="Sin cuotas" description="Este préstamo aún no tiene calendario generado." />
              ) : (
                <Table>
                  <Thead cols={['#', 'Vencimiento', 'Capital', 'Interés', 'Total', 'Estado']} />
                  <Tbody>
                    {installments.map((i) => (
                      <Tr key={i.id}>
                        <Td className="font-semibold text-ink-900">{i.number}</Td>
                        <Td>{formatDate(i.dueDate)}</Td>
                        <Td>{formatCOP(i.principal)}</Td>
                        <Td>{formatCOP(i.interest)}</Td>
                        <Td className="font-semibold">{formatCOP(i.total)}</Td>
                        <Td>
                          <DomainStatus status={i.status} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Card>
          </>
        )}
      </AsyncBoundary>
    </>
  );
}
