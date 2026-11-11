/**
 * Datos de ejemplo para la maqueta de UI. Representan respuestas que en
 * producción provienen del backend NestJS. El frontend NO calcula reglas
 * financieras (amortización, mora, saldos): solo presenta valores recibidos.
 */
import type {
  AuditLog,
  Customer,
  Installment,
  LedgerEntry,
  Loan,
  LoanApplication,
  LoanDocument,
  Payment,
} from '@/types/domain';

export const kpis = {
  capitalDisponible: 48_500_000,
  capitalColocado: 312_750_000,
  capitalRecuperado: 128_400_000,
  interesesRecaudados: 21_300_000,
  interesesProyectados: 44_900_000,
  carteraPorCobrar: 229_650_000,
  carteraVencida: 37_820_000,
  recaudoMes: 52_140_000,
  prestamosActivos: 86,
  prestamosLiquidados: 41,
  prestamosEnMora: 19,
};

export const recaudoMensual = [
  { mes: 'May', recaudo: 38_200_000, vencido: 6_100_000 },
  { mes: 'Jun', recaudo: 41_500_000, vencido: 7_300_000 },
  { mes: 'Jul', recaudo: 44_800_000, vencido: 5_900_000 },
  { mes: 'Ago', recaudo: 47_100_000, vencido: 8_400_000 },
  { mes: 'Sep', recaudo: 49_600_000, vencido: 7_050_000 },
  { mes: 'Oct', recaudo: 52_140_000, vencido: 6_820_000 },
];

export const composicionCartera = [
  { nombre: 'Al día', valor: 191_830_000, color: '#039855' },
  { nombre: 'Vencida', valor: 37_820_000, color: '#d92d20' },
];

export const customers: Customer[] = [
  { id: 'c1', name: 'María Fernanda López', document: 'CC 1.012.345.678', email: 'maria.lopez@mail.com', phone: '+57 310 555 1201', status: 'ACTIVE', activeLoans: 2, punctuality: 0.97 },
  { id: 'c2', name: 'Carlos Andrés Ruiz', document: 'CC 79.845.112', email: 'carlos.ruiz@mail.com', phone: '+57 320 555 8842', status: 'ACTIVE', activeLoans: 1, punctuality: 0.81 },
  { id: 'c3', name: 'Luisa Gómez Peña', document: 'CC 52.233.991', email: 'luisa.gomez@mail.com', phone: '+57 315 555 3390', status: 'PENDING', activeLoans: 0, punctuality: 1 },
  { id: 'c4', name: 'Jorge Mendoza', document: 'CC 80.112.667', email: 'jorge.m@mail.com', phone: '+57 301 555 7712', status: 'ACTIVE', activeLoans: 1, punctuality: 0.62 },
  { id: 'c5', name: 'Diana Carolina Vargas', document: 'CC 1.098.223.114', email: 'diana.vargas@mail.com', phone: '+57 318 555 2043', status: 'BLOCKED', activeLoans: 1, punctuality: 0.44 },
];

export const applications: LoanApplication[] = [
  { id: 'a1', customerName: 'Luisa Gómez Peña', amount: 3_000_000, termMonths: 12, frequency: 'MONTHLY', purpose: 'Capital de trabajo', status: 'IN_REVIEW', submittedAt: '2026-11-09T14:20:00Z' },
  { id: 'a2', customerName: 'Carlos Andrés Ruiz', amount: 1_500_000, termMonths: 6, frequency: 'BIWEEKLY', status: 'SUBMITTED', submittedAt: '2026-11-10T09:05:00Z' },
  { id: 'a3', customerName: 'María Fernanda López', amount: 5_000_000, termMonths: 18, frequency: 'MONTHLY', purpose: 'Compra de equipo', status: 'APPROVED', submittedAt: '2026-11-05T16:40:00Z' },
  { id: 'a4', customerName: 'Jorge Mendoza', amount: 800_000, termMonths: 3, frequency: 'WEEKLY', status: 'REJECTED', submittedAt: '2026-11-04T11:15:00Z' },
];

export const loans: Loan[] = [
  { id: 'L-2041', customerName: 'María Fernanda López', principal: 5_000_000, outstanding: 3_120_000, rate: 0.022, frequency: 'MONTHLY', status: 'ACTIVE', nextDueDate: '2026-11-20T00:00:00Z', overdueDays: 0 },
  { id: 'L-2038', customerName: 'Carlos Andrés Ruiz', principal: 1_500_000, outstanding: 980_000, rate: 0.025, frequency: 'BIWEEKLY', status: 'ACTIVE', nextDueDate: '2026-11-15T00:00:00Z', overdueDays: 0 },
  { id: 'L-2015', customerName: 'Jorge Mendoza', principal: 800_000, outstanding: 640_000, rate: 0.03, frequency: 'WEEKLY', status: 'DEFAULTED', nextDueDate: '2026-11-03T00:00:00Z', overdueDays: 8 },
  { id: 'L-1998', customerName: 'Diana Carolina Vargas', principal: 2_200_000, outstanding: 1_760_000, rate: 0.028, frequency: 'MONTHLY', status: 'DEFAULTED', nextDueDate: '2026-10-28T00:00:00Z', overdueDays: 14 },
  { id: 'L-2050', customerName: 'Andrés Felipe Soto', principal: 3_500_000, outstanding: 3_500_000, rate: 0.024, frequency: 'MONTHLY', status: 'PENDING_DISBURSEMENT', nextDueDate: '2026-12-01T00:00:00Z', overdueDays: 0 },
];

