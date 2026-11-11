import { useState } from 'react';
import { Landmark, CreditCard, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatCOP } from '@/lib/format';

type Method = 'PSE' | 'CARD';

export function CustomerPay() {
  const [method, setMethod] = useState<Method>('PSE');
  const amount = 370_000;

  return (
    <>
      <PageHeader title="Pagar cuota" subtitle="Préstamo L-2041 · Cuota 3" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Método de pago" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMethod('PSE')}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                method === 'PSE' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
              )}
            >
              <Landmark className="h-6 w-6 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-ink-900">PSE</p>
                <p className="text-xs text-ink-500">Débito desde tu banco</p>
              </div>
            </button>
            <button
              onClick={() => setMethod('CARD')}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
                method === 'CARD' ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
              )}
            >
              <CreditCard className="h-6 w-6 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Tarjeta</p>
                <p className="text-xs text-ink-500">Crédito o débito</p>
              </div>
            </button>
          </div>

          {method === 'PSE' ? (
            <div className="mt-5">
              <label className="label">Banco</label>
              <select className="input">
                <option>Selecciona tu banco</option>
                <option>Bancolombia</option>
                <option>Davivienda</option>
                <option>Banco de Bogotá</option>
                <option>Nequi</option>
              </select>
              <p className="mt-2 text-xs text-ink-400">
                Serás redirigido a tu banco. El pago se confirma por webhook del proveedor, no por la redirección.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Número de tarjeta</label>
                <input className="input" placeholder="•••• •••• •••• ••••" inputMode="numeric" />
              </div>
              <div>
                <label className="label">Vencimiento</label>
                <input className="input" placeholder="MM/AA" />
              </div>
              <div>
                <label className="label">CVV</label>
                <input className="input" placeholder="•••" inputMode="numeric" />
              </div>
              <p className="col-span-2 text-xs text-ink-400">
                No almacenamos datos de tu tarjeta. El procesamiento usa tokenización del proveedor certificado.
              </p>
            </div>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Resumen" />
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Cuota</dt>
              <dd className="font-medium text-ink-900">{formatCOP(amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Cargos</dt>
              <dd className="font-medium text-ink-900">{formatCOP(0)}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="font-bold text-ink-900">{formatCOP(amount)}</dd>
            </div>
          </dl>
          <button className="btn-primary mt-5 w-full" disabled>
            Pagar {formatCOP(amount)}
          </button>
          <p className="mt-2 text-center text-xs text-ink-400">
            El pago online (PSE/tarjeta) requiere la integración de Wompi, pendiente de contrato/sandbox (ADR-0004).
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-400">
            <ShieldCheck className="h-3.5 w-3.5 text-success-600" />
            Pago seguro con cifrado
          </p>
        </Card>
      </div>
    </>
  );
}
