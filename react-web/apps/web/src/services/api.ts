/**
 * Capa de servicios del frontend conectada a la API real (/v1) desplegada en
 * AWS (API Gateway + Lambda + DynamoDB). Mantiene la misma interfaz que consumían
 * las páginas, por lo que no fue necesario tocar los componentes.
 *
 * Reglas de dominio aplicadas por el backend:
 * - Clientes: "eliminar" = soft-delete.
 * - Préstamos/ledger/pagos: no se editan ni borran; se corrigen con ajustes/reversos.
 * - Pagos manuales nacen PENDING_REVIEW; solo impactan el ledger al aprobarse.
 */
import { http, idempotencyKey, TENANT_ID } from '@/services/http';
import type {
  AuditLog,
  CollectionActivity,
  Customer,
  Installment,
  LedgerEntry,
  Loan,
  LoanApplication,
  LoanDocument,
  Payment,
  PaymentChannel,
} from '@/types/domain';

interface Page<T> {
  data: T[];
  meta: { total: number };
}

const T = encodeURIComponent(TENANT_ID);

// ---------------- Clientes ----------------
export const customerService = {
  async list(): Promise<Customer[]> {
    const res = await http.get<Page<Customer>>(`/v1/tenants/${T}/customers`);
    return res.data;
  },
  async update(id: string, patch: Partial<Customer>): Promise<Customer> {
    return http.patch<Customer>(`/v1/tenants/${T}/customers/${id}`, patch);
  },
  async softDelete(id: string): Promise<void> {
    await http.del(`/v1/tenants/${T}/customers/${id}`);
  },
  async setStatus(id: string, status: Customer['status']): Promise<Customer> {
    return http.patch<Customer>(`/v1/tenants/${T}/customers/${id}`, { status });
  },
};

// ---------------- Solicitudes ----------------
export const applicationService = {
  async list(): Promise<LoanApplication[]> {
    const res = await http.get<Page<LoanApplication>>(`/v1/tenants/${T}/loan-applications`);
    return res.data;
  },
  async decide(id: string, decision: 'APPROVED' | 'REJECTED'): Promise<LoanApplication> {
    if (decision === 'APPROVED') {
      const res = await http.post<{ application: LoanApplication }>(
        `/v1/tenants/${T}/loan-applications/${id}/approve`,
        { monthlyRate: 0.022 },
      );
      return res.application;
    }
    return http.post<LoanApplication>(`/v1/tenants/${T}/loan-applications/${id}/reject`, {
      reason: 'No cumple criterios',
    });
  },
};

// ---------------- Préstamos ----------------
export const loanService = {
  async list(): Promise<Loan[]> {
    const res = await http.get<Page<Loan>>(`/v1/tenants/${T}/loans`);
    return res.data;
  },
  async get(id: string): Promise<Loan> {
    return http.get<Loan>(`/v1/tenants/${T}/loans/${id}`);
  },
  async installments(loanId: string): Promise<Installment[]> {
    return http.get<Installment[]>(`/v1/tenants/${T}/loans/${loanId}/installments`);
  },
  async ledger(loanId: string): Promise<LedgerEntry[]> {
    return http.get<LedgerEntry[]>(`/v1/tenants/${T}/loans/${loanId}/ledger`);
  },
  async documents(_loanId: string): Promise<LoanDocument[]> {
    // Endpoint de documentos pendiente en el backend; se devuelve vacío por ahora.
    return [];
  },
  async auditTrail(loanId: string): Promise<AuditLog[]> {
    return http.get<AuditLog[]>(`/v1/tenants/${T}/loans/${loanId}/audit`);
  },
  async disburse(loanId: string, method: 'TRANSFER' | 'CASH', reference: string): Promise<Loan> {
    return http.post<Loan>(
      `/v1/tenants/${T}/loans/${loanId}/disburse`,
      { method, reference },
      { 'Idempotency-Key': idempotencyKey() },
    );
  },
  async adjust(loanId: string, concept: string, amount: number, reason: string): Promise<void> {
    await http.post(`/v1/tenants/${T}/loans/${loanId}/adjustments`, { concept, amount, reason });
  },
};

// ---------------- Pagos ----------------
export const paymentService = {
  async list(): Promise<Payment[]> {
    const res = await http.get<Page<Payment>>(`/v1/tenants/${T}/payments`);
    return res.data;
  },
  async registerManual(input: {
    loanId: string;
    amount: number;
    channel: Extract<PaymentChannel, 'CASH' | 'TRANSFER'>;
    reference: string;
    registeredBy: string;
  }): Promise<Payment> {
    return http.post<Payment>(
      `/v1/tenants/${T}/loans/${input.loanId}/payments/manual`,
      {
        amount: input.amount,
        channel: input.channel,
        reference: input.reference,
        registeredBy: input.registeredBy,
      },
      { 'Idempotency-Key': idempotencyKey() },
    );
  },
  async review(id: string, approve: boolean): Promise<Payment> {
    return http.post<Payment>(`/v1/tenants/${T}/payments/${id}/review`, { approve });
  },
};

// ---------------- Gestiones de cobranza ----------------
export const activityService = {
  async listByLoan(loanId: string): Promise<CollectionActivity[]> {
    return http.get<CollectionActivity[]>(`/v1/tenants/${T}/collection-activities/${loanId}`);
  },
  async create(input: {
    loanId: string;
    channel: CollectionActivity['channel'];
    result: string;
    notes?: string;
    promiseDate?: string;
    nextActionAt?: string;
  }): Promise<CollectionActivity> {
    return http.post<CollectionActivity>(`/v1/tenants/${T}/collection-activities`, input);
  },
};

// ---------------- Dashboard ----------------
export interface DashboardSummary {
  capitalColocado: number;
  capitalRecuperado: number;
  carteraPorCobrar: number;
  carteraVencida: number;
  prestamosActivos: number;
  prestamosLiquidados: number;
  prestamosEnMora: number;
}

export const dashboardService = {
  async summary(): Promise<DashboardSummary> {
    return http.get<DashboardSummary>(`/v1/admin/dashboard?tenantId=${T}`);
  },
  async seed(): Promise<void> {
    await http.post(`/v1/dev/seed`, { tenantId: TENANT_ID });
  },
};
