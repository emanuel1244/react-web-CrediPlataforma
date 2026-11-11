import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { formatCOP, formatDate, formatPercent } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { loanService } from '@/services/api';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'PENDING_DISBURSEMENT', label: 'Por desembolsar' },
  { value: 'DEFAULTED', label: 'En mora' },
  { value: 'PAID_OFF', label: 'Liquidado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const MORA_OPTIONS = [
  { value: 'ALL', label: 'Mora: todas' },
  { value: 'OVERDUE', label: 'Solo en mora' },
  { value: 'CURRENT', label: 'Solo al día' },
];

export function AdminLoans() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => loanService.list(), []);
  const loans = data ?? [];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [mora, setMora] = useState('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => {
      const matchesText =
        !q || l.id.toLowerCase().includes(q) || l.customerName.toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || l.status === status;
      const matchesMora =
        mora === 'ALL' ||
        (mora === 'OVERDUE' && l.overdueDays > 0) ||
        (mora === 'CURRENT' && l.overdueDays === 0);
      return matchesText && matchesStatus && matchesMora;
    });
  }, [loans, search, status, mora]);

  const { page, setPage, pageSize, paged, total } = usePagination(filtered);
  const hasFilters = search !== '' || status !== 'ALL' || mora !== 'ALL';

  return (
    <>
      <PageHeader title="Préstamos" subtitle="Cartera colocada del tenant" />
      <Card>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por ID o cliente..."
          selects={[
            { value: status, onChange: setStatus, options: STATUS_OPTIONS, ariaLabel: 'Filtrar por estado' },
            { value: mora, onChange: setMora, options: MORA_OPTIONS, ariaLabel: 'Filtrar por mora' },
          ]}
          hasActiveFilters={hasFilters}
          onClear={() => {
            setSearch('');
            setStatus('ALL');
            setMora('ALL');
          }}
        />

        <AsyncBoundary
          loading={loading}
          error={error}
          data={filtered}
          onRetry={reload}
          loadingLabel="Cargando préstamos..."
          empty={
            <EmptyState
              icon={<Landmark className="h-7 w-7" />}
              title="Sin resultados"
              description={hasFilters ? 'Ningún préstamo coincide con los filtros.' : 'Aún no hay préstamos.'}
            />
          }
        >
          <Table>
            <Thead cols={['Préstamo', 'Cliente', 'Capital', 'Saldo', 'Tasa', 'Próx. cuota', 'Mora', 'Estado']} />
            <Tbody>
              {paged.map((l) => (
                <Tr key={l.id} onClick={() => navigate(`/admin/prestamos/${l.id}`)}>
                  <Td className="font-semibold text-brand-700">{l.id}</Td>
                  <Td>{l.customerName}</Td>
                  <Td>{formatCOP(l.principal)}</Td>
                  <Td>{formatCOP(l.outstanding)}</Td>
                  <Td>{formatPercent(l.rate)} m.v.</Td>
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
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </AsyncBoundary>
      </Card>
    </>
  );
}
