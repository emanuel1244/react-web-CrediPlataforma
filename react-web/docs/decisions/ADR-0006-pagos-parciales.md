# ADR-0006: Pagos parciales y abonos anticipados

- Estado: Propuesta
- Fecha: 2026-11-11
- Requisitos relacionados: 6

## Contexto
No está confirmada la habilitación de pagos parciales/abonos anticipados ni el orden de aplicación (capital/interés) ni el efecto (reducir plazo vs. reducir cuota).

## Decisión (propuesta)
Permitir pago parcial y abono extraordinario solo con reglas claras de aplicación. Propuesta inicial: aplicar primero a interés corriente y luego a capital; el abono extraordinario reduce capital y se puede optar por recalcular plazo o cuota. El saldo se recalcula desde el ledger; no se modifican pagos históricos.

## Alternativas consideradas
- Aplicar primero a capital — favorece al cliente; menos común.
- No permitir abonos anticipados — más simple, peor experiencia.

## Consecuencias
- Reglas de aplicación en el dominio, con pruebas de recálculo.
- UI debe explicar el efecto del abono antes de confirmar.

## Pendiente / condiciones
Confirmar orden de aplicación y efecto (plazo vs. cuota) con el propietario antes de implementar.
