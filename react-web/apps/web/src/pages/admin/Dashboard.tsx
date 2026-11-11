import {
  Wallet,
  Landmark,
  TrendingUp,
  AlertTriangle,
  CircleDollarSign,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatCOP, formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { dashboardService, loanService } from '@/services/api';
import { recaudoMensual } from '@/data/mock';
import { useState } from 'react';

const compactCOP = (v: number) => `$${(v / 1_000_000).toFixed(0)}M`;

export function AdminDashboard() {
  const { notify } = useToast();
  const kpis = useAsync(() => dashboardService.summary(), []);
  const loansQ = useAsync(() => loanService.list(), []);
  const [seeding, setSeeding] = useState(false);

  const loans = loansQ.data ?? [];
  const alDia = Math.max(0, (kpis.data?.carteraPorCobrar ?? 0) - (kpis.data?.carteraVencida ?? 0));
  const composicion = [
    { nombre: 'Al día', valor: alDia, color: '#039855' },
    { nombre: 'Vencida', valor: kpis.data?.carteraVencida ?? 0, color: '#d92d20' },
  ];

  async function reseed() {
    setSeeding(true);
    try {
      await dashboardService.seed();
      notify({ tone: 'success', title: 'Datos de ejemplo cargados' });
      kpis.reload();
      loansQ.reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen de cartera, recaudo y liquidez · datos en vivo desde AWS"
        actions={
          <button className="btn-secondary" onClick={reseed} disabled={seeding}>
            <RefreshCw className="h-4 w-4" />
            {seeding ? 'Cargando...' : 'Cargar datos demo'}
          </button>
        }
      />

      {/* KPIs reales desde la API. Capital/interés/liquidez se muestran separados. */}
      <AsyncBoundary
        loading={kpis.loading}
        error={kpis.error}
        data={kpis.data}
        onRetry={kpis.reload}
        loadingLabel="Cargando indicadores..."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Capital colocado pendiente" value={formatCOP(kpis.data?.capitalColocado ?? 0)} icon={Landmark} tone="brand" hint="Por recuperar" />
          <KpiCard label="Capital recuperado" value={formatCOP(kpis.data?.capitalRecuperado ?? 0)} icon={Wallet} tone="success" hint="No es utilidad" />
          <KpiCard label="Cartera por cobrar" value={formatCOP(kpis.data?.carteraPorCobrar ?? 0)} icon={CircleDollarSign} tone="brand" />
          <KpiCard label="Cartera vencida" value={formatCOP(kpis.data?.carteraVencida ?? 0)} icon={AlertTriangle} tone="danger" hint={`${kpis.data?.prestamosEnMora ?? 0} préstamos en mora`} />
          <KpiCard label="Préstamos activos" value={String(kpis.data?.prestamosActivos ?? 0)} icon={TrendingUp} tone="success" />
          <KpiCard label="Préstamos liquidados" value={String(kpis.data?.prestamosLiquidados ?? 0)} icon={Wallet} tone="brand" />
        </div>
      </AsyncBoundary>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recaudo vs. vencido" subtitle="Serie mensual (ilustrativa)" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recaudoMensual} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
                <YAxis tickFormatter={compactCOP} tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" width={44} />
                <Tooltip formatter={(v: number) => formatCOP(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" />
                <Bar dataKey="recaudo" name="Recaudo" fill="#1f427f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vencido" name="Vencido" fill="#d92d20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-ink-400">La serie histórica es ilustrativa; los KPIs superiores son datos reales.</p>
        </Card>

        <Card>
          <CardHeader title="Composición de cartera" subtitle="Al día vs. vencida (real)" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={composicion} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {composicion.map((d) => (
                    <Cell key={d.nombre} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOP(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Préstamos de la cartera" subtitle="Datos en vivo" />
        <AsyncBoundary
          loading={loansQ.loading}
          error={loansQ.error}
          data={loans}
          onRetry={loansQ.reload}
          loadingLabel="Cargando préstamos..."
          empty={<EmptyState title="Sin préstamos" description="Usa 'Cargar datos demo' para poblar el tenant." />}
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