export const installments: Installment[] = [
  { id: 'i1', number: 1, dueDate: '2026-09-20T00:00:00Z', principal: 260_000, interest: 110_000, fees: 0, total: 370_000, balance: 4_740_000, status: 'PAID', overdueDays: 0 },
  { id: 'i2', number: 2, dueDate: '2026-10-20T00:00:00Z', principal: 266_000, interest: 104_000, fees: 0, total: 370_000, balance: 4_474_000, status: 'PAID', overdueDays: 0 },
  { id: 'i3', number: 3, dueDate: '2026-11-20T00:00:00Z', principal: 272_000, interest: 98_000, fees: 0, total: 370_000, balance: 4_202_000, status: 'PENDING', overdueDays: 0 },
  { id: 'i4', number: 4, dueDate: '2026-12-20T00:00:00Z', principal: 278_000, interest: 92_000, fees: 0, total: 370_000, balance: 3_924_000, status: 'PENDING', overdueDays: 0 },
];

export const payments: Payment[] = [
  { id: 'p1', loanId: 'L-2041', amount: 370_000, channel: 'PSE', status: 'APPROVED', reference: 'WPI-88213', createdAt: '2026-10-20T15:12:00Z', registeredBy: 'Cliente (PSE)' },
  { id: 'p2', loanId: 'L-2038', amount: 245_000, channel: 'CASH', status: 'PENDING_REVIEW', reference: 'CAJA-0912', createdAt: '2026-11-10T10:02:00Z', registeredBy: 'Pedro Cobrador' },
  { id: 'p3', loanId: 'L-2015', amount: 160_000, channel: 'TRANSFER', status: 'PENDING_REVIEW', reference: 'TRF-55120', createdAt: '2026-11-09T18:44:00Z', registeredBy: 'Pedro Cobrador' },
  { id: 'p4', loanId: 'L-2041', amount: 370_000, channel: 'PSE', status: 'APPROVED', reference: 'WPI-88110', createdAt: '2026-09-20T12:30:00Z', registeredBy: 'Cliente (PSE)' },
];

/** Ledger inmutable del préstamo L-2041 (doble partida, con saldo acumulado). */
export const ledgerByLoan: Record<string, LedgerEntry[]> = {
  'L-2041': [
    { id: 'le1', loanId: 'L-2041', date: '2026-08-20T00:00:00Z', concept: 'Desembolso', account: 'CAPITAL', debit: 5_000_000, credit: 0, balance: 5_000_000 },
    { id: 'le2', loanId: 'L-2041', date: '2026-09-20T00:00:00Z', concept: 'Pago cuota 1 - capital', account: 'CAPITAL', debit: 0, credit: 260_000, balance: 4_740_000 },
    { id: 'le3', loanId: 'L-2041', date: '2026-09-20T00:00:00Z', concept: 'Pago cuota 1 - interés', account: 'INTERES', debit: 0, credit: 110_000, balance: 4_740_000 },
    { id: 'le4', loanId: 'L-2041', date: '2026-10-20T00:00:00Z', concept: 'Pago cuota 2 - capital', account: 'CAPITAL', debit: 0, credit: 266_000, balance: 4_474_000 },
    { id: 'le5', loanId: 'L-2041', date: '2026-10-20T00:00:00Z', concept: 'Pago cuota 2 - interés', account: 'INTERES', debit: 0, credit: 104_000, balance: 4_474_000 },
  ],
};

export const documentsByLoan: Record<string, LoanDocument[]> = {
  'L-2041': [
    { id: 'd1', loanId: 'L-2041', name: 'Contrato de mutuo.pdf', type: 'CONTRATO', createdAt: '2026-08-20T10:00:00Z' },
    { id: 'd2', loanId: 'L-2041', name: 'Pagaré.pdf', type: 'PAGARE', createdAt: '2026-08-20T10:05:00Z' },
    { id: 'd3', loanId: 'L-2041', name: 'Recibo cuota 1.pdf', type: 'RECIBO', createdAt: '2026-09-20T15:12:00Z' },
  ],
};

export const auditByLoan: Record<string, AuditLog[]> = {
  'L-2041': [
    { id: 'au1', entity: 'loan', entityId: 'L-2041', action: 'Solicitud aprobada', actor: 'Ana Prestamista', at: '2026-08-19T14:00:00Z', detail: 'Tasa 2,2% m.v.' },
    { id: 'au2', entity: 'loan', entityId: 'L-2041', action: 'Desembolso registrado', actor: 'Ana Prestamista', at: '2026-08-20T10:00:00Z', detail: 'Transferencia · ref TRF-9001' },
    { id: 'au3', entity: 'payment', entityId: 'p1', action: 'Pago aplicado al ledger', actor: 'Sistema (webhook)', at: '2026-10-20T15:12:00Z', detail: 'PSE · WPI-88213' },
  ],
};

// Cartera asignada al cobrador en sesión (filtrada en backend por tenant + collector).
export const collectorPortfolio = loans.filter((l) =>
  ['L-2015', 'L-1998', 'L-2038'].includes(l.id),
);

export const collectorKpis = {
  montoAsignado: 4_380_000,
  recaudoPeriodo: 1_240_000,
  cuotasVencidas: 5,
  compromisosPendientes: 3,
};

export const collectionActivities = [
  { id: 'ca1', loanId: 'L-1998', channel: 'CALL', result: 'Sin respuesta', notes: 'Reintentar en la tarde', date: '2026-11-10T13:10:00Z', promise: null },
  { id: 'ca2', loanId: 'L-2015', channel: 'VISIT', result: 'Promesa de pago', notes: 'Pagará el viernes', date: '2026-11-09T16:30:00Z', promise: '2026-11-14T00:00:00Z' },
  { id: 'ca3', loanId: 'L-2038', channel: 'MESSAGE', result: 'Contactado', notes: 'Enviado recordatorio WhatsApp', date: '2026-11-08T09:00:00Z', promise: null },
];
