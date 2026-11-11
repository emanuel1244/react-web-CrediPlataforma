/**
 * Utilidades de formato. El dinero se maneja como enteros en la unidad mínima
 * (COP sin decimales) y solo se formatea para presentación. Nunca usar
 * floating point para cálculos financieros: eso lo hace el backend.
 */

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formatea un monto entero en COP (ej. 1500000 -> "$ 1.500.000"). */
export function formatCOP(amount: number): string {
  return COP.format(amount);
}

const DATE = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeZone: 'America/Bogota',
});

const DATETIME = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Formatea una fecha ISO (UTC) en zona America/Bogota. */
export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return DATETIME.format(new Date(iso));
}

/** Formatea un porcentaje con un decimal (ej. 0.942 -> "94,2%"). */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}
