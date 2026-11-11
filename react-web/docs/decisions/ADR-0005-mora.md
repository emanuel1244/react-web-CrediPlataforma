# ADR-0005: Regla y cálculo de mora

- Estado: Bloqueante
- Fecha: 2026-11-11
- Requisitos relacionados: 9

## Contexto
Se necesita definir cuándo una cuota entra en mora y si se aplican intereses/cargos de mora, que deben ser legales en Colombia.

## Decisión (propuesta)
Una cuota se considera vencida desde el día siguiente a su fecha de vencimiento si no está pagada completamente; la mora se calcula por cuota vencida. Un job diario identifica cuotas vencidas, actualiza métricas y genera eventos.

NO se aplican automáticamente intereses ni cargos de mora hasta definir y validar jurídicamente la fórmula y los límites.

## Alternativas consideradas
- Período de gracia configurable — posible a futuro; por ahora regla simple día+1.

## Consecuencias
- El cálculo de días de mora y la marcación de `OVERDUE` viven en el dominio/job, no en el frontend.
- No habilitar cargos de mora en la UI hasta tener fórmula aprobada.

## Pendiente / condiciones (BLOQUEA PRODUCCIÓN)
Validación legal de tasas/cargos de mora y su fórmula antes de habilitarlos.
