# @prestamos/contracts

Contrato OpenAPI `/v1` de la plataforma de préstamos. Es la **fuente de verdad**
para el backend NestJS (controllers y DTOs) y para el cliente TypeScript del
frontend. Fase 1.1 del plan de tareas.

## Estructura

```text
openapi/
  openapi.yaml          # raíz: info, servers, security (Cognito JWT), tags, components
  schemas/_index.yaml   # entidades, enums, errores (Problem RFC 7807), paginación
  paths/
    _index.yaml         # mapa de rutas -> operaciones
    client.yaml         # portal del cliente (/me, loan-applications, loans, payments)
    admin.yaml          # backoffice (dashboard, customers, approve/reject, disburse, review)
    collector.yaml      # cobrador (cartera, recaudos, gestiones, asignaciones)
    infra.yaml          # webhooks de pago (firma) y health
redocly.yaml            # reglas de validación
```

## Scripts

```bash
npm install                 # instala redocly y openapi-typescript
npm run validate            # lint del contrato (redocly)
npm run bundle              # genera dist/openapi.bundled.yaml (un solo archivo)
npm run gen:types           # genera src/types.gen.ts para el frontend
```

> En PowerShell con políticas restringidas, ejecuta vía `cmd /c "npm ..."`.
> La validación se puede correr sin instalar: `npx @redocly/cli lint openapi/openapi.yaml`.

## Convenciones del contrato
- Dinero en COP como enteros (`Money`); nunca floating point.
- Fechas en UTC (date-time); presentación en America/Bogota.
- `Idempotency-Key` obligatoria al crear pagos y registrar recaudos.
- Pagos manuales nacen `PENDING_REVIEW`; solo impactan el ledger tras aprobarse.
- Webhooks de pago son públicos pero requieren firma; no marcan éxito por sí solos.
- Errores en formato `application/problem+json` (RFC 7807).
