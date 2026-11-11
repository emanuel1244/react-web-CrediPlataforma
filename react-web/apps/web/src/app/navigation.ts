import {
  LayoutDashboard,
  Users,
  FileText,
  Landmark,
  Receipt,
  AlertTriangle,
  Wallet,
  BarChart3,
  Package,
  ShieldCheck,
  Briefcase,
  CalendarClock,
  HandCoins,
  PhoneCall,
  History,
  Home,
  CreditCard,
  FileSignature,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Portal } from '@/types/domain';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Navegación por rol, según la sección 7 del spec. */
export const NAVIGATION: Record<Portal, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/clientes', label: 'Clientes', icon: Users },
    { to: '/admin/solicitudes', label: 'Solicitudes', icon: FileText },
    { to: '/admin/prestamos', label: 'Préstamos', icon: Landmark },
    { to: '/admin/recaudos', label: 'Cuotas y recaudos', icon: Receipt },
    { to: '/admin/cobranza', label: 'Cartera vencida', icon: AlertTriangle },
    { to: '/admin/caja', label: 'Caja y movimientos', icon: Wallet },
    { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
    { to: '/admin/productos', label: 'Productos y tasas', icon: Package },
    { to: '/admin/auditoria', label: 'Configuración / auditoría', icon: ShieldCheck },
  ],
  collector: [
    { to: '/cobrador', label: 'Mi cartera', icon: Briefcase },
    { to: '/cobrador/cuotas', label: 'Cuotas', icon: CalendarClock },
    { to: '/cobrador/recaudos', label: 'Recaudos', icon: HandCoins },
    { to: '/cobrador/cobranza', label: 'Cobranza', icon: PhoneCall },
    { to: '/cobrador/compromisos', label: 'Compromisos', icon: CalendarClock },
    { to: '/cobrador/historial', label: 'Historial', icon: History },
  ],
  customer: [
    { to: '/cliente', label: 'Inicio', icon: Home },
    { to: '/cliente/solicitar', label: 'Solicitar préstamo', icon: FileText },
    { to: '/cliente/prestamos', label: 'Mis préstamos', icon: Landmark },
    { to: '/cliente/cuotas', label: 'Próximas cuotas', icon: CalendarClock },
    { to: '/cliente/pagar', label: 'Pagar', icon: CreditCard },
    { to: '/cliente/pagos', label: 'Historial de pagos', icon: History },
    { to: '/cliente/documentos', label: 'Documentos', icon: FileSignature },
    { to: '/cliente/perfil', label: 'Perfil y consentimientos', icon: UserCircle },
  ],
};

export const PORTAL_LABELS: Record<Portal, string> = {
  admin: 'Backoffice',
  collector: 'Cobrador',
  customer: 'Portal cliente',
};
