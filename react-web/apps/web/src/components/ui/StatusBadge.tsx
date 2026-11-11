import { cn } from '@/lib/cn';
import { CheckCircle2, Clock, AlertTriangle, XCircle, CircleDot } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const tones: Record<Tone, string> = {
  success: 'bg-success-50 text-success-700 border-success-100',
  warning: 'bg-warning-50 text-warning-700 border-warning-100',
  danger: 'bg-danger-50 text-danger-700 border-danger-100',
  info: 'bg-brand-50 text-brand-700 border-brand-100',
  neutral: 'bg-ink-100 text-ink-600 border-ink-200',
};

const icons: Record<Tone, ReactNode> = {
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  danger: <XCircle className="h-3.5 w-3.5" />,
  info: <Clock className="h-3.5 w-3.5" />,
  neutral: <CircleDot className="h-3.5 w-3.5" />,
};

/**
 * Badge de estado. No depende solo del color: incluye icono y texto
 * (requisito de accesibilidad WCAG 2.1 AA).
 */
export function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {icons[tone]}
      {label}
    </span>
  );
}

// Mapeos de estado de dominio -> tono + etiqueta legible en español.
const STATUS_MAP: Record<string, { tone: Tone; label: string }> = {
  // Cliente
  PENDING: { tone: 'warning', label: 'Pendiente' },
  ACTIVE: { tone: 'success', label: 'Activo' },
  REJECTED: { tone: 'danger', label: 'Rechazado' },
  BLOCKED: { tone: 'danger', label: 'Bloqueado' },
  // Solicitud
  DRAFT: { tone: 'neutral', label: 'Borrador' },
  SUBMITTED: { tone: 'info', label: 'Enviada' },
  IN_REVIEW: { tone: 'warning', label: 'En revisión' },
  APPROVED: { tone: 'success', label: 'Aprobada' },
  CANCELLED: { tone: 'neutral', label: 'Cancelada' },
  // Préstamo
  PENDING_DISBURSEMENT: { tone: 'warning', label: 'Por desembolsar' },
  PAID_OFF: { tone: 'success', label: 'Liquidado' },
  DEFAULTED: { tone: 'danger', label: 'En mora' },
  // Cuota
  PARTIALLY_PAID: { tone: 'info', label: 'Pago parcial' },
  PAID: { tone: 'success', label: 'Pagada' },
  OVERDUE: { tone: 'danger', label: 'Vencida' },
  WAIVED: { tone: 'neutral', label: 'Condonada' },
  // Pago
  CREATED: { tone: 'neutral', label: 'Creado' },
  DECLINED: { tone: 'danger', label: 'Rechazado' },
  EXPIRED: { tone: 'neutral', label: 'Expirado' },
  REFUNDED: { tone: 'info', label: 'Reembolsado' },
  REVERSED: { tone: 'warning', label: 'Reversado' },
  PENDING_REVIEW: { tone: 'warning', label: 'En revisión' },
};

export function DomainStatus({ status }: { status: string }) {
  const entry = STATUS_MAP[status] ?? { tone: 'neutral' as Tone, label: status };
  return <StatusBadge tone={entry.tone} label={entry.label} />;
}
