/**
 * Tipos de dominio compartidos en el frontend. Reflejan los estados y roles
 * definidos en el spec. En producción se generan desde OpenAPI (packages/contracts).
 */

export type Role =
  | 'PLATFORM_ADMIN'
  | 'LENDER_ADMIN'
  | 'LENDER_OPERATOR'
  | 'COLLECTION_AGENT'
  | 'CUSTOMER';

export type Portal = 'admin' | 'collector' | 'customer';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
}

export type CustomerStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'BLOCKED';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type LoanStatus =
  | 'PENDING_DISBURSEMENT'
  | 'ACTIVE'
  | 'PAID_OFF'
  | 'CANCELLED'
  | 'DEFAULTED';

export type InstallmentStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'WAIVED';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'REVERSED'
  | 'PENDING_REVIEW';

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL';

export interface Customer {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  activeLoans: number;
  punctuality: number; // 0..1
}

export interface LoanApplication {
  id: string;
  customerName: string;
  amount: number;
  termMonths: number;
  frequency: Frequency;
  purpose?: string;
  status: ApplicationStatus;
  submittedAt: string;
}

export interface Loan {
  id: string;
  customerName: string;
  principal: number;
  outstanding: number;
  rate: number; // mensual, 0..1
  frequency: Frequency;
  status: LoanStatus;
  nextDueDate: string;
  overdueDays: number;
}

export interface Installment {
  id: string;
  number: number;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  total: number;
  balance: number;
  status: InstallmentStatus;
  overdueDays: number;
}

export type PaymentChannel = 'PSE' | 'CARD' | 'CASH' | 'TRANSFER';

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  channel: PaymentChannel;
  status: PaymentStatus;
  reference: string;
  createdAt: string;
  registeredBy?: string;
}

/** Movimiento de ledger (inmutable). Doble partida: debit/credit por cuenta. */
export interface LedgerEntry {
  id: string;
  loanId: string;
  date: string;
  concept: string;
  account: 'CAPITAL' | 'INTERES' | 'MORA' | 'CARGOS' | 'CAJA';
  debit: number;
  credit: number;
  balance: number;
}

/** Registro de auditoría de una acción crítica. */
export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  actor: string;
  at: string;
  detail?: string;
}

export interface LoanDocument {
  id: string;
  loanId: string;
  name: string;
  type: 'CONTRATO' | 'PAGARE' | 'RECIBO' | 'SOPORTE' | 'ESTADO_CUENTA';
  createdAt: string;
}

export type ActivityChannel = 'CALL' | 'MESSAGE' | 'VISIT' | 'OTHER';

export interface CollectionActivity {
  id: string;
  loanId: string;
  installmentId?: string | null;
  channel: ActivityChannel;
  result: string;
  notes?: string | null;
  promiseDate?: string | null;
  nextActionAt?: string | null;
  createdAt: string;
  createdBy?: string;
}
