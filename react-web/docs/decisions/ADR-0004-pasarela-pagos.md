# ADR-0004: Proveedor de pagos (Wompi/PSE)

- Estado: Bloqueante
- Fecha: 2026-11-11
- Requisitos relacionados: 7

## Contexto
Se evalúa Wompi como primera integración para PSE y tarjetas, sujeto a onboarding, contrato, tarifas, sandbox y verificación de capacidades. PSE no equivale a débito automático.

## Decisión (propuesta)
Integrar Wompi detrás de una interfaz `PaymentProvider` desacoplada, de modo que se pueda cambiar a ePayco/PayU u otro sin tocar el dominio. El pago nunca se marca exitoso por redirección: se confirma por webhook firmado y/o consulta server-to-server, con idempotencia y conciliación diaria.

## Alternativas consideradas
- ePayco / PayU — válidas; la interfaz las mantiene intercambiables.
- Integración directa sin abstracción — acopla el dominio al proveedor; rechazada.

## Consecuencias
- Adapter Wompi en infraestructura; interfaz en `packages/application`.
- No asumir débitos recurrentes del proveedor.
- Webhooks con verificación de firma, deduplicación, SQS/DLQ y conciliación.

## Pendiente / condiciones (BLOQUEA PRODUCCIÓN)
Onboarding, contrato, tarifas, acceso sandbox y validación de capacidades reales del proveedor. Hasta entonces se usa el adapter en modo mock/sandbox.
