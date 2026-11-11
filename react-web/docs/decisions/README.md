# Architecture Decision Records (ADR)

Registro de decisiones arquitectónicas y de negocio de la plataforma de préstamos.
Cada decisión abierta del spec se documenta aquí en lugar de asumirse en silencio.

## Estados
- `Propuesta`: redactada, pendiente de aprobación del propietario.
- `Aceptada`: confirmada; guía la implementación.
- `Bloqueante`: una decisión legal/financiera/de pasarela sin la cual **no se pasa a producción**; mientras tanto se usa interfaz/mock.
- `Reemplazada`: sustituida por un ADR posterior.

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [0001](ADR-0001-multi-tenant.md) | Arquitectura multi-tenant por defecto | Aceptada |
| [0002](ADR-0002-amortizacion.md) | Método de amortización por producto | Propuesta |
| [0003](ADR-0003-quincenal.md) | Regla de calendario quincenal | Propuesta |
| [0004](ADR-0004-pasarela-pagos.md) | Proveedor de pagos (Wompi/PSE) | Bloqueante |
| [0005](ADR-0005-mora.md) | Regla y cálculo de mora | Bloqueante |
| [0006](ADR-0006-pagos-parciales.md) | Pagos parciales y abonos anticipados | Propuesta |
| [0007](ADR-0007-firma-electronica.md) | Firma electrónica y pagaré | Propuesta |
| [0008](ADR-0008-notificaciones-fcm.md) | Canal de notificaciones push (FCM) | Aceptada |
| [0009](ADR-0009-dynamodb-base-transaccional.md) | DynamoDB como base principal (reemplaza PostgreSQL) | Aceptada |

## Decisiones aún sin ADR dedicado (pendientes de información)
- Refinanciación: reglas, aprobación y recálculo.
- Reintentos de cobro automático (dependen del mandato del proveedor).
- Volumen inicial, presupuesto AWS, región definitiva, RPO/RTO.
- Proveedor de SMS y términos de uso de SES.

## Plantilla
Ver `_template.md`.
