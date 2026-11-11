import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Placeholder } from '@/pages/Placeholder';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminCustomers } from '@/pages/admin/Customers';
import { AdminApplications } from '@/pages/admin/Applications';
import { AdminLoans } from '@/pages/admin/Loans';
import { AdminLoanDetail } from '@/pages/admin/LoanDetail';
import { AdminPayments } from '@/pages/admin/Payments';
import { CollectorPortfolio } from '@/pages/collector/Portfolio';
import { CollectorCollections } from '@/pages/collector/Collections';
import { CollectorCollect } from '@/pages/collector/Collect';
import { CustomerHome } from '@/pages/customer/Home';
import { CustomerPay } from '@/pages/customer/Pay';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },

      // Backoffice / prestamista
      { path: 'admin', element: <AdminDashboard /> },
      { path: 'admin/clientes', element: <AdminCustomers /> },
      { path: 'admin/solicitudes', element: <AdminApplications /> },
      { path: 'admin/prestamos', element: <AdminLoans /> },
      { path: 'admin/prestamos/:id', element: <AdminLoanDetail /> },
      { path: 'admin/recaudos', element: <AdminPayments /> },
      { path: 'admin/cobranza', element: <Placeholder title="Cartera vencida" /> },
      { path: 'admin/caja', element: <Placeholder title="Caja y movimientos" /> },
      { path: 'admin/reportes', element: <Placeholder title="Reportes" /> },
      { path: 'admin/productos', element: <Placeholder title="Productos y tasas" /> },
      { path: 'admin/auditoria', element: <Placeholder title="Configuración / auditoría" /> },

      // Cobrador
      { path: 'cobrador', element: <CollectorPortfolio /> },
      { path: 'cobrador/cuotas', element: <Placeholder title="Cuotas de mi cartera" /> },
      { path: 'cobrador/recaudos', element: <CollectorCollect /> },
      { path: 'cobrador/cobranza', element: <CollectorCollections /> },
      { path: 'cobrador/compromisos', element: <Placeholder title="Compromisos de pago" /> },
      { path: 'cobrador/historial', element: <Placeholder title="Historial de gestiones" /> },

      // Cliente
      { path: 'cliente', element: <CustomerHome /> },
      { path: 'cliente/solicitar', element: <Placeholder title="Solicitar préstamo" /> },
      { path: 'cliente/prestamos', element: <Placeholder title="Mis préstamos" /> },
      { path: 'cliente/cuotas', element: <Placeholder title="Próximas cuotas" /> },
      { path: 'cliente/pagar', element: <CustomerPay /> },
      { path: 'cliente/pagos', element: <Placeholder title="Historial de pagos" /> },
      { path: 'cliente/documentos', element: <Placeholder title="Documentos" /> },
      { path: 'cliente/perfil', element: <Placeholder title="Perfil y consentimientos" /> },

      { path: '*', element: <Placeholder title="Página no encontrada" /> },
    ],
  },
]);
